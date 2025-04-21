import { customSetTimeout } from "./Timeout.js";

export default class Queue {
    private _queue: Array<{ priority: boolean; func(): void;}> = [];

    /**
     * Annoyingly settimeout returns timeout object in nodejs, number for anywhere else.
     */
    timeout: NodeJS.Timeout | null | number;
    tokenLimit: number;
    interval: number;

    tokens: number;
    lastReset: number;

    /**
     * 
     * @param tokenLimit How many tokens in an interval.
     * @param interval How long the bucket is valid for.
     */
    constructor(tokenLimit: number, interval: number) {
        this.tokenLimit = tokenLimit;
        this.interval = interval;

        this.lastReset = this.tokens = 0;
        this.timeout = null;
    }

    private check() : void {
        if (this.timeout !== null || this._queue.length === 0) return;

        if (this.lastReset + this.interval < Date.now()) {
            this.lastReset = Date.now();
            this.tokens = 0;
        }

        while (this._queue.length !== 0 && this.tokens < this.tokenLimit) {
            this.tokens++;
            
            const item = this._queue.shift();

            item!.func();
        }

        if (this._queue.length !== 0 && this.timeout === null) {
            this.timeout = customSetTimeout(() => {
                this.timeout = null;
                this.check();
            }, this.tokens < this.tokenLimit ? 1 : Math.max(0, this.lastReset + this.interval - Date.now()));
        }
    }

    /**
     * Add an item to the queue.
     * @param func The function to queue.
     * @param priority If true, the item will be added to the front of the queue.
     */
    queue(func: () => void, priority = false) {
        if (priority) this._queue.unshift({ func, priority });
        else this._queue.push({ func, priority });

        this.check();
    }
}