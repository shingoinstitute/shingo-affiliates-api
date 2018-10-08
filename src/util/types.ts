export type Function1<A, B> = (a: A) => B
export type Function2<A, B, C> = (a: A, b: B) => C
export type Function3<A, B, C, D> = (a: A, b: B, c: C) => D
export type Function4<A, B, C, D, E> = (a: A, b: B, c: C, d: D) => E
export type Function5<A, B, C, D, E, F> = (a: A, b: B, c: C, d: D, e: E) => F
export type Function6<A, B, C, D, E, F, G> = (
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
) => G
export type Function7<A, B, C, D, E, F, G, H> = (
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
) => H
export type Function8<A, B, C, D, E, F, G, H, I> = (
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
  h: H,
) => I
export type Function9<A, B, C, D, E, F, G, H, I, J> = (
  a: A,
  b: B,
  c: C,
  d: D,
  e: E,
  f: F,
  g: G,
  h: H,
  i: I,
) => J

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
export type Overwrite<A extends object, B extends object> = Pick<
  A,
  Exclude<keyof A, keyof B>
> &
  B

export type KeysOfType<T, Type> = {
  [K in keyof T]-?: Type extends T[K] ? K : never
}[keyof T]
export type OptionalKeys<T> = KeysOfType<T, undefined>
export type NullKeys<T> = KeysOfType<T, null>
export type MaybeKeys<T> = KeysOfType<T, null | undefined>
export type MakeMaybe<T> = { [K in keyof T]+?: T[K] | null | undefined }

export type OverwriteMaybe<A extends object, B extends object> = Overwrite<
  A,
  Pick<B, Exclude<keyof B, MaybeKeys<A>>> &
    MakeMaybe<Pick<B, keyof B & MaybeKeys<A>>>
>

export type RequireKeys<T extends object, K extends keyof T> = Overwrite<
  T,
  { [key in K]-?: T[key] }
>

export type ArrayValue<T> = T extends Array<infer A> ? A : never
