import { CacheService } from '../components'
import { mockLogger } from '../factories/logger.mock'
import { tryCache } from './util'

describe('util', () => {
  describe('tryCache', () => {
    const data = { data: true }

    it('resolves the lazy promise if the key does not exist in the cache, and adds the result to the cache', async () => {
      expect.assertions(4)
      const cache = new CacheService(mockLogger)
      const dataLazyPromise = jest.fn().mockResolvedValue(data)
      expect(cache.isCached('somekey')).toBe(false)
      const result = await tryCache(cache, 'somekey', dataLazyPromise)

      expect(cache.isCached('somekey')).toBe(true)
      expect(dataLazyPromise).toHaveBeenCalledTimes(1)
      expect(result).toEqual(await dataLazyPromise())
    })

    it('resolves the cached value directly if the key exists in the cache', async () => {
      expect.assertions(3)
      const cache = new CacheService(mockLogger)
      const dataLazyPromise = jest.fn().mockResolvedValue(data)
      cache.cache('somekey', { oldData: true })
      const result = await tryCache(cache, 'somekey', dataLazyPromise)

      expect(cache.isCached('somekey')).toBeTruthy()
      expect(dataLazyPromise).toHaveBeenCalledTimes(0)
      expect(result).toEqual({ oldData: true })
    })

    it('resolves the lazy promise if the invalidate flag is passed', async () => {
      expect.assertions(3)
      const cache = new CacheService(mockLogger)
      const dataLazyPromise = jest.fn().mockResolvedValue(data)
      cache.cache('somekey', { oldData: true })
      const result = await tryCache(cache, 'somekey', dataLazyPromise, true)

      expect(cache.isCached('somekey')).toBeTruthy()
      expect(dataLazyPromise).toHaveBeenCalledTimes(1)
      expect(result).toEqual(await dataLazyPromise())
    })
  })
})
