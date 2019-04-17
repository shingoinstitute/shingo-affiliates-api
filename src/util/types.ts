export type Fn<As extends any[], R> = (...args: As) => R

export type Unzip<T extends any[]> = { [K in keyof T]: Array<T[K]> }

export interface NonEmptyArray<T> extends Array<T> {
  0: T
}

/**
 * Use only if the built-in Parameters<T> is giving error `Type ... is not assignable to ...`
 */
export type Arguments<T> = T extends (...args: infer A) => any ? A : never
/**
 * Use only if the built-in ReturnType<T> is giving error `Type ... is not assignable to ...`
 */
export type RetType<T> = T extends (...args: any[]) => infer R ? R : never

export type Lazy<T> = () => T
export type Overwrite<A, B> = Pick<A, Exclude<keyof A, keyof B>> & B

/** string booleans for use in recursive types */
export type SB = '1' | '0'
/** type-level if statement */
export type If<P extends SB, T, F> = P extends '1' ? T : F
/** type-level or */
export type Or<A extends SB, B extends SB> = If<A, '1', If<B, '1', '0'>>
/** type-level and */
export type And<A extends SB, B extends SB> = If<A, If<B, '1', '0'>, '0'>
/** type-level not */
export type Not<A extends SB> = If<A, '0', '1'>

/** Determines if two types are assignable (the type V is a subset of T) */
export type Matches<T, V> = V extends T ? '1' : '0'
/** Determines if two types are exactly equal */
export type Equal<T, V> = And<Matches<T, V>, Matches<V, T>>

/** Keys of an object whose values have a type which is exactly equal to the given type */
export type KeysOfType<T, Type> = {
  [K in keyof T]-?: If<Equal<Type, T[K]>, K, never>
}[keyof T]
/** Keys of an object whose values have a type which is a superset of the given type */
export type KeysOfType1<T, Type> = {
  [K in keyof T]-?: If<Matches<T[K], Type>, K, never>
}[keyof T]
/** Keys of an object whose values have a type which is a subset of the given type */
export type KeysOfType2<T, Type> = {
  [K in keyof T]-?: If<Matches<Type, T[K]>, K, never>
}[keyof T]
/** Keys of an object whose values can be undefined */
export type OptionalKeys<T> = KeysOfType1<T, undefined>
/** Keys of an object whose values can be null */
export type NullKeys<T> = KeysOfType1<T, null>
/** Keys of an object whose values can be null or undefined */
export type MaybeKeys<T> = KeysOfType1<T, null | undefined>
/** Returns a new type where all values are optional */
export type MakeMaybe<T> = { [K in keyof T]+?: T[K] | null | undefined }
/** Makes all undefined keys also optional */
export type UndefinedToOptional<T> = Overwrite<
  T,
  { [k in OptionalKeys<T>]+?: T[k] }
>

/** Replaces all Maybe (null | undefined) value types with the given object */
export type OverwriteMaybe<A extends object, B extends object> = Overwrite<
  A,
  Pick<B, Exclude<keyof B, MaybeKeys<A>>> &
    MakeMaybe<Pick<B, keyof B & MaybeKeys<A>>>
>

/** Makes a new object having the given keys as not optional */
export type RequireKeys<T, K extends keyof T> = Overwrite<
  T,
  { [key in K]-?: T[key] }
>

/**
 * Omits all keys K from the object T
 * Example
 * ```ts
 * Omit<{ x: string, z: string, y: number }, 'x' | 'z'> // { y: number }
 * ```
 */
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

/** Gets the inner value of an array */
export type ArrayValue<T> = T extends Array<infer A> ? A : never
/** Gets the inner value of a promise */
export type PromiseValue<T> = T extends Promise<infer A> ? A : never
/** Makes a readonly object mutable */
export type Mutable<T> = { -readonly [k in keyof T]: T[k] }
