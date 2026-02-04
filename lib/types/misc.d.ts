/** @module Types/Misc */

/**
 * Can be a promise or not
 */
export type Promisable<T> = T | Promise<T>;

// Source: (i cba making a recursive omit for the 7th time)
// https://stackoverflow.com/a/54487392
type OmitDistributive<T, K extends PropertyKey> = T extends any ? (T extends object ? Id<OmitRecursively<T, K>> : T) : never;
type Id<T> = {} & { [P in keyof T] : T[P]} // Cosmetic use only makes the tooltips expad the type can be removed 
export type OmitRecursively<T, K extends PropertyKey> = Omit<
    { [P in keyof T]: OmitDistributive<T[P], K> },
    K
>

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Removes the additional parameters associated
 * with bufbuild's message.
 */
export type CleanProtoMessage<T extends object> = OmitRecursively<T, "$typeName"|"$unknown">;