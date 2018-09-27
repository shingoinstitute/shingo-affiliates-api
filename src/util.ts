import { CacheService } from './components'
import { BadRequestException } from '@nestjs/common'
import { Request } from 'express'
import { AuthUser } from './guards/auth.guard'
// tslint:disable:max-classes-per-file

export type Lazy<T> = () => T
export type Overwrite<A extends object, B extends object> = Pick<
  A,
  Exclude<keyof A, keyof B>
> &
  B
export type RequireKeys<T extends object, K extends keyof T> = Overwrite<
  T,
  { [key in K]-?: T[key] }
>

export type Arguments<T> = T extends (...args: infer A) => any ? A : never

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

export const hasRole = (role: string) => (u: AuthUser) =>
  !!(u.roles || []).find(r => r.name === role)
export const isAffiliateManager = hasRole('Affiliate Manager')

export const missingParam = (name: string) =>
  new BadRequestException(`Missing parameters: ${name}`, 'MISSING_PARAMETERS')

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
  invalidate = false,
) => {
  if (!cache.isCached(key) || invalidate) {
    const result = await data()
    cache.cache(key, result)
    return result
  } else {
    return cache.getCache(key) as T
  }
}

export const retrieveResult = (r: unknown) => (Array.isArray(r) ? r[0] : r)

/**
 * Gives hostname:port service definition
 * @param host a hostname and optional port number, separated by ':'
 * @param defPort a port number to use if port is not included in host parameter
 */
export const defaultPort = (host: string, defPort: number) => {
  const [hostname, port] = host.split(':')
  const realPort = typeof port === 'undefined' ? defPort : port
  return `${hostname}:${realPort}`
}

/**
 * Parse out the workshops that a user has permissions for
 *
 * @param user Requires user.permissions[] and user.roles[].permissions[]
 */
// tslint:disable-next-line:max-line-length
export function getWorkshopIds(user: AuthUser): string[] {
  // permissions for affiliate portal roles
  const affPermissions = flatten(
    (user.roles || [])
      .filter(r => r.service === 'affiliate-portal')
      .map(r => r.permissions || []),
  )
  const ids = [...(user.permissions || []), ...affPermissions]
    .filter(p => p.resource && p.resource.includes('/workshops/'))
    .map(p => `'${p.resource!.replace('/worshops/', '')}'`)

  return [...new Set(ids)] // Only return unique ids
}

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

export const getJwt = (req: Request) =>
  (req.headers.authorization && getBearerToken(req.headers.authorization)) ||
  (req.headers['x-jwt'] as string | undefined)

export const getBearerToken = (header: string): string | undefined => {
  const parts = header.split('Bearer ')
  return parts.length === 2 ? parts[1] : undefined
}
