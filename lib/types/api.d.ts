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
     * List of fields associated with this block.
     * For example, a sign will have a Text field.
     */
    Fields: AnyBlockField[];
    /**
     * Unsigned 32 bit integer.
     * 
     * (If you need the hex string: use .toString(16) with 16 as the radix and trim off the leading FF. To convert it back to number, use parseInt(hexstring, 16))
     */
    MinimapColor?: number;
    /**
     * EELVL ID.
     */
    LegacyId?: number;
    /**
     * Maps to a block in EE that might be identical, its value will either be null or a list of argument types.
     */
    LegacyMorph?: { [blockId: number]: null | number[] }[];
}

export interface BlockField<T extends string = string> {
    /**
     * Name of the field, used for identifying the field.
     */
    Name: string;
    /**
     * Type of the field.
     */
    Type: T;
    /**
     * Description describing what this field is for.
     */
    Description: string;
    /**
     * Whether if this field is required.
     */
    Required: boolean
}

export interface TextBlockField extends BlockField<"String"> {
    /**
     * May not be included, if so, this will be a regex string which validates the input.
     */
    Pattern?: string;
}

export interface NumberBlockField extends BlockField<"Int32" | "UInt32"> {
    /**
     * The minimum possible value for this field.
     */
    MinValue: number;
    /**
     * The maximum possible value for this field.
     */
    MaxValue: number;
    /**
     * The default value set for this number field.
     */
    DefaultValue: number;

    /**
     * May not be included, if so, this will be a list of numbers whose values cannot be given for this field.
     */
    ExcludedValues?: number[]
}

export interface BoolBlockField extends BlockField<"Boolean"> {
    /**
     * The default value set for this boolean field.
     */
    DefaultValue: boolean;
}

/**
 * Block field special for Note blocks.
 */
export interface NoteBlockField extends BlockField<"DrumNote[]" | "PianoNote[]" | "GuitarNote[]"> {
    /**
     * Usually 1
     */
    MinLength: number;
    /**
     * Usually 6
     */
    MaxLength: number;
}

export type AnyBlockField = BlockField | TextBlockField | NumberBlockField | BoolBlockField | NoteBlockField;


export interface ApiClientOptions {
    /**
     * This includes the http(s):// part.
     * 
     * Can be changed for development environment.
     */
    endpoints: Partial<{
        Api?: string,
        GameHTTP?: string,
        GameWS?: string
    }>
}