/** @module Types/Catalog */

export interface BaseCatalogAPIResult {
    version: number;
}

// type BaseCatalogAPIResult <K extends string, R> = {
//     version: number;
//     [P in K]: R;
// }

// type CatalogAPIResultBlock = BaseCatalogAPIResult<"packages", CataloggedBlockPackage>;
// type CatalogAPIResultSmiley = BaseCatalogAPIResult<"smileys", CataloggedSmiley>;
// type CatalogAPIResultAura = BaseCatalogAPIResult<"auras", CataloggedAura>;

export interface CatalogAPIResultBlock extends BaseCatalogAPIResult {
    packages: CataloggedBlockPackage[];
}

export interface CatalogAPIResultSmiley extends BaseCatalogAPIResult {
    smileys: CataloggedSmiley[];
}

export interface CatalogAPIResultAura extends BaseCatalogAPIResult {
    auras: CataloggedAura[];
}

//#region Block

export interface CataloggedBlockPackage {
    name: string; // examples: "Coins", "Boost", "Gravity", "Bricks", "Normal"
    /**
     * Some packages appear to have nested blocks...?
     */
    blocks: (CataloggedBlock | CataloggedNestedBlock)[];
}

export interface CataloggedNestedBlock {
    /**
     * ??? no idea
     */
    featuredIndex?: number;

    /**
     * ??? if the block can be cycled upon click?
     */
    canCycle?: boolean;
    
    /**
     * ??? no idea
     */
    wrapAfter?: number;

    blocks: CataloggedBlock[];
}

export interface CataloggedBlock {
    /**
     * Numeric
     */
    id: number;
    name: string;
    /**
     * Useful for mapping, allows you to identify the block in case the numeric ID changes.
     * 
     * This is what they refer to as block name for some reason.
     * 
     * NOTE: There may still be an occasion where the block's name is changed, for eg due to a typo.
     */
    paletteId: string;
    sprite: string;
    /**
     * Layer of the block, no longer numeric for some reason.
     */
    layer: "foreground" | "background" | "overlay";
    /**
     * The tab/category this block goes to, for example: "action" | "decorations" | "backgrounds" | "blocks".
     */
    tab: string;
    collision?: string
    shadow?: boolean;
    /**
     * Unsigned 32 bit integer.
     * 
     * (If you need the hex string: use .toString(16) with 16 as the radix and trim off the leading FF. To convert it back to number, use parseInt(hexstring, 16))
     */
    minimapColor?: number;
    /**
     * Maps to block(s) in EE that might be identical, its value will either be null or a list of argument types.
     * 
     * NOTE: The object will be empty if there isnt a corresponding block, it will not be undefined still.
     */
    legacyMorphs?: { [blockId: number]: null | number[] };

    // Lots of inference lets gooo

    /**
     * The direction this gravity block points to.
     * 
     * If undefined, is obviously not a gravity block.
     */
    gravity?: "left" | "right" | "down" | "up" | "none";

    /**
     * Appears to be for gravity dots.
     * 
     * Possibly means the movement is delayed?
     */
    delayed?: boolean;

    /**
     * If the block is climbable (and has climbing physics),
     * such as slow dots or ladders etc.
     */
    climbable?: boolean;

    /**
     * ??? string ID?
     */
    animationHandler?: string

    /**
     * ??? If block renders on top of players?
     */
    abovePlayers?: boolean;

    /**
     * ??? string ID that indicates which block data this block should get?
     * For example, "DeathDoorGateBlockData" for all death door/gates.
     */
    blockData?: string;

    /**
     * ??? animation object, note that some blocks with animation may not have animationHandler.
     */
    animation?: BlockAnimation;

    /**
     * If this block emits light.
     */
    light?: BlockLight
    
    /**
     * The type of particle this block may emit, such as "fireworks", "hazardFire" or "torch".
     */
    particleEmitter?: string

    /**
     * ??? has special overrides for minimap?
     */
    minimapCustom?: boolean;

    /**
     * If this block is numbered (for e.g, coin doors)
     */
    number?: BlockNumber;

    /**
     * ??? no idea
     */
    displayFrame?: number;

    /**
     * ??? no idea
     */
    shadowFrameThreshold?: number;

    /**
     * If the block is a sign block (also applies to outer space signs etc)
     */
    sign?: boolean;

    /**
     * ???
     */
    emissive?: BlockEmissive

    /**
     * ??? if this block kills immediately upon contact (liquid lava don't seem to count)
     */
    hazard?: boolean;

    /**
     * ??? If this block has a custom colour.
     */
    customColor?: string;

    /**
     * ??? Causes the sprite of the block to face towards that direction.?
     */
    facing?: string;

    /**
     * If the block is slippery.
     */
    slippery?: boolean
}

export interface BlockLight {
    color: number
    radius: number
    intensity: number
    flickerSpeed?: number
    flickerAmplitude?: number
}

export interface BlockEmissive {
    strength: number
    color?: number
    intensity?: number
}

export interface BlockAnimation {
    frames: number
    frameTime: number
    stagger: number
}

export interface BlockBoost {
    x: number
    y: number
}

export interface BlockNumber {
    shadow: boolean
}

//#endregion

//#region Smiley

export interface CataloggedSmiley {
    /**
     * Unique ID of the smiley.
     */
    id: string;
    /**
     * Name of the smiley.
     */
    name: string;
    /**
     * Description of the smiley.
     */
    description: string;
    /**
     * Sprite/Atlas ID of this smiley.
     */
    spriteName: string;

    /**
     * ??? The ID of the asset..?
     */
    ownedItemId?: string;

    /**
     * If the smiley can be bought.
     */
    shop?: SmileyShopInfo;

    /**
     * If this smiley has minimap colour override.
     */
    minimapColor?: number;
    
    /**
     * The sequential order of magic to get this smiley (via magic coins).
     */
    magicOrder?: number;

    /**
     * If this smiley can only be used by people with one of the role(s).
     * 
     * Examples: Superman with "dev"/"mod"/"admin".
     */
    ownedRoles?: string[];
}

export interface SmileyShopInfo {
    energyCost: number;
    energyPerClick: number;
    isNew?: boolean;
}

//#endregion

//#region Aura

export interface CataloggedAura {
    /**
     * Unique ID of the aura.
     */
    id: string
    /**
     * Name of the aura.
     */
    name: string
    /**
     * Description of the aura.
     */
    description: string
    /**
     * Sprite/Atlas ID of this smiley.
     */
    spriteName: string
    /**
     * How many frames this aura has.
     * If it's more than 1, frameSpeed will be defined.
     */
    frameCount: number;
    /**
     * The speed (decimal) at which the frame changes.
     * May show up if frameCount is more than 1.
     */
    frameSpeed?: number;

    /**
     * ??? If this disables the minimap colour or something.
     */
    colorsDisabled?: boolean

    /**
     * ??? The ID of the asset..?
     */
    ownedItemId?: string;

    /**
     * If the smiley can be bought.
     */
    shop?: SmileyShopInfo;
    
    /**
     * The sequential order of magic to get this smiley (via magic coins).
     */
    magicOrder?: number;
}

//#endregion