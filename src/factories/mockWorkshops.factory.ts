import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance, MockServiceFactory } from './mockService.factory';

export interface MockWorkshopsServiceInstance extends MockInstance {
    getAll: FunctionSpy,
    get: FunctionSpy,
    describe: FunctionSpy,
    search: FunctionSpy,
    create: FunctionSpy,
    update: FunctionSpy,
    delete: FunctionSpy,
    facilitators: FunctionSpy,
    upload: FunctionSpy
}

export class MockWorkshopsFactory extends MockServiceFactory {

    public getMockInstance(): MockWorkshopsServiceInstance {
        const r = { Id: "a1Sg0000001jXbg" };
        const instance: MockWorkshopsServiceInstance = {
            getAll: createFunctionSpy(),
            describe: createFunctionSpy(),
            search: createFunctionSpy(),
            get: createFunctionSpy(),
            facilitators: createFunctionSpy(),
            create: createFunctionSpy(),
            update: createFunctionSpy(),
            delete: createFunctionSpy(),
            upload: createFunctionSpy()
        }

        // setup return values
        instance.getAll.andReturn([r]);
        instance.describe.andReturn({ describe: 'describe' });
        instance.search.andReturn([r]);
        instance.get.andReturn(r);
        instance.facilitators.andReturn([r]);
        instance.create.andReturn(r);
        instance.upload.andReturn(r);
        instance.delete.andReturn(r);
        instance.update.andReturn(r);

        return instance;
    }

}