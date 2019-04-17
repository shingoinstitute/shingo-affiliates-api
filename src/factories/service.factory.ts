export abstract class MockInstance {}

export class MockServiceFactory {
  public static getMockInstance<T extends MockInstance>(c: new () => T): T {
    return new c()
  }
}
