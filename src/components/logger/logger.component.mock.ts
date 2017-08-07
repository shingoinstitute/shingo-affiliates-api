import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory';

export class MockLoggerInstance extends MockInstance {

    constructor() {
        super();

        // Setup to return null
        this.log.andReturn('');
        this.silly.andReturn('');
        this.debug.andReturn('');
        this.verbose.andReturn('');
        this.info.andReturn('');
        this.warn.andReturn('');
        this.error.andReturn('');
    }

    log: FunctionSpy = createFunctionSpy();
    silly: FunctionSpy = createFunctionSpy();
    debug: FunctionSpy = createFunctionSpy();
    verbose: FunctionSpy = createFunctionSpy();
    info: FunctionSpy = createFunctionSpy();
    warn: FunctionSpy = createFunctionSpy();
    error: FunctionSpy = createFunctionSpy();
}