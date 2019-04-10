import { BadRequestException } from '@nestjs/common'
import { SFInterfaces } from '../sf-interfaces'
import { CacheService } from '../components'
import { Lazy } from 'fp-ts/lib/function'
import { PromiseValue, RetType, ArrayValue } from './types'
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

export const getBearerToken = (header: string): string | undefined => {
  const parts = header.split('Bearer ')
  return parts.length === 2 ? parts[1] : undefined
}

export const retrieveResult = <T>(r: T[]) =>
  (r[0] as typeof r[0] | null) || null

export const getJwt = (req: Request) =>
  (req.headers.authorization && getBearerToken(req.headers.authorization)) ||
  (req.headers['x-jwt'] as string | undefined)

export const copyObj = <T>(o: T): T => {
  if (typeof o !== 'object') return o
  if (Array.isArray(o)) return (o.map(copyObj) as unknown) as T

  const n: T = {} as T
  for (const k in o) {
    if (o.hasOwnProperty(k)) {
      const val = o[k]
      n[k] = copyObj(val)
    }
  }

  return n
}
