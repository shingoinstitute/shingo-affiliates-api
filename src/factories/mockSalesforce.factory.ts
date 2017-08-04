import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance, MockServiceFactory } from './mockService.factory';

export interface MockSalesforceServiceInstance extends MockInstance {
    query: FunctionSpy,
    describe: FunctionSpy,
    search: FunctionSpy,
    retrieve: FunctionSpy,
    create: FunctionSpy,
    update: FunctionSpy,
    delete: FunctionSpy
}

export class MockSalesforceServiceFactory extends MockServiceFactory {
    public getMockInstance(): MockSalesforceServiceInstance {
        const instance: MockSalesforceServiceInstance = {
            query: createFunctionSpy(),
            describe: createFunctionSpy(),
            search: createFunctionSpy(),
            retrieve: createFunctionSpy(),
            create: createFunctionSpy(),
            update: createFunctionSpy(),
            delete: createFunctionSpy(),
        }

        const r = { Id: "a1Sg0000001jXbg" };
        instance.query.andReturn({ totalSize: 1, done: true, records: [r] });
        instance.describe.andReturn({ describe: 'describe' });
        instance.search.andReturn({ searchRecords: [r] });
        instance.retrieve.andReturn([r]);
        instance.create.andReturn([{ id: r.Id, success: true, errors: [] }]);
        instance.update.andReturn([{ id: r.Id, success: true, errors: [] }]);
        instance.delete.andReturn([{ id: r.Id, success: true, errors: [] }]);

        return instance;
    }

}