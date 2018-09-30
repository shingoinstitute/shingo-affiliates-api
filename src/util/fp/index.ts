export const id = <T>(x: T) => x

export const flatten = <T>(a: T[][]): T[] =>
  a.reduce((p, c) => [...p, ...c], [])

// taken from gcanti/fp-ts function.ts, all credit to gcanti/fp-ts
// tslint:disable:max-line-length
export function pipe<A, B, C>(ab: (a: A) => B, bc: (b: B) => C): (a: A) => C
export function pipe<A, B, C, D>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
): (a: A) => D
export function pipe<A, B, C, D, E>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): (a: A) => E
export function pipe<A, B, C, D, E, F>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): (a: A) => F
export function pipe<A, B, C, D, E, F, G>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
): (a: A) => G
export function pipe<A, B, C, D, E, F, G, H>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
): (a: A) => H
export function pipe<A, B, C, D, E, F, G, H, I>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
): (a: A) => I
export function pipe<A, B, C, D, E, F, G, H, I, J>(
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
  fg: (f: F) => G,
  gh: (g: G) => H,
  hi: (h: H) => I,
  ij: (i: I) => J,
): (a: A) => J
// tslint:disable-next-line:ban-types
export function pipe(...fns: Function[]): Function {
  const len = fns.length - 1
  return function(this: any, x: any) {
    let y = x
    for (let i = 0; i <= len; i++) {
      y = fns[i].call(this, y)
    }
    return y
  }
}

export const tuple = <A extends any[]>(...args: A) => args

export const head = <T>(xs: T[]) => {
  const [x] = xs
  return x
}

type Unwrap<T> = T extends Array<infer A> ? A : never
export type Cartesian<A extends [any[], any[], ...any[][]]> = Array<
  { [key in keyof A]: Unwrap<A[key]> }
>

export type ToIterableIterator<T extends any[]> = T extends Array<infer A>
  ? IterableIterator<A>
  : never

export function* cartesian<A extends [any[], any[], ...any[][]]>(
  ...arrays: A
): ToIterableIterator<Cartesian<A>> {
  function* doCartesian(i, prod) {
    if (i === arrays.length) {
      yield prod
    } else {
      for (const elem of arrays[i]) {
        yield* doCartesian(i + 1, prod.concat([elem]))
      }
    }
  }

  yield* doCartesian(0, [])
}
