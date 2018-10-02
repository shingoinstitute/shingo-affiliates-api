import { CacheService } from '../components'
import { BadRequestException } from '@nestjs/common'
import { Request } from 'express'
import { AuthUser } from '../guards/auth.guard'
import { flatten } from './fp'
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

export const portalRoles = (u: AuthUser) =>
  (u.roles || []).filter(r => r.service === 'affiliate-portal')

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

export const retrieveResult = <T>(r: T[]) =>
  (r[0] as typeof r[0] | null) || null

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

export const getJwt = (req: Request) =>
  (req.headers.authorization && getBearerToken(req.headers.authorization)) ||
  (req.headers['x-jwt'] as string | undefined)

export const getBearerToken = (header: string): string | undefined => {
  const parts = header.split('Bearer ')
  return parts.length === 2 ? parts[1] : undefined
}
