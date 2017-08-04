import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance, MockServiceFactory } from './mockService.factory';

export interface MockFacilitatorsServiceInstance extends MockInstance {
    getAll: FunctionSpy,
    get: FunctionSpy,
    describe: FunctionSpy,
    search: FunctionSpy,
    create: FunctionSpy,
    update: FunctionSpy,
    delete: FunctionSpy,
    deleteAuth: FunctionSpy,
    unmapAuth: FunctionSpy,
    mapContact: FunctionSpy,
    changeRole: FunctionSpy
}

export class MockFacilitatorsFactory extends MockServiceFactory {

    public getMockInstance(): MockFacilitatorsServiceInstance {
        const r = { Id: "a1Sg0000001jXbg" };
        const instance: MockFacilitatorsServiceInstance = {
            getAll: createFunctionSpy(),
            describe: createFunctionSpy(),
            search: createFunctionSpy(),
            get: createFunctionSpy(),
            mapContact: createFunctionSpy(),
            create: createFunctionSpy(),
            update: createFunctionSpy(),
            delete: createFunctionSpy(),
            deleteAuth: createFunctionSpy(),
            unmapAuth: createFunctionSpy(),
            changeRole: createFunctionSpy()
        }

        // setup return values
        instance.getAll.andReturn([r]);
        instance.describe.andReturn({ describe: 'describe' });
        instance.search.andReturn([r]);
        instance.get.andReturn(r);
        instance.unmapAuth.andReturn([r]);
        instance.create.andReturn(r);
        instance.changeRole.andReturn(r);
        instance.delete.andReturn(r);
        instance.deleteAuth.andReturn(r);
        instance.mapContact.andReturn(r);
        instance.update.andReturn(r);

        return instance;
    }

}