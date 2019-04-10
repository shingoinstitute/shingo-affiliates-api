import { Injectable } from '@nestjs/common';
import * as NodeCache from 'node-cache';
import * as hash from 'object-hash';

/**
 * @desc A service that provides an in-memory cache
 * 
 * @export
 * @class CacheService
 */
@Injectable()
export class CacheService {

    constructor() {
        this.theCache = new NodeCache({ stdTTL: 60 * 60, checkperiod: 60 * 15 }); // sec * minutes = time
    }

    /**
     * @desc An instance of NodeCache
     * 
     * @private
     * @memberof CacheService
     */
    private theCache;

    /**
     * @desc Helper function to hash an object to a key
     * 
     * @private
     * @param {object} obj 
     * @returns {string} 
     * @memberof CacheService
     */
    private getKey(obj: object): string {
        return hash(obj);
    }

    /**
     * @desc Get the cached result for the give key
     * 
     * @param {(object | string)} obj 
     * @returns The cached result. 'undefined' if key is not found.
     * @memberof CacheService
     */
    public getCache(obj: object | string) {
        let key = obj;
        if (typeof obj !== 'string') key = this.getKey(obj);

        return this.theCache.get(key);
    }

    /**
     * @desc Checks if cache contains key
     * 
     * @param {(object | string)} obj 
     * @returns {boolean} 
     * @memberof CacheService
     */
    public isCached(obj: object | string): boolean {
        let key = obj;
        if (typeof obj !== 'string') key = this.getKey(obj);

        return this.theCache.get(key) !== undefined;
    }

    public invalidate(obj: object | string): void {
        let key = obj;
        if (typeof obj !== 'string') key = this.getKey(obj);

        const count = this.theCache.del(key);
        if (count < 1) console.error('Did not invalidate cache for key: %j', key);
    }

    /**
     * @desc Caches the value based on the resulting key. Logs error if not successfully.
     * 
     * @param {(object | string)} obj 
     * @param {*} value 
     * @memberof CacheService
     */
    public cache(obj: object | string, value: any): void {
        let key = obj;
        if (typeof obj !== 'string') key = this.getKey(obj);
        if (!value) return;

        const success = this.theCache.set(key, value);
        if (!success) console.error("Response could not be cached!");
    }

}