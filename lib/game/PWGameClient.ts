import type PWApiClient from "../api/PWApiClient.js";
import { type Ping, type PlayerChatPacket, type WorldBlockFilledPacket, type WorldBlockPlacedPacket, WorldPacket, WorldPacketSchema } from "../gen/world_pb.js";
import type { GameClientSettings, WorldJoinData, Hook } from "../types/game.js"
import { Endpoint } from "../util/Constants.js";
import { AuthError } from "../util/Errors.js";

import { WebSocket } from "isows";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import type { CustomBotEvents, MergedEvents, WorldEvents } from "../types/events.js";
import Queue from "../util/Queue.js";
import type { OmitRecursively, Optional, Promisable } from "../types/misc.js";
import { isCustomPacket } from "../util/Misc.js";
import { customSetTimeout } from "../util/Timeout.js";

type SafeCheck<K extends keyof MergedEvents, State extends Partial<{ [K in keyof MergedEvents]: any }>> = State extends CustomBotEvents ? never : State[K];

export default class PWGameClient
        <
        StateT extends Partial<{ [K in keyof WorldEvents]: never }> = {}
        > {
    settings: GameClientSettings;

    api?: PWApiClient;
    socket?: WebSocket;

    private prevWorldId?: string;

    protected totalBucket = new Queue(100, 1000);
    protected chatBucket = new Queue(10, 1000);

    protected connectAttempts = {
        time: -1,
        count: 0,
    }

    /**
     * NOTE: After constructing, you must then run .init() to connect the API IF you're using email/password.
     */
    constructor(api: PWApiClient, settings?: Partial<GameClientSettings>);
    constructor(settings?: Partial<GameClientSettings>);
    constructor(api?: PWApiClient | Partial<GameClientSettings>, settings?: Partial<GameClientSettings>) {
        // I can't use instanceof cos of circular reference kms.
        if (api && "getJoinKey" in api) this.api = api;
        else if (api) {
            settings = api;
            api = undefined;
        }

        this.settings = {
            reconnectable: settings?.reconnectable ?? true,
            reconnectCount: settings?.reconnectCount ?? 5,
            reconnectInterval: settings?.reconnectInterval ?? 4000,
            reconnectTimeGap: settings?.reconnectTimeGap ?? 10000,
            handlePackets: settings?.handlePackets ?? ["PING"],
        };
    }

    get connected() {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    /**
     * This will connect to the world.
     * 
     * (This returns itself for chaining)
     */
    async joinWorld(roomId: string, joinData?: WorldJoinData) : Promise<this> {
        if (!this.api) throw Error("This can only work if you've used APIClient to join the world in the first place.");

        if (this.socket?.readyState === WebSocket.CONNECTING) throw Error("Already trying to connect.");
        // if (!this.api.loggedIn) throw Error("API isn't logged in, you must use authenticate first.");

        const roomType = this.api.roomTypes?.[0] ?? await this.api.getRoomTypes().then(rTypes => rTypes[0]);

        const joinReq = await this.api.getJoinKey(roomType, roomId);

        if (!("token" in joinReq) || joinReq.token.length === 0) throw Error("Unable to secure a join key - is account details valid?");

        const connectUrl = `${this.api?.options.endpoints.GameWS ?? Endpoint.GameWS}/ws?joinKey=${joinReq.token}`
            + (joinData === undefined ? "" : "&joinData=" + btoa(JSON.stringify(joinData)));

        this.prevWorldId = roomId;

        if ((this.connectAttempts.time + this.settings.reconnectTimeGap) < Date.now()) {
            this.connectAttempts = {
                time: Date.now(), count: 0
            };
        }

        return new Promise((res, rej) => {
            if (this.connectAttempts.count++ > this.settings.reconnectCount) return rej(new Error("Unable to connect due to many attempts."));

            const timer = setInterval(() => {
                if (this.connectAttempts.count++ > this.settings.reconnectCount) return rej(new Error("Unable to (re)connect."));
                this.invoke("debug", "Failed to reconnect, retrying.");

                this.socket = this.createSocket(connectUrl, timer as unknown as number, res, rej);
            }, this.settings.reconnectInterval ?? 4000);

            this.socket = this.createSocket(connectUrl, timer as unknown as number, res, rej);
        });
    }

    /**
     * INTERNAL
     */
    private createSocket(url: string, timer: number, res: (value: this) => void, rej: (reason: any) => void) {
        const socket = new WebSocket(url);
        socket.binaryType = "arraybuffer";

        // For res/rej.
        let init = false;

        socket.onmessage = (evt) => {
            const rawPacket = fromBinary(WorldPacketSchema, evt.data instanceof ArrayBuffer ? new Uint8Array(evt.data as ArrayBuffer) : evt.data);
            const { packet } = rawPacket;

            this.invoke("debug", "Received " + packet.case);

            this.invoke("raw", rawPacket);

            if (packet.case === undefined) {  
                return this.invoke("unknown", packet.value)
            } //this.callbacks.raw?.(packet);;

            let states = {} as Record<string, any>;// | undefined;

            if (this.hooks.length) {
                try {
                    states = {};

                    for (let i = 0, len = this.hooks.length; i < len; i++) {
                        const res = this.hooks[i](rawPacket);

                        if (typeof res === "object") {
                            const entries = Object.entries(res);
                            for (let j = 0, jen = entries.length; j < jen; j++) {
                                states[entries[j][0]] = entries[j][1];
                            }
                        }
                    }
                } catch (err) {
                    this.invoke("debug", "Unable to execute all hooks safely");

                    this.invoke("error", {
                        type: packet.case,
                        error: err
                    });

                    states = {};
                }
            }

            switch (packet.case) {
                case "playerInitPacket":
                    if (this.settings.handlePackets.findIndex(v => v === "INIT") !== -1)
                        this.send("playerInitReceived");

                    if (packet.value.playerProperties?.isWorldOwner) {
                        this.totalBucket.tokenLimit = 200;
                        this.chatBucket.tokenLimit = 10;
                    }
                    else {
                        this.totalBucket.tokenLimit = 125;
                        this.chatBucket.tokenLimit = 5;
                    }

                    if (!init) {
                        clearInterval(timer);
                        init = true; res(this);

                        // Give the client the init again as they might could have missed it even by a few milliseconds.
                        return customSetTimeout(() => {
                            // TODO: deduplicate this part.
                            if (this.hooks.length) {
                                try {
                                    states = {};
                
                                    for (let i = 0, len = this.hooks.length; i < len; i++) {
                                        const res = this.hooks[i](rawPacket);
                
                                        if (typeof res === "object") {
                                            const entries = Object.entries(res);
                                            for (let j = 0, jen = entries.length; j < jen; j++) {
                                                states[entries[j][0]] = entries[j][1];
                                            }
                                        }
                                    }
                                } catch (err) {
                                    this.invoke("debug", "Unable to execute all hooks safely");
                                    // TODO: separate event for error
                                    console.error(err);
                
                                    states = {};
                                }
                            }

                            this.invoke(packet.case, packet.value, states as any);
                        }, 1500);
                    }
                    break;
                case "ping":
                    if (this.settings.handlePackets.findIndex(v => v === "PING") !== -1)
                        this.send("ping", undefined, true);
                    break;
            }

            this.invoke(packet.case, packet.value, states as any);
        }

        socket.onopen = (evt) => {
            this.invoke("debug", "Connected successfully, waiting for init packet.");
        };

        socket.onclose = (evt) => {
            this.invoke("debug", `Server closed connection due to code ${evt.code}, reason: "${evt.reason}".`);

            if (!init) {
                clearInterval(timer);
                rej(new AuthError(evt.reason, (evt.code)));
            }

            if (this.settings.reconnectable) {
                if (this.api === undefined) return this.invoke("debug", "Not attempting to reconnect as this game client was created with a join token.");
                // if (evt.reason === "Failed to preload the world.") {
                //     return this.invoke("debug", "Not attempting to reconnect as the world don't exist.");
                // }

                if (this.prevWorldId) {
                    this.invoke("debug", "Attempting to reconnect.");

                    return this.joinWorld(this.prevWorldId).catch(err => {
                        this.invoke("debug", err);
                    });
                } else this.invoke("debug", "Warning: Socket closed, attempt to reconnect was made but no previous world id was kept.");
            }
        }

        return socket;
    }

    /**
     * This is a more direct route if you already have a join key acquired via Pixelwalker's API.
     * 
     * Useful for those wary of security.
     */
    static joinWorld(joinKey: string, obj?: { joinData?: WorldJoinData, gameSettings?: Partial<GameClientSettings> }, EndpointURL: string = Endpoint.GameWS) : Promise<PWGameClient> {
        const connectUrl = `${EndpointURL}/ws?joinKey=${joinKey}`
        + (obj?.joinData === undefined ? "" : "&joinData=" + btoa(JSON.stringify(obj.joinData)));

        const cli = new PWGameClient(obj?.gameSettings);
        
        if ((cli.connectAttempts.time + cli.settings.reconnectTimeGap) < Date.now()) {
            cli.connectAttempts = {
                time: Date.now(), count: 0
            };
        }

        return new Promise((res, rej) => {
            if (cli.connectAttempts.count++ > cli.settings.reconnectCount) return rej(new Error("Unable to connect due to many attempts."));

            const timer = setInterval(() => {
                cli.socket?.close();

                if (cli.connectAttempts.count++ > cli.settings.reconnectCount) return rej(new Error("Unable to (re)connect."));
                cli.invoke("debug", "Failed to reconnect, retrying.");

                cli.socket = cli.createSocket(connectUrl, timer as unknown as number, res, rej);
            }, cli.settings.reconnectInterval ?? 4000);

            cli.socket = cli.createSocket(connectUrl, timer as unknown as number, res, rej);
        });
    }

    // listen<Event extends keyof WorldEvents>(type: Event) {
    //     type === ""
    // }

    /**
     * For faster performance (even if it seems insignificant),
     * direct functions are used instead of events which are also inconsistent with browsers/nodejs etc.
     * 
     * NOTE: the "this" won't be the client itself. You will need to bind yourself if you want to keep this.
     */
    protected callbacks = {

    } as Partial<{ [K in keyof MergedEvents]: Array<(data: MergedEvents[K], states?: SafeCheck<K, StateT>) => Promisable<void | "STOP">> }>;

    // private hooks = {

    // } as Partial<{ [K in keyof P]: Array<(statey: P[K]) => Promisable<K>> }>

    /**
     * Poorly documented because I cba
     */
    private hooks:Array<(...args: any[]) => any> = [];

    /**
     * This is different to addCallback as all hooks (regardless of the type) will execute first before the callbacks, each hook may modify something or do something in the background
     * and may pass it to callbacks (via the second parameter in callbacks). If an error occurs while executing one of the hooks,
     * the hooks after that and the callbacks will not run.
     * 
     * NOTE: This is permanent, if a hook is added, it can't be removed.
     */
    addHook<HookState extends Pick<Partial<{ [K in keyof WorldEvents]: any }>, keyof WorldEvents>>(hook: Hook<HookState>) : PWGameClient<StateT & HookState> {
        // if (this.callbacks["raw"] === undefined) this.callbacks["raw"] = [];

        // this.hooks.oldChatMessagesPacket

        this.hooks.push(hook);

        // this.callbacks["raw"].unshift(hook);

        return this as unknown as PWGameClient<StateT & HookState>;
    }

    /**
     * Adds listeners to the end of the chain for that event type, it can even be a promise too.
     * 
     * If the callback returns a specific string "STOP", it will prevent further listeners from being invoked.
     */
    
    addCallback<Event extends keyof CustomBotEvents>(type: Event, ...cbs: Array<(data: MergedEvents[Event]) => Promisable<void | "STOP">>) : this
    addCallback<Event extends keyof WorldEvents>(type: Event, ...cbs: Array<(data: MergedEvents[Event], states?: SafeCheck<Event, StateT>) => Promisable<void | "STOP">>) : this
    addCallback<Event extends keyof MergedEvents>(type: Event, ...cbs: Array<(data: MergedEvents[Event], states?: SafeCheck<Event, StateT>) => Promisable<void | "STOP">>) : this {
        // this.callbacks[type] = cb;

        if (this.callbacks[type] === undefined) this.callbacks[type] = [];

        if (cbs.length === 0) return this;

        this.callbacks[type].push(...cbs);

        return this;
    }

    /**
     * Inserts listeners at the start of the chain for that event type, it can even be a promise too.
     * 
     * If the callback returns a specific string "STOP", it will prevent further listeners from being invoked.
     */
    
    prependCallback<Event extends keyof CustomBotEvents>(type: Event, ...cbs: Array<(data: MergedEvents[Event]) => Promisable<void | "STOP">>) : this
    prependCallback<Event extends keyof WorldEvents>(type: Event, ...cbs: Array<(data: MergedEvents[Event], states?: SafeCheck<Event, StateT>) => Promisable<void | "STOP">>) : this
    prependCallback<Event extends keyof MergedEvents>(type: Event, ...cbs: Array<(data: MergedEvents[Event], states?: SafeCheck<Event, StateT>) => Promisable<void | "STOP">>) : this {
        // this.callbacks[type] = cb;

        if (this.callbacks[type] === undefined) this.callbacks[type] = [];

        if (cbs.length === 0) return this;

        this.callbacks[type].unshift(...cbs);

        return this;
    }

    /**
     * @param type The type of the event
     * @param cb It can be the function itself (to remove that specific function). If undefined, it will remove ALL functions from that list, it will return undefined.
     */
    removeCallback<Event extends keyof MergedEvents>(type: Event, cb?: (data: MergedEvents[Event], states: SafeCheck<Event, StateT>) => Promisable<void | "STOP">) : undefined | ((data: MergedEvents[Event], states: SafeCheck<Event, StateT>) => Promisable<void | "STOP">) {
        const callbacks = this.callbacks[type];

        if (callbacks === undefined || cb === undefined) { callbacks?.splice(0); return; }
        else {
            for (let i = 0, len = callbacks.length; i < len; i++) {
                if (callbacks[i] === cb) {
                    return callbacks.splice(i, 1)[0];
                }
            }
        }

        return;
    }

    /**
     * INTERNAL. Invokes all functions of a callback type, unless one of them prohibits in transit.
     */
    protected async invoke<Event extends keyof CustomBotEvents>(type: Event, data: MergedEvents[Event]) : Promise<{ count: number, stopped: boolean }>
    protected async invoke<Event extends keyof WorldEvents>(type: Event, data: MergedEvents[Event], states: SafeCheck<Event, StateT>) : Promise<{ count: number, stopped: boolean }>
    protected async invoke<Event extends keyof MergedEvents>(type: Event, data: MergedEvents[Event], states?: SafeCheck<Event, StateT>) : Promise<{ count: number, stopped: boolean }> {
        const cbs = this.callbacks[type];
        
        let result = {
            count: 0, stopped: false
        };

        if (cbs === undefined || cbs.length === 0) {
            if (type === "error") {
                throw data.error;
            }

            return result;
        }

        for (let i = 0, len = cbs.length; i < len; i++) {
            // This is in try catch as sync functions erroring can't be caught even if await is used
            try {
                const res = await (isCustomPacket(type) ? cbs[i](data) : cbs[i](data, states));

                result.count++;

                if (typeof res === "object") {
                    const keys = Object.keys(res);

                    for (let j = 0, jen = keys.length; j < jen; j++) {
                        data[keys[j]] = res[keys[j]];
                    }
                }

                if (res === "STOP") {
                    result.stopped = true;

                    return result;
                }
            } catch (err) {
                if (type === "error") {
                    // How would we get here wtf
                    // Throwing back the original error preventing from this happening again. 
                    throw data.error;
                }

                this.invoke("error", {
                    type,
                    error: err
                });
            }
        }

        return result;
    }

    /**
     * This assumes that the connection 
     * 
     * @param type Type of the packet.
     * @param value Value of the packet to send along with, note that some properties are optional.
     * @param direct If it should skip queue.
     */
    send<Event extends keyof WorldEvents>(type: Event, value?: OmitRecursively<Sendable<Event, WorldEvents>, "$typeName"|"$unknown">, direct = false) {
        this.invoke("debug", "Sent " + type + " with " + (value === undefined ? "0" : Object.keys(value).length) + " parameters.");

        const send = () => this.socket?.send(
            toBinary(WorldPacketSchema, create(WorldPacketSchema, { packet: { case: type, value } as unknown as { case: "ping", value: Ping } }))
        );

        if (direct) return send();

        if (type === "playerChatPacket") this.chatBucket.queue(() => { send(); })
        else this.totalBucket.queue(() => { send(); })
    }

    /**
     * By default this will set the game client settings reconnectable to false.
     * 
     * If reconnect is true, an additionl parameter can be passed which is the amount of time to wait before it attempts to reconnect (DEFAULT: none)
     */
    disconnect(reconnect: number | boolean =false) {
        // Accept the possibility that people may try to 
        if (reconnect === true) this.settings.reconnectable = true;
        else this.settings.reconnectable = false;

        this.socket?.close();

        return this.socket?.readyState === WebSocket.CLOSED;
    }
}

// "WorldBlockFilledPacket" doesn't even bloody work, but I cba as this will make do since block place is the only thing matters.
type Sendable<E extends keyof WorldEvents, WE extends WorldEvents>
    = E extends "worldBlockPlacedPacket" ? Optional<WorldBlockPlacedPacket, "fields"> 
    : E extends "WorldBlockFilledPacket" ? Optional<WorldBlockFilledPacket, "fields">
    : E extends "playerChatPacket" ? Omit<PlayerChatPacket, "playerId"> : WE[E];