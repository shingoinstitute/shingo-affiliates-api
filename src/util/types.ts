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

export type KeysOfType<T, Type> = {
  [K in keyof T]-?: Type extends T[K] ? K : never
}[keyof T]
export type OptionalKeys<T> = KeysOfType<T, undefined>
export type NullKeys<T> = KeysOfType<T, null>
export type MaybeKeys<T> = KeysOfType<T, null | undefined>
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
