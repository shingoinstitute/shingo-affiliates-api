// tslint:disable-next-line:variable-name
export const RefineTag = Symbol('__RefineTag')
// tslint:disable-next-line:variable-name
export const RefineBaseTypeTag = Symbol('__RefineBaseType')
/**
 * Refined is essentially newtype
 * We create a new type that has the same runtime representation as its inner type,
 * however the inner type is not assignable to the new type.
 * This differs from newtype-ts in that a newtype is also assignable to its carrier type
 *
 * Example:
 * ```ts
 * type PositiveNumber = Refined<number, 'Positive'>
 * const x: PositiveNumber = 5  // will not work, since type of 5 is number
 * const y: PositiveNumber = unsafeCoerce<PositiveNumber>(5) // works, since we coerced 5 to type PositiveNumber
 * ```
 */
export type Refined<U, T> = U & {
  readonly [RefineTag]: T
  readonly [RefineBaseTypeTag]: U
}
// taken from gcanti/monocle-ts
export class Iso<S, A> {
  readonly _tag: 'Iso' = 'Iso'
  constructor(readonly get: (s: S) => A, readonly reverseGet: (a: A) => S) {}
}
export const wrap = <T, New extends Refined<T, any>>(v: T): New => v as any

export type Fn<As extends any[], R> = (...args: As) => R
export type Curried2<A, B, C> = (a: A) => (b: B) => C
export type Curried3<A, B, C, D> = (a: A) => (b: B) => (c: C) => D
export type Curried4<A, B, C, D, E> = (a: A) => (b: B) => (c: C) => (d: D) => E
export type Curried5<A, B, C, D, E, F> = (
  a: A,
) => (b: B) => (c: C) => (d: D) => (e: E) => F
export type Curried6<A, B, C, D, E, F, G> = (
  a: A,
) => (b: B) => (c: C) => (d: D) => (e: E) => (f: F) => G
export type Curried7<A, B, C, D, E, F, G, H> = (
  a: A,
) => (b: B) => (c: C) => (d: D) => (e: E) => (f: F) => (g: G) => H
export type Curried8<A, B, C, D, E, F, G, H, I> = (
  a: A,
) => (b: B) => (c: C) => (d: D) => (e: E) => (f: F) => (g: G) => (h: H) => I
export type Curried9<A, B, C, D, E, F, G, H, I, J> = (
  a: A,
) => (
  b: B,
) => (c: C) => (d: D) => (e: E) => (f: F) => (g: G) => (h: H) => (i: I) => J

/**
 * Unwrap a `Promise` to obtain its return value.
 * @see https://github.com/Microsoft/TypeScript/pull/21613
 * @see https://github.com/Microsoft/TypeScript/pull/21613#issuecomment-365774702
 */
export type Awaited<T> = {
  '1': T extends { then(onfulfilled: (value: infer U) => any): any }
    ? Awaited<U>
    : T
}[T extends number ? '1' : '1']

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
export type RefineBaseType<T, K> = T extends Refined<any, K>
  ? T[typeof RefineBaseTypeTag]
  : never
