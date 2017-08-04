export interface MockInstance { };

export abstract class MockServiceFactory {
    public abstract getMockInstance(): MockInstance;
}
