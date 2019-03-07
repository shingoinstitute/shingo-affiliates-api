import { Injectable } from '@nestjs/common'
import NodeCache from 'node-cache'
import hash from 'object-hash'

/**
 * @desc A service that provides an in-memory cache
 *
 * @export
 * @class CacheService
 */
@Injectable()
export class CacheService {
  constructor() {
    this.theCache = new NodeCache({ stdTTL: 60 * 60, checkperiod: 60 * 15 }) // sec * minutes = time
  }

  /**
   * @desc An instance of NodeCache
   *
   * @private
   * @memberof CacheService
   */
  private theCache: NodeCache

  /**
   * @desc Helper function to hash an object to a key
   *
   * @private
   * @param obj An object to hash
   * @returns the hash key for a given value
   * @memberof CacheService
   */
  private getKey<K extends object>(obj: K): string {
    return hash(obj)
  }

  /**
   * @desc Get the cached result for the give key
   *
   * @param obj The key for a value
   * @returns The cached result. 'undefined' if key is not found.
   * @memberof CacheService
   */
  getCache<T extends object, V>(obj: T | string): V | undefined {
    const key = typeof obj !== 'string' ? this.getKey(obj) : obj

    return this.theCache.get(key)
  }

  /**
   * @desc Checks if cache contains key
   *
   * @param obj The key for a value
   * @returns {boolean} boolean indicating whether the cache contains a key
   * @memberof CacheService
   */
  isCached<K extends object>(obj: K | string): boolean {
    const key = typeof obj !== 'string' ? this.getKey(obj) : obj

    return typeof this.theCache.get(key) !== 'undefined'
  }

  invalidate<K extends object>(obj: K | string): void {
    const key = typeof obj !== 'string' ? this.getKey(obj) : obj

    const count = this.theCache.del(key)
    if (count < 1) console.error('Did not invalidate cache for key: %j', key)
  }

  /**
   * @desc Caches the value based on the resulting key. Logs error if not successfully.
   *
   * @param obj The key for a value
   * @param value A value to cache
   * @memberof CacheService
   */
  cache<K extends object, V>(obj: K | string, value: V): void {
    const key = typeof obj !== 'string' ? this.getKey(obj) : obj

    if (typeof value === 'undefined') return

    const success = this.theCache.set(key, value)
    if (!success) console.error('Response could not be cached!')
  }
}
