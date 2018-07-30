import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory.mock';

export class MockCacheServiceInstance extends MockInstance {

    constructor() {
        super();
        this.isCached.andReturn(true);
        this.getCache.andReturn([{ Id: 'a000a0a00a00a0' }]);
        this.cache.andReturn(undefined);
    }

    getCache: FunctionSpy = createFunctionSpy();
    isCached: FunctionSpy = createFunctionSpy();
    cache: FunctionSpy = createFunctionSpy();
}