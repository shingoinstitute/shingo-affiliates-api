import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance, MockServiceFactory } from './mockService.factory';

export interface MockLoggerInstance extends MockInstance {
    log: FunctionSpy,
    silly: FunctionSpy,
    debug: FunctionSpy,
    verbose: FunctionSpy,
    info: FunctionSpy,
    warn: FunctionSpy,
    error: FunctionSpy
}

export class MockLoggerFactory extends MockServiceFactory {

    public getMockInstance(): MockLoggerInstance {
        const instance: MockLoggerInstance = {
            log: createFunctionSpy(),
            silly: createFunctionSpy(),
            debug: createFunctionSpy(),
            verbose: createFunctionSpy(),
            info: createFunctionSpy(),
            warn: createFunctionSpy(),
            error: createFunctionSpy()
        }

        // Setup to return null
        instance.log.andReturn('');
        instance.silly.andReturn('');
        instance.debug.andReturn('');
        instance.verbose.andReturn('');
        instance.info.andReturn('');
        instance.warn.andReturn('');
        instance.error.andReturn('');

        return instance;
    }

}