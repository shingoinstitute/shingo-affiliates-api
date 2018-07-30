import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory.mock';

export class MockUserServiceInstance extends MockInstance {

    constructor(user: any = { Id: "a1Sg0000001jXbg" }) {
        super();

        this.getWorkshopIds.andReturn([user]);
    }

    getWorkshopIds: FunctionSpy = createFunctionSpy();
}