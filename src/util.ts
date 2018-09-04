import { CacheService } from './components'

export type Lazy<T> = () => T
export type Overwrite<A extends object, B extends object> = Pick<A, Exclude<keyof A, keyof B>> & B
export type RequireKeys<T extends object, K extends keyof T> = Overwrite<T, { [key in K]-?: T[key] }>

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
    cache.cache(key, result)
    return result
  } else {
    return cache.getCache(key) as T
  }
}

/**
 * Gives hostname:port service definition
 * @param host a hostname and optional port number, separated by ':'
 * @param defPort a port number to use if port is not included in host parameter
 */
export const defaultPort = (host: string, defPort: number) => {
  const [ hostname, port ] = host.split(':')
  const realPort = typeof port === 'undefined' ? defPort : port
  return `${hostname}:${realPort}`
}

/**
 * Parse out the workshops that a user has permissions for
 *
 * @param user Requires user.permissions[] and user.roles[].permissions[]
 */
// tslint:disable-next-line:max-line-length
export function getWorkshopIds(user: { permissions: Array<{ resource: string }>, roles: { permissions: Array<{resource: string}> } }): string[] {
  const ids =
    [...user.permissions, ...user.roles.permissions]
        .filter(p => p.resource.includes('/workshops/'))
        .map(p => `'${p.resource.replace('/worshops/', '')}'`)

  return [...new Set(ids)]; // Only return unique ids
}

// taken from gcanti/fp-ts function.ts, all credit to gcanti/fp-ts
// tslint:disable:max-line-length
export function pipe<A, B, C>(ab: (a: A) => B, bc: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): (a: A) => D;
export function pipe<A, B, C, D, E>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): (a: A) => E;
export function pipe<A, B, C, D, E, F>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F): (a: A) => F;
export function pipe<A, B, C, D, E, F, G>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G): (a: A) => G;
export function pipe<A, B, C, D, E, F, G, H>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H): (a: A) => H;
export function pipe<A, B, C, D, E, F, G, H, I>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I): (a: A) => I;
export function pipe<A, B, C, D, E, F, G, H, I, J>(ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E, ef: (e: E) => F, fg: (f: F) => G, gh: (g: G) => H, hi: (h: H) => I, ij: (i: I) => J): (a: A) => J;
// tslint:disable-next-line:ban-types
export function pipe(...fns: Function[]): Function {
// tslint:enable:max-line-length
  const len = fns.length - 1
  return function(this: any, x: any) {
    let y = x
    for (let i = 0; i <= len; i++) {
      y = fns[i].call(this, y)
    }
    return y
  }
}

export const parseRPCErrorMeta = (err: any): any => {

}

export const parseError = (error: any, errHandler?: (e: { error: string }) => void) => {
  if (error.metadata) error = parseRPCErrorMeta(error)
  if (error.message) error = { message: error.message }

  if (typeof error.error === 'string' && error.error.match(/\{.*\}/g)) {
      try {
          error.error = JSON.parse(error.error)
      } catch (e) {
        if (errHandler) errHandler(error)
      }
  }

  return error
}

export const getBearerToken = (header: string): string | null => {
  const parts = header.split('Bearer ')
  return parts.length > 0 ? parts[1] : null
}
