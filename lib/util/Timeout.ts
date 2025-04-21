import { setTimeout as workerSetTimeout } from "worker-timers";
import * as jsEnv from "browser-or-node";

export function customSetTimeout(callback: () => void, ms: number): number | NodeJS.Timeout {
    if (jsEnv.isBrowser) {
        // setTimeout in browsers timeout for longer, when the tab is inactive due to throttling.
        // However, running timeout in web worker avoids an inactive tab throttling problem, because timeouts in web worker are not throttled.
        return workerSetTimeout(callback, ms);
    } else {
        // Other environments may not support web workers
        return setTimeout(callback, ms);
    }
}