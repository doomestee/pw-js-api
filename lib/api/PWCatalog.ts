import { CatalogAPIResultAura, CatalogAPIResultBlock, CatalogAPIResultSmiley, CataloggedBlock } from "../types/catalog.js";
import { Endpoint } from "../util/Constants.js";
import { APIError } from "../util/Errors.js";
import PWApiClient from "./PWApiClient.js";

/**
 * This standalone class has all (static) functions related to the catalog (SEPARATE TO ATLASES).
 */
export default class PWCatalog {
    static getAuras() {
        return PWApiClient.request<CatalogAPIResultAura>(Endpoint.Client + "/catalog/auras.json");
    }
    
    static getSmileys() {
        return PWApiClient.request<CatalogAPIResultSmiley>(Endpoint.Client + "/catalog/smileys.json");
    }

    /**
     * NOTE: This will also replenish the internal blocks cache of this static class (if the versions don't match).
     * 
     * This is automatically invoked upon first time joining the game, for now.
     */
    static getBlocks(skipCache: boolean | undefined, toObject: true) : Promise<Record<string, CataloggedBlock>>;
    static getBlocks(skipCache?: boolean, toObject?: false) : Promise<CataloggedBlock[]>;
    static getBlocks(skipCache = false, toObject?: boolean) {
        return PWApiClient.request<CatalogAPIResultBlock>(Endpoint.Client + "/catalog/blocks.json")
            .then(r => {
                if (r.version === this.blockVersion && !skipCache) {
                    if (this.blocks !== undefined && !toObject) return this.blocks;
                    if (this.blocksObj !== undefined && toObject) return this.blocksObj;
                }

                const obj = {} as Record<string, CataloggedBlock>;
                const arr = [] as Array<CataloggedBlock>; // PW doesn't sort the returned endpoint data

                const packages = r.packages;

                if (packages.length === 0) throw new APIError("Received no blocks when trying to fetch latest blocks", "MISSING_BLOCKS");

                for (let i = 0, len = packages.length; i < len; i++) {
                    const pack = packages[i].blocks.map(s => "blocks" in s ? s.blocks : s).flat();

                    for (let p = 0, pen = pack.length; p < pen; p++) {
                        const b = pack[p];

                        obj[b.paletteId.toUpperCase()] = b;
                        arr[b.id] = b;
                    }
                }

                this.blocksObj = obj;
                this.blocks = arr;

                if (toObject) return obj;
                else return arr;
            });
    }

    /**
     * This will be undefined if getBlocks() hasn't been run once.
     */
    static blocks: CataloggedBlock[] | undefined;
    /**
     * This will be undefined if getBlocks() hasn't been run once.
     * 
     * NOTE: The keys are in UPPER_CASE form.
     */
    static blocksObj: Record<string, CataloggedBlock> | undefined;

    /**
     * This will be undefined if getBlocks() hasn't been run once.
     * 
     * This is deliberately public so you can manually reset the internal cache if needed.
     */
    static blockVersion: number | undefined;
}