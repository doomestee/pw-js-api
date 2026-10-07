import type { AtlasesResult } from "../types/atlases.js";
import { Endpoint } from "../util/Constants.js";
import PWApiClient from "./PWApiClient.js";

/**
 * This standalone class has all (static) functions related to the atlases (SEPARATE TO CATALOG).
 */
export default class PWAtlases {
    /**
     * This is the json including the data for aura toggle animations, fire, team colour, smileys and other sprites.
     */
    static getSpritesJSON() {
        return PWApiClient.request<AtlasesResult>(Endpoint.Client + "/atlases/sprites.json")
    }

    /**
     * This is the json including the data for blocks (including animations / morphs, action blocks, decorations).
     */
    static getBlocksJSON() {
        return PWApiClient.request<AtlasesResult>(Endpoint.Client + "/atlases/sprites.json")
    }

    /**
     * This is the spritesheet (image in arraybuffer) for aura toggle animations, fire, team colour, smileys and other sprites.
     */
    static getSpritesPNG() {
        return PWApiClient.request<ArrayBuffer>(Endpoint.Client + "/atlases/sprites.png")
    }

    /**
     * This is the spritesheet (image in arraybuffer) for blocks (including animations / morphs, action blocks, decorations).
     */
    static getBlocksPNG() {
        return PWApiClient.request<ArrayBuffer>(Endpoint.Client + "/atlases/blocks.png")
    }
}