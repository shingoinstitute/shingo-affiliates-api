import { CacheService, SalesforceService } from './components'

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
export const tryCache = async <T>(cache: CacheService, key: string | object, data: Lazy<Promise<T>>, invalidate = false) => {
  if (!cache.isCached(key) || invalidate) {
    const result = await data();
    cache.cache(key, result);
    return result;
  } else {
    return cache.getCache(key) as T;
  }
};

export const parseError = (error: any, errHandler?: (e: { error: string }) => void) => {
  if (error.metadata) error = SalesforceService.parseRPCErrorMeta(error);
  if (error.message) error = { message: error.message };

  if (typeof error.error === 'string' && error.error.match(/\{.*\}/g)) {
      try {
          error.error = JSON.parse(error.error);
      } catch (e) {
        errHandler && errHandler(error)
      }
  }

  return error
}