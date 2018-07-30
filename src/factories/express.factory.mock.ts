import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from './service.factory.mock';

export interface MockRequest {
    headers: any,
    body: any,
    query: any,
    params: any,
    session: any
}

export interface MockResponse {
    status: FunctionSpy,
    json: FunctionSpy
}

export type MockNext = any

export class MockExpressInstance extends MockInstance {

    constructor() {
        super();
        this.req = {
            headers: { 'x-jwt': 'myToken' },
            body: { "Name": "test" },
            query: { "isPublic": "true" },
            params: {},
            session: {}
        }
        this.res = {
            status: createFunctionSpy(),
            json: createFunctionSpy()
        }
        this.res.status.andReturn(this.res);
        this.next.andReturn(() => { });
    }

    req: MockRequest;
    res: MockResponse;
    next: MockNext = createFunctionSpy();
}