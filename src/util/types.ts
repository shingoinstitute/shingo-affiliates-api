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

export type SB = '1' | '0'
export type If<P extends SB, T, F> = P extends '1' ? T : F
export type Or<A extends SB, B extends SB> = If<A, '1', If<B, '1', '0'>>
export type And<A extends SB, B extends SB> = If<A, If<B, '1', '0'>, '0'>
export type Not<A extends SB> = If<A, '0', '1'>

export type Matches<T, V> = V extends T ? '1' : '0'
export type Equal<T, V> = And<Matches<T, V>, Matches<V, T>>

export type KeysOfType<T, Type> = {
  [K in keyof T]-?: If<Equal<Type, T[K]>, K, never>
}[keyof T]
export type KeysOfType1<T, Type> = {
  [K in keyof T]-?: If<Matches<T[K], Type>, K, never>
}[keyof T]
export type KeysOfType2<T, Type> = {
  [K in keyof T]-?: If<Matches<Type, T[K]>, K, never>
}[keyof T]
export type OptionalKeys<T> = KeysOfType1<T, undefined>
export type NullKeys<T> = KeysOfType1<T, null>
export type MaybeKeys<T> = KeysOfType1<T, null | undefined>
export type MakeMaybe<T> = { [K in keyof T]+?: T[K] | null | undefined }
export type UndefinedToOptional<T> = Overwrite<
  T,
  { [k in OptionalKeys<T>]+?: T[k] }
>

export type OverwriteMaybe<A extends object, B extends object> = Overwrite<
  A,
  Pick<B, Exclude<keyof B, MaybeKeys<A>>> &
    MakeMaybe<Pick<B, keyof B & MaybeKeys<A>>>
>

export type RequireKeys<T, K extends keyof T> = Overwrite<
  T,
  { [key in K]-?: T[key] }
>

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export type ArrayValue<T> = T extends Array<infer A> ? A : never
export type PromiseValue<T> = T extends Promise<infer A> ? A : never
export type Mutable<T> = { -readonly [k in keyof T]: T[k] }