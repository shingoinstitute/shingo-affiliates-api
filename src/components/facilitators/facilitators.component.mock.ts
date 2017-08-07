import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory';

export class MockFacilitatorsServiceInstance extends MockInstance {

    constructor(record: any = { Id: "a1Sg0000001jXbg" }) {
        super();
        // setup return values
        this.getAll.andReturn([record]);
        this.describe.andReturn({ describe: 'describe' });
        this.search.andReturn([record]);
        this.get.andReturn(record);
        this.unmapAuth.andReturn([record]);
        this.create.andReturn(record);
        this.changeRole.andReturn(record);
        this.delete.andReturn(record);
        this.deleteAuth.andReturn(record);
        this.mapContact.andReturn(record);
        this.update.andReturn(record);
    }

    getAll: FunctionSpy = createFunctionSpy();
    get: FunctionSpy = createFunctionSpy();
    describe: FunctionSpy = createFunctionSpy();
    search: FunctionSpy = createFunctionSpy();
    create: FunctionSpy = createFunctionSpy();
    update: FunctionSpy = createFunctionSpy();
    delete: FunctionSpy = createFunctionSpy();
    deleteAuth: FunctionSpy = createFunctionSpy();
    unmapAuth: FunctionSpy = createFunctionSpy();
    mapContact: FunctionSpy = createFunctionSpy();
    changeRole: FunctionSpy = createFunctionSpy();
}