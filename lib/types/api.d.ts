/** @module Types/Api */
export interface APIFailure {
    code: number;
    message: string;
    data?: unknown
}

export interface AuthResultSuccess {
    record: AuthResultData;
    token: string;
}

// coulda been ColOwnPlayer but idk
export interface AuthResultData {
    banned: boolean;
    collectionId: string;
    collectionName: string;
    /**
     * Date.
     */
    created: string;
    email: string;
    emailVisibility: boolean;
    face: number;
    /**
     * List of user IDs.
     */
    friends: string[];
    id: string;
    isSuspicious: boolean;
    /**
     * Date.
     */
    lastSeen: string;
    lastWorld: string;
    lastWorldTitle: string;
    role: string;
    /**
     * Date.
     */
    updated: string;
    username: string;
    verified: boolean;
}

export interface JoinKeyResult {
    token: string;
}

export interface CollectionResult<T> {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    items: T[];
}

interface ColItem<T extends string = string> {
    collectionId: string;
    collectionName: T;
    /**
     * Date/time string, this can be converted into Date.
     */
    created: string;
    /**
     * Date/time string, this can be converted into Date.
     */
    updated: string;
    id: string;
}

export interface ColWorld extends ColItem<"worlds"> {
    description: string;
    height: number;
    id: string;
    /**
     * Typically always is 50.
     */
    maxPlayers: number;
    minimap: string;
    minimapEnabled: boolean;
    /**
     * Owner's user ID
     */
    owner: string;
    plays: number;
    title: string;
    /**
     * If the worlds are from getPublicWorlds, this will always be public.
     */
    visibility: "public" | "private" | "unlisted" | "friends";
    width: number;
    woots: number;
}

export interface ColUser extends ColItem<"users"> {
    face: number;
    role: "" | "admin" | "committee" | "dev" | "mod";
    /**
     * This will always be in upper case.
     */
    username: string;
}

export interface ColQuery<T extends ColItem> {
    /**
     * Reference: https://pocketbase.io/docs/api-collections/#list-collections
     * 
     * An object containing the filters, string value is for exact (iirc), boolean is for idk.
     * 
     * Can be passed as string, which will be treated as final, allows for more advanced filter rules as it skips parsing.
     */
    filter?: Partial<{ [K in keyof T]: string|boolean }> | string;
    
    //Record<string, string|boolean> | string;
    /**
     * Reference: https://pocketbase.io/docs/api-collections/#list-collections
     * 
     * If object, each property will have the value "ASC" or "DESC".
     * 
     * If array, it 
     * 
     * Can be passed as string, which will be treated as final, allows for more advanced filter rules as it skips parsing.
     */
    sort?: Partial<{ [K in keyof T]: "ASC"|"DESC" }> | (keyof T|[field: keyof T]|[field: keyof T, sortBy: "ASC"|"DESC"])[] | (keyof T)[]
    
    //Record<string, "ASC"|"DESC"> | ([field: string]|[field: string, sortBy: "ASC"|"DESC"])[] | string;
}

export interface LobbyResultWorldData {
    title: string,
    description: string,
    plays: number,
    minimapEnabled: boolean,
    type: number,
}

export interface LobbyResultWorld {
    id: number;
    players: number;
    max_players: number;
    data: LobbyResultWorldData;
}

export interface LobbyResult {
    onlineRoomCount: number;
    onlinePlayerCount: number;
    visibleRooms: LobbyResultWorld[];
}

export interface ListBlockResult {
    /**
     * Numeric
     */
    Id: number;
    /**
     * Useful for mapping, allows you to identify the block in case the numeric ID changes.
     * 
     * This is what they refer to as block name for some reason.
     * 
     * NOTE: There may still be an occasion where the block's name is changed, for eg due to a typo.
     */
    PaletteId: string;
    /**
     * 0 for Background, 1 for Foreground, 2 for Overlay.
     */
    Layer: number;
    /**
     * Unsigned 32 bit integer.
     * 
     * (If you need the hex string: use .toString(16) with 16 as the radix and trim off the leading FF. To convert it back to number, use parseInt(hexstring, 16))
     */
    MinimapColor?: number;
    /**
     * List of type of arg this block has.
     * 
     * For eg if it's a sign, it will be [0] where 0 indicates it's a String.
     */
    BlockDataArgs?: number[];
    /**
     * EELVL ID.
     */
    LegacyId?: number;
    /**
     * EELVL block arguments.
     * 
     * For example it can indicate block's rotation (for example for half blocks), indicate portal arguments, etc.
     */
    LegacyMorph?: number[];
}