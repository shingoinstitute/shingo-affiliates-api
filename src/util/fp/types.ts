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
 */
export type Awaited<T> = {
  '1': T extends { then(onfulfilled: (value: infer U) => any): any }
    ? Awaited<U>
    : T
}[T extends number ? '1' : '1']
