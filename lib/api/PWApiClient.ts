import PWGameClient from "../game/PWGameClient.js";
import type { APIFailure, AuthResultSuccess, CollectionResult, ColUser, ColQuery, ColWorld, JoinKeyResult, ListBlockResult, LobbyResult, ApiClientOptions } from "../types/api.js";
import type { GameClientSettings, WorldJoinData } from "../types/game.js";
import { Endpoint } from "../util/Constants.js";
import { APIError } from "../util/Errors.js";
import { mergeObjects, queryToString } from "../util/Misc.js";

/**
 * Note if you want to join a world, use new PWGameClient() then run .init()
 */
export default class PWApiClient {
    /**
     * The account token, this is private to prevent tampering.
     */
    private token?: string;

    /**
     * Account details with email and password, if applicable.
     */
    private account = {
        email: "",
        password: ""
    }

    options: ApiClientOptions;

    loggedIn = false;

    /**
     * This will be undefined if getListBlocks() hasn't been run once.
     * 
     * (This is sorted by ID)
     */
    static listBlocks: ListBlockResult[] | undefined;
    /**
     * This will be undefined if getListBlocks() hasn't been run once.
     * 
     * NOTE: The keys are in UPPER_CASE form.
     */
    static listBlocksObj: Record<string, ListBlockResult> | undefined;

    /**
     * This will create an instance of the class, as you're using the token, it will automatically be marked as loggedIn.
     * @param token Must be a valid account token.
     */
    constructor(token: string, options?: ApiClientOptions);
    /**
     * This will create an instance of the class, as you're putting the account details, you must manually authenticate before invoking restricted calls including joinRoom.
     * If populating email and password, you must manually authenticate yourself.
     */
    constructor(email: string, password: string, options?: ApiClientOptions);
    constructor(email: string, password?: string | ApiClientOptions, options?: ApiClientOptions) {
        this.options = {
            endpoints: {
                Api: Endpoint.Api,
                GameHTTP: Endpoint.GameHTTP,
                GameWS: Endpoint.GameWS,
            }
        }

        if (typeof password === "object") {
            this.options = mergeObjects(this.options, password);
            password = undefined;
        } else if (options) this.options = mergeObjects(this.options, options);

        if (password === undefined) {
            this.token = email;
            this.loggedIn = true;
            return;
        }

        this.account.email = email;
        this.account.password = password;

        // this.token = token;
    }

    /**
     * Connects the API instance to the server.
     * This will enable the client to join the room, or access to restricted collections.
     */
    authenticate() : Promise<AuthResultSuccess | APIFailure>;
    /**
     * Overrides local account details, the parameters are not needed if PW Api was already created with email/password in the first place.
     * This is for those that used a token in the first place, the accounts won't be saved in the instance.
     */
    authenticate(email: string, password: string) : Promise<AuthResultSuccess | APIFailure>;
    authenticate(email?: string, password?: string) {
        if (email === undefined) {
            if (this.account.email.length === 0 || this.account.password.length === 0) throw Error("No email/password given.");

            email = this.account.email;
            password = this.account.password;
        }

        return this.request<AuthResultSuccess | APIFailure>(`${this.options.endpoints.Api}/api/collections/users/auth-with-password`,
            { identity: email, password }, undefined, this.options.endpoints.Api !== Endpoint.Api
        ).then(res => {
            if ("token" in res) {
                this.token = res.token;
                this.loggedIn = true;
            }

            return res;
        });//.then(console.log);
    }

    /**
     * Internal.
     */
    getJoinKey(roomType: string, roomId: string) {
        return this.request<JoinKeyResult>(`${this.options.endpoints.Api}/api/joinkey/${roomType}/${roomId}`, undefined, true, this.options.endpoints.Api !== Endpoint.Api);
    }

    /**
     * This route is available to take if you chose to create an API client to then join a world, in which case this returns the Game Client instance.
     * 
     * Make sure the API client is already authenticated before calling this.
     * 
     * The 3rd parameter is for if you wish to customise the reconnectability of the game client.
     */
    joinWorld(roomId: string, obj?: { joinData?: WorldJoinData, gameSettings?: Partial<GameClientSettings> }) {
        const game = new PWGameClient(this, obj?.gameSettings);

        return game.joinWorld(roomId, obj?.joinData);
    }
    
    /**
     * This will be an empty array if getRoomTypes has never been used successfully at least once.
     */
    static roomTypes:string[] = [];

    /**
     * @deprecated
     * 
     * This will be an empty array if getRoomTypes has never been used successfully at least once.
     */
    get roomTypes() {
        return PWApiClient.roomTypes;
    }

    /**
     * @deprecated This will be removed when the endpoint no longer exists. Use getVersion()
     * 
     * Non-authenticated. This will refresh the room types each time, so make sure to check if roomTypes is available.
     */
    getRoomTypes() {
        return PWApiClient.getRoomTypes(this.options.endpoints.GameHTTP);
    }

    /**
     * @deprecated This will be removed when the endpoint no longer exists. Use getVersion()
     * 
     * Non-authenticated. This will refresh the room types each time, so make sure to check if roomTypes is available.
     */
    static getRoomTypes(EndpointURL: string = Endpoint.GameHTTP) {
        return this.request<string[]>(`${EndpointURL}/listroomtypes`, undefined, undefined, EndpointURL !== Endpoint.GameHTTP)
            .then(res => {
                PWApiClient.roomTypes = res;

                return this.getListBlocks(true);
            })
            .then(() => {
                return PWApiClient.roomTypes;
            })
    }
    
    /**
     * This will be undefined if getVersion has never been used successfully at least once.
     * 
     * (The function is automatically called when joining a world for the first time)
     */
    static gameVersion?:string;
    
    /**
     * This will be undefined if getVersion has never been used successfully at least once.
     */
    get gameVersion() {
        return PWApiClient.gameVersion;
    }

    /**
     * Non-authenticated. This will refresh the room types each time, so make sure to check if roomTypes is available.
     * 
     * This will also atuomatically get all blocks.
     */
    getVersion() {
        return PWApiClient.getVersion(this.options.endpoints.GameHTTP);
    }

    /**
     * Non-authenticated. This will refresh the version each time, so make sure to check if roomTypes is available.
     * 
     * This will also atuomatically get all blocks.
     */
    static getVersion(EndpointURL: string = Endpoint.GameHTTP) {
        return this.request<{ version: string }>(`${EndpointURL}/version`, undefined, undefined, EndpointURL !== Endpoint.GameHTTP)
            .then(res => {
                if ("version" in res) {
                    PWApiClient.gameVersion = res.version;

                    return this.getListBlocks(true);
                }

                throw new APIError("Version is missing when trying to fetch current version.", "MISSING_VERSION");
            })
            .then(() => {
                return PWApiClient.gameVersion;
            })
    }

    /**
     * Non-authenticated. Returns the mappings from the game API.
     * 
     * Note: This library also exports "BlockNames" which is an enum containing the block names along with their respective id.
     * 
     * @deprecated Use getListBlocks()
     */
    getMappings() {
        return PWApiClient.getMappings();
    }

    /**
     * Non-authenticated. Returns the mappings from the game API.
     * 
     * Note: This library also exports "BlockNames" which is an enum containing the block names along with their respective id.
     * 
     * @deprecated Use getListBlocks()
     */
    static getMappings() {
        return this.request<Record<string, number>>(`${Endpoint.GameHTTP}/mappings`);
    }

    /**
     * Non-authenticated. Returns the mappings from the game API.
     * 
     * This will fetch for the first time if it hasn't been used, hence asynchronous. You can use listBlocks property if it exists and if you wish to avoid potentially using async.
     * After that, it will return a list or object if specified.
     * 
     * This is automatically invoked when getRoomTypes() is invoked to clear cache.
     * 
     * Note: This library also exports "BlockNames" which is an enum containing the block names along with their respective id.     * 
     */

    getListBlocks(skipCache: boolean | undefined, toObject: true) : Promise<Record<string, ListBlockResult>>;
    getListBlocks(skipCache?: boolean, toObject?: false) : Promise<ListBlockResult[]>;
    getListBlocks(skipCache = false, toObject?: boolean) {
        // Yes, this actually gets typescript compiler to stop moaning
        if (toObject) return PWApiClient.getListBlocks(skipCache, toObject, this.options.endpoints.GameHTTP);

        return PWApiClient.getListBlocks(skipCache, toObject, this.options.endpoints.GameHTTP);
    }

    /**
     * Non-authenticated. Returns the list blocks from the game API.
     * 
     * This will fetch for the first time if it hasn't been used, hence asynchronous. You can use listBlocks property if it exists and if you wish to avoid potentially using async.
     * After that, it will return a list or object if specified.
     * 
     * This is automatically invoked when getRoomTypes() is invoked to clear cache.
     * 
     * Note: This library also exports "BlockNames" which is an enum containing the block names along with their respective id.
     */
    static async getListBlocks(skipCache: boolean | undefined, toObject: true, EndpointURL?: string) : Promise<Record<string, ListBlockResult>>;
    static async getListBlocks(skipCache?: boolean, toObject?: false, EndpointURL?: string) : Promise<ListBlockResult[]>;
    static async getListBlocks(skipCache = false, toObject?: boolean, EndpointURL = Endpoint.GameHTTP) {
        if (!skipCache) {
            if (this.listBlocks !== undefined && !toObject) return this.listBlocks;
            if (this.listBlocksObj !== undefined && toObject) return this.listBlocksObj;
        }

        return this.request<ListBlockResult[]>(`${EndpointURL}/listblocks`, undefined, undefined, EndpointURL !== Endpoint.GameHTTP)
            .then(res => {
                const obj = {} as Record<string, ListBlockResult>;
                const arr = [] as Array<ListBlockResult>; // PW doesn't sort the returned endpoint data despite data structure means it's perfectly capable

                if (res.length === 0) throw new APIError("Received no blocks when trying to fetch latest blocks", "MISSING_BLOCKS");

                for (let i = 0, len = res.length; i < len; i++) {
                    obj[res[i].PaletteId.toUpperCase()] = res[i];
                    arr[res[i].Id] = res[i];
                }

                this.listBlocksObj = obj;
                this.listBlocks = arr;

                if (toObject) return obj;
                else return arr;
            })
    }
    
    /**
     * Returns the collection result of the query - your own worlds.
     * Default: page - 1, perPage - 10
     */
    getOwnedWorlds(page: number, perPage: number, query?: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getOwnedWorlds(query: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getOwnedWorlds(page: number | ColQuery<ColWorld> = 1, perPage: number = 10, query?: ColQuery<ColWorld>) {
        if (typeof page === "object") {
            query = page;
            page = 1;
        }

        return this.request<CollectionResult<ColWorld>>(`${this.options.endpoints.Api}/api/collections/worlds/records?page=${page}&perPage=${perPage}${queryToString(query)}`, undefined, true, this.options.endpoints.Api !== Endpoint.Api);
    }

    /**
     * Returns the collection result of the query - players.
     * Default: page - 1, perPage - 10
     */
    getPlayers(page: number, perPage: number, query?: ColQuery<ColUser>) : Promise<CollectionResult<ColUser>>;
    getPlayers(query: ColQuery<ColUser>) : Promise<CollectionResult<ColUser>>;
    getPlayers(page: number | ColQuery<ColUser> = 1, perPage: number = 10, query?: ColQuery<ColUser>) {
        if (typeof page === "object") {
            query = page;
            page = 1;
        }

        return PWApiClient.getPlayers(page, perPage, query, this.options.endpoints.Api);
    }

    /**
     * Returns the collection result of the query - players.
     * Default: page - 1, perPage - 10
     */
    static getPlayers(page?: number, perPage?: number, query?: ColQuery<ColUser>, EndpointURL?: string) : Promise<CollectionResult<ColUser>>;
    static getPlayers(query: ColQuery<ColUser>, EndpointURL?: string) : Promise<CollectionResult<ColUser>>;
    static getPlayers(page: number | ColQuery<ColUser> = 1, perPage: number | string = 10, query?: ColQuery<ColUser>, EndpointURL: string = Endpoint.Api) {
        if (typeof page === "object") {
            if (typeof perPage === "string") {
                EndpointURL = perPage;
                perPage = 10;
            }

            query = page;
            page = 1;
        }

        return this.request<CollectionResult<ColUser>>(`${EndpointURL}/api/collections/users/records?page=${page}&perPage=${perPage}${queryToString(query)}`, undefined, undefined, EndpointURL !== Endpoint.Api);
    }

    /**
     * Returns the collection result of the query - public worlds.
     * Default: page - 1, perPage - 10
     */
    getPublicWorlds(page: number, perPage: number, query?: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getPublicWorlds(query: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getPublicWorlds(page: number | ColQuery<ColWorld> = 1, perPage: number = 10, query?: ColQuery<ColWorld>) {
        if (typeof page === "object") {
            query = page;
            page = 1;
        }

        return PWApiClient.getPublicWorlds(page, perPage, query, this.options.endpoints.Api);
    }

    /**
     * Returns the collection result of the query - public worlds.
     * Default: page - 1, perPage - 10
     */
    static getPublicWorlds(page?: number, perPage?: number, query?: ColQuery<ColWorld>, EndpointURL?: string) : Promise<CollectionResult<ColWorld>>;
    static getPublicWorlds(query: ColQuery<ColWorld>, EndpointURL?: string) : Promise<CollectionResult<ColWorld>>;
    static getPublicWorlds(page: number | ColQuery<ColWorld> = 1, perPage: number | string = 10, query?: ColQuery<ColWorld>, EndpointURL: string = Endpoint.Api) {
        if (typeof page === "object") {
            if (typeof perPage === "string") {
                EndpointURL = perPage;
                perPage = 10;
            }

            query = page;
            page = 1;
        }

        return this.request<CollectionResult<ColWorld>>(`${EndpointURL}/api/collections/worlds/records?page=${page}&perPage=${perPage}${queryToString(query)}`, undefined, undefined, EndpointURL !== Endpoint.Api);
    }

    /**
     * Returns the collection result of the query - public worlds.
     * Default: page - 1, perPage - 10
     */
    getWootedWorlds(page: number, perPage: number, query?: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getWootedWorlds(query: ColQuery<ColWorld>) : Promise<CollectionResult<ColWorld>>;
    getWootedWorlds(page: number | ColQuery<ColWorld> = 1, perPage: number = 10, query?: ColQuery<ColWorld>) {
        if (typeof page === "object") {
            query = page;
            page = 1;
        }

        return PWApiClient.getWootedWorlds(page, perPage, query, this.options.endpoints.Api);
    }

    /**
     * NOTE: It will always return empty result if not authenticated.
     * 
     * Returns the collection result of the query - wooted worlds.
     * Default: page - 1, perPage - 10
     */
    static getWootedWorlds(page?: number, perPage?: number, query?: ColQuery<ColWorld>, EndpointURL?: string) : Promise<CollectionResult<ColWorld>>;
    static getWootedWorlds(query: ColQuery<ColWorld>, EndpointURL?: string) : Promise<CollectionResult<ColWorld>>;
    static getWootedWorlds(page: number | ColQuery<ColWorld> = 1, perPage: number | string = 10, query?: ColQuery<ColWorld>, EndpointURL: string = Endpoint.Api) {
        if (typeof page === "object") {
            if (typeof perPage === "string") {
                EndpointURL = perPage;
                perPage = 10;
            }

            query = page;
            page = 1;
        }

        return this.request<CollectionResult<ColWorld>>(`${EndpointURL}/api/collections/worlds/records?page=${page}&perPage=${perPage}${queryToString(query)}`, undefined, undefined, EndpointURL !== Endpoint.Api);
    }

    /**
     * Returns the lobby result.
     */
    getVisibleWorlds() {
        return PWApiClient.getVisibleWorlds(this.options.endpoints.GameHTTP);
    }

    /**
     * Returns the lobby result.
     */
    static getVisibleWorlds(EndpointURL: string = Endpoint.GameHTTP) {
        if (this.roomTypes.length === 0) throw Error("roomTypes is empty - use getRoomTypes first!");

        return this.request<LobbyResult>(`${EndpointURL}/room/list/${this.roomTypes[0]}`, undefined, undefined, EndpointURL !== Endpoint.GameHTTP)
    }

    /**
     * Returns the world, if it exists and is public.
     */
    getPublicWorld(id: string) : Promise<ColWorld | undefined> {
        return this.getPublicWorlds(1, 1, { filter: { id } })
            .then(res => res.items[0]);
    }

    /**
     * Returns the world, if it exists and is public.
     */
    static getPublicWorld(id: string) : Promise<ColWorld | undefined> {
        return this.getPublicWorlds(1, 1, { filter: { id } })
            .then(res => res.items[0]);
    }

    /**
     * Gets the raw minimap bytes, the format may differ depending on the environment (Bun, NodeJS, Browser etc).
     */
    getMinimap(world: ColWorld | { id: string, minimap: string }, toURL?: false) : Promise<ArrayBuffer>
    /**
     * Gives the URL pointing to the minimap image.
     */
    getMinimap(world: ColWorld | { id: string, minimap: string }, toURL: true) : string;
    getMinimap(world: ColWorld | { id: string, minimap: string }, toURL = false) : Promise<ArrayBuffer> | string {
        if (toURL) return `${this.options.endpoints.Api}/api/files/rhrbt6wqhc4s0cp/${world.id}/${world.minimap}`;

        return PWApiClient.getMinimap(world, toURL, this.options.endpoints.Api);
    }

    /**
     * Gets the raw minimap bytes, the format may differ depending on the environment (Bun, NodeJS, Browser etc).
     */
    static getMinimap(world: ColWorld | { id: string, minimap: string }, toURL?: false, EndpointURL?: string) : Promise<ArrayBuffer>
    /**
     * Gives the URL pointing to the minimap image.
     */
    static getMinimap(world: ColWorld | { id: string, minimap: string }, toURL: true, EndpointURL?: string) : string;
    static getMinimap(world: ColWorld | { id: string, minimap: string }, toURL = false, EndpointURL = Endpoint.Api) {
        if (toURL) return `${EndpointURL}/api/files/rhrbt6wqhc4s0cp/${world.id}/${world.minimap}`;

        return this.request<ArrayBuffer|APIFailure>(this.getMinimap(world, true, EndpointURL), undefined, undefined, EndpointURL !== Endpoint.Api)
            .then(res => {
                if ("message" in res) throw Error("Minimap doesn't exist, the world may be unlisted.");

                return res;
            });
    }

    /**
     * Note that username is cap sensitive, and may require you to use toUppercase
     */
    getPlayerByName(username: string) : Promise<ColUser | undefined> {
        return this.getPlayers(1, 1, { filter: { username } })
            .then(res => res.items[0]);
    }

    /**
     * Note that username is cap sensitive, and may require you to use toUppercase
     */
    static getPlayerByName(username: string) : Promise<ColUser | undefined> {
        return this.getPlayers(1, 1, { filter: { username } })
            .then(res => res.items[0]);
    }

    // This doesn't seem to work so I commented it out, not removing it as there might be an oversight idk
    // getMessageTypes() {
    //     return this.request<string[]>(`${Endpoint.GameHTTP}/message_types`)
    //         .then(res => res instanceof Uint8Array ? [] : res ?? []);
    // }

    /**
     * IMPORTANT: This will return JSON for any responses that have the content-type of json, anything else will be sent back as ArrayBuffer.
     * If you're expecting raw bytes, make sure the endpoint is guaranteed to give you that otherwise there isn't a reason.
     * 
     * This requires the manager to be authenticated, it will error if otherwise.
     * @param url Requires to be a full URL with endpoint unfortunately. It will throw error if it doesn't match any of the 2 HTTP endpoint URLs.
     * @param body If this is passed, the request will become a POST. (If you need to send a POST but has no data, just send an empty object).
     * @param token The API token (not join key), this is if you wish to use authenticated API calls without having to instantise an api client yourself.
     * @param overrideURL If true, this will skip checking if the URL truly belongs to PW (production wise).
     */
    static request<T>(url: string, body?: Record<string, any>|string, token?: string, overrideURL = false) : Promise<T> {
        if (!overrideURL && !(url.startsWith(Endpoint.Api) || url.startsWith(Endpoint.GameHTTP) || url.startsWith(Endpoint.Client + "/atlases/"))) throw Error("URL given does not have the correct endpoint URL, this is for safety.");

        const headers:Record<string, string> = {
            // "user-agent": "PW-TS-API/0.0.1"
        };

        if (typeof token === "string") headers["authorization"] = token;

        if (typeof body === "object") body = JSON.stringify(body);

        let method = "GET";

        if (typeof body !== "undefined") {
            headers["content-type"] = "application/json";
            method = "POST";
        }

        let status = 0;

        return fetch(url, {
            headers, method,
            body: body
        }).then(res => {
            if (res.status === 403) throw Error("Forbidden access - token invalid or unauthorised.");
            // else if (res.status !== 200) throw Error("")

            status = res.status;

            if (res.headers.get("content-type")?.startsWith("application/json")) return res.json() as T;
            else return res.arrayBuffer() as T;
        })
        .then(data => {
            if (status > 400) throw data;
            else return data;
        })
    }


    /**
     * IMPORTANT: This will return JSON for any responses that have the content-type of json, anything else will be sent back as Uint8array.
     * If you're expecting raw bytes, make sure the endpoint is guaranteed to give you that otherwise there isn't a reason.
     * 
     * This requires the manager to be authenticated, it will error if otherwise.
     * @param url Requires to be a full URL with endpoint unfortunately. It will throw error if it doesn't match any of the 2 HTTP endpoint URLs.
     * @param body If this is passed, the request will become a POST. (If you need to send a POST but has no data, just send an empty object).
     * @param isAuthenticated If true, this will send the token as the header.
     * @param overrideURL If true, this will skip checking if the URL truly belongs to PW (production wise).
     */
    protected request<T>(url: string, body?: Record<string, any>|string, isAuthenticated = false, overrideURL = false) : Promise<T> {
        return PWApiClient.request<T>(url, body, isAuthenticated ? this.token : undefined, overrideURL)
    }
}