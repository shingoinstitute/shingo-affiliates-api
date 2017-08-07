import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory';

export class MockSalesforceServiceInstance extends MockInstance {

    constructor(record: any = { Id: "a1Sg0000001jXbg" }) {
        super();
        this.query.andReturn({ totalSize: 1, done: true, records: [record] });
        this.describe.andReturn({ describe: 'describe' });
        this.search.andReturn({ searchRecords: [record] });
        this.retrieve.andReturn([record]);
        this.create.andReturn([{ id: record.Id, success: true, errors: [] }]);
        this.update.andReturn([{ id: record.Id, success: true, errors: [] }]);
        this.delete.andReturn([{ id: record.Id, success: true, errors: [] }]);
    }

    query: FunctionSpy = createFunctionSpy();
    describe: FunctionSpy = createFunctionSpy();
    search: FunctionSpy = createFunctionSpy();
    retrieve: FunctionSpy = createFunctionSpy();
    create: FunctionSpy = createFunctionSpy();
    update: FunctionSpy = createFunctionSpy();
    delete: FunctionSpy = createFunctionSpy();
}