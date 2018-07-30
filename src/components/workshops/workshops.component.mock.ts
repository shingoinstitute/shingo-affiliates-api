import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory.mock';

export class MockWorkshopsServiceInstance extends MockInstance {

    constructor(record: any = { Id: "a1Sg0000001jXbg" }) {
        super();

        // setup return values
        this.getAll.andReturn([record]);
        this.describe.andReturn({ describe: 'describe' });
        this.search.andReturn([record]);
        this.get.andReturn(record);
        this.facilitators.andReturn([record]);
        this.create.andReturn(record);
        this.upload.andReturn(record);
        this.delete.andReturn(record);
        this.update.andReturn(record);
    }

    getAll: FunctionSpy = createFunctionSpy();
    get: FunctionSpy = createFunctionSpy();
    describe: FunctionSpy = createFunctionSpy();
    search: FunctionSpy = createFunctionSpy();
    create: FunctionSpy = createFunctionSpy();
    update: FunctionSpy = createFunctionSpy();
    delete: FunctionSpy = createFunctionSpy();
    facilitators: FunctionSpy = createFunctionSpy();
    upload: FunctionSpy = createFunctionSpy();
}