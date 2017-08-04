import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance, MockServiceFactory } from './mockService.factory';

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

export interface MockExpressInstance extends MockInstance {
    req: MockRequest,
    res: MockResponse,
    next: MockNext
}

export class MockExpressFactory extends MockServiceFactory {
    public getMockInstance(): MockExpressInstance {
        const req: MockRequest = {
            headers: { 'x-jwt': 'myToken' },
            body: { "Name": "test" },
            query: { "isPublic": "true" },
            params: {},
            session: {}
        }
        const res: MockResponse = {
            status: createFunctionSpy(),
            json: createFunctionSpy()
        }
        res.status.andReturn(res);
        const next: MockNext = createFunctionSpy().andReturn(() => { });

        const instance: MockExpressInstance = { req, res, next };
        return instance
    }
}