import { Unzip, NonEmptyArray, RetType, ArrayValue, Lazy } from '../types'

export const id = <T>(x: T) => x

// spreading arrays is expensive, and we do it a lot here
// this version takes 13481ms vs 18ms for the iterative version
// with a test array of Array(1000).fill(Array(1000).fill(0))
// export const flatten = <T>(a: T[][]): T[] =>
//   a.reduce((p, c) => [...p, ...c], [])

// from fp-ts, credit to gcanti
export const flatten = <A>(ffa: A[][]): A[] => {
  let flattenedLength = 0
  const len = ffa.length
  for (let i = 0; i < len; i++) {
    flattenedLength += ffa[i].length
  }
  const flattened = Array(flattenedLength)
  let start = 0
  for (let i = 0; i < len; i++) {
    const arr = ffa[i]
    const l = arr.length
    for (let j = 0; j < l; j++) {
      flattened[j + start] = arr[j]
    }
    start += l
  }
  return flattened
}

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

export function unzip<A extends any[]>(arr: NonEmptyArray<A>): Unzip<A>
export function unzip<A extends any[]>(
  arr: A[],
  tupleLength: A['length'],
): Unzip<A>
export function unzip<A extends any[]>(
  arr: A[],
  tupleLength?: number,
): Unzip<A> {
  const tuple: Unzip<A> = tupleLength
    ? new Array(tupleLength).map(_ => [])
    : (arr[0].map(_ => []) as any)

  for (const t of arr) {
    t.forEach((e, i) => {
      tuple[i].push(e)
    })
  }

  return tuple
}

const lazyFill = <T extends any[]>(arr: T, supplier: Lazy<T>) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = supplier()
  }

  return arr
}

/**
 * Maps multiple functions over an array in one pass
 *
 * Time complexity `O(arr.length * fns.length)`
 * @param arr Array to map over
 * @param fns Functions to execute per value of arr
 */
export const multimap = <
  T extends any[],
  Fns extends Array<
    (value: ArrayValue<T>, index: number, array: ReadonlyArray<T>) => any
  >
>(
  arr: Readonly<T>,
  ...fns: Fns
) => {
  // using standard Array.fill filled the array with the same object reference,
  // resulting in modifications to one sub-array affecting all the arrays
  const out: {
    [K in keyof Fns]: { [Ak in keyof T]: RetType<Fns[K]> }
  } = lazyFill(Array(fns.length), () => []) as any
  arr.forEach((value, index, array) => {
    fns.forEach((f, i) => {
      out[i].push(f(value, index, array))
    })
  })
  return out
}

export const head = <T>(xs: T[]) => {
  const [x] = xs
  return x
}

export type Cartesian<A extends [any[], any[], ...any[][]]> = Array<
  { [key in keyof A]: ArrayValue<A[key]> }
>

export type ToIterableIterator<T extends any[]> = T extends Array<infer A>
  ? IterableIterator<A>
  : never

export function* cartesian<A extends [any[], any[], ...any[][]]>(
  ...arrays: A
): ToIterableIterator<Cartesian<A>> {
  function* doCartesian(i: number, prod: any[]): IterableIterator<any[]> {
    if (i === arrays.length) {
      yield prod
    } else {
      for (const elem of arrays[i]) {
        yield* doCartesian(i + 1, prod.concat([elem]))
      }
    }
  }

  yield* doCartesian(0, []) as any
}
