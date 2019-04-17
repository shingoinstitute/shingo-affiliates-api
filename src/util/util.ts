import { BadRequestException } from '@nestjs/common'
import { SFInterfaces } from '../sf-interfaces'
import { CacheService } from '../components'
import { Lazy } from 'fp-ts/lib/function'
import { PromiseValue, RetType, ArrayValue, Omit } from './types'
import { Request } from 'express'

// fixes the broken Promise.all types (original cannot properly infer return type given non-heterogenous arrays)
// this does break some cases where Promise.all used to work - for manually enumerated tuple type overloads.
// Wrap the array with tuple() to solve this issue, keeping the array inferred as a tuple
declare global {
  interface PromiseConstructor {
    all<Ps extends Array<any | PromiseLike<any>>>(
      promises: Ps
    ): Promise<{ [K in keyof Ps]: PromiseValue<Ps[K]> }>
  }
}

/** used for type-safe dependency injection with nestjs */
export class Token<T = never> {
  constructor(public name?: string) {}
}

declare module '@nestjs/core' {
  class Reflector {
    get<T>(metadataKey: Token<T>, target: any): T
    // tslint:disable-next-line:unified-signatures
    get<T>(metadataKey: any, target: any): T
  }
}

/** infers parameters as a tuple of elements */
export const tuple = <Ts extends any[]>(...t: Ts) => t
/** infers parameters as a tuple of elements assignable to the type T */
export const tuple1 = <T>() => <Ts extends T[]>(...t: Ts) => t

export const missingParam = (name: string) =>
  new BadRequestException(`Missing parameters: ${name}`, 'MISSING_PARAMETERS')

export type SFQueryResult<
  A extends {
    table: keyof SFInterfaces
    fields: Array<keyof SFInterfaces[A['table']]>
  }
> = Pick<SFInterfaces[A['table']], A['fields'][number]>

/**
 * Gets some data from a cache if a key exists or stores new data in the cache
 * @param cache The cache service
 * @param key The cache key
 * @param data A lazy promise for some data
 * @param invalidate Boolean indicating if the cache should be invalidated
 */
export const tryCache = async <T>(
  cache: CacheService,
  key: string | object,
  data: Lazy<Promise<T>>,
  invalidate = false
) => {
  if (!cache.isCached(key) || invalidate) {
    const result = await data()
    // don't cache empty values
    if (!result || (Array.isArray(result) && result.length === 0)) return result
    cache.cache(key, result)
    return result
  } else {
    return cache.getCache(key) as T
  }
}

/**
 * Fills an array with the result of a function
 * @param arr a non-empty array
 * @param supplier a nullary function used to fill the array
 */
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

/**
 * Gets the token from a Bearer Authorization header
 * @param header the authorization header
 */
export const getBearerToken = (header: string): string | undefined => {
  const parts = header.split('Bearer ')
  return parts.length === 2 ? parts[1] : undefined
}

/**
 * Gets the jwt authorization out of a request
 *
 * checks the authorization header primarily, and falls back to
 * the dumb custom x-jwt header
 * @param req an Express request object
 */
export const getJwt = (req: Request) =>
  (req.headers.authorization && getBearerToken(req.headers.authorization)) ||
  (req.headers['x-jwt'] as string | undefined)

/**
 * Recursively copies a plain object
 *
 * Do not use with objects with modified prototypes (classes, custom arrays, etc)
 * @param o an object
 * @param exclude an optional array of keys to exclude (recursively) from the copied object
 */
// this return type is not quite right. We would need some kind of DeepOmit,
// but because typescript preserves optionals on objects only if its considered
// a simple transformation (which DeepOmit is not), we would lose the optional
// information. Plus it would be difficult to get the keys
export function copyObj<T, K extends keyof T>(
  o: T,
  exclude: Array<K>
): Omit<T, K>
export function copyObj<T>(o: T): T
export function copyObj<T>(o: T, exclude: Array<keyof T> = []): T {
  // typeof null === 'object' in javascript for legacy reasons
  // we have to explicitly check in that case
  if (typeof o !== 'object' || o === null) return o
  if (Array.isArray(o)) return (o.map(v => copyObj(v, exclude)) as unknown) as T

  const n: T = {} as T
  for (const k in o) {
    if (o.hasOwnProperty(k) && !exclude.includes(k)) {
      const val = o[k]
      n[k] = copyObj(val)
    }
  }

  return n
}

/**
 * Parses gRPC errors. Remove once Auth-Service is integrated
 * @param error a gRPC error
 */
export const parseRPCErrorMeta = (error: any): object => {
  try {
    let err = JSON.parse(error.metadata.get('error-bin').toString())
    return err
  } catch (caught) {
    if (error.metadata.get('error-bin'))
      return error.metadata.get('error-bin').toString()
    else return error
  }
}

/**
 * Removes the given keys from the object deeply
 *
 * @param o an object
 * @param keys keys to remove
 */
export function deepClean<T extends object, K extends keyof T>(
  o: T,
  ...keys: K[]
): Omit<T, K>
export function deepClean<T extends object, K extends keyof any>(
  o: T,
  ...keys: K[]
): T
export function deepClean<T extends object, K extends keyof T>(
  o: T,
  ...keys: K[]
): Omit<T, K> {
  return copyObj(o, keys)
}
