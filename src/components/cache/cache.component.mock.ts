import { Injectable } from '@nestjs/common'

@Injectable()
export class CacheServiceMock {
  getCache<T extends object, V>(_obj: string | T): V | undefined {
    return undefined
  }

  isCached<K extends object>(_obj: string | K): boolean {
    return false
  }

  invalidate<K extends object>(_obj: string | K): void {
    // noop
  }

  cache<K extends object, V>(_obj: string | K, _value: V): void {
    // noop
  }
}
