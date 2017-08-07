import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory';

export class MockAffiliatesServiceInstance extends MockInstance {

    constructor(record: any = { Id: "a1Sg0000001jXbg" }) {
        super();
        // setup return values
        this.getAll.andReturn([record]);
        this.describe.andReturn({ describe: 'describe' });
        this.search.andReturn([record]);
        this.searchCM.andReturn([record]);
        this.get.andReturn(record);
        this.create.andReturn(record);
        this.delete.andReturn(record);
        this.update.andReturn(record);
        this.map.andReturn(record);
    }

    getAll: FunctionSpy = createFunctionSpy();
    get: FunctionSpy = createFunctionSpy();
    describe: FunctionSpy = createFunctionSpy();
    search: FunctionSpy = createFunctionSpy();
    searchCM: FunctionSpy = createFunctionSpy();
    create: FunctionSpy = createFunctionSpy();
    update: FunctionSpy = createFunctionSpy();
    delete: FunctionSpy = createFunctionSpy();
    map: FunctionSpy = createFunctionSpy();
}