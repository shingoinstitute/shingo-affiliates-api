import { Test as NestTest } from '@nestjs/testing';
import { WorkshopsService, LoggerService } from '../../components';
import { MockSalesforceServiceInstance, MockAuthServiceInstance, MockCacheServiceInstance, MockUserServiceInstance } from '../../components/mock';
import { MockServiceFactory } from '../../factories';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';

function getService() {
    const service: WorkshopsService = NestTest.get<WorkshopsService>(WorkshopsService);
    return service;
}

@TestFixture('Workshops Service')
export class WorkshopsServiceFixture {

    private mockSalesforceService: MockSalesforceServiceInstance;
    private mockAuthService: MockAuthServiceInstance;
    private mockCache: MockCacheServiceInstance;
    private mockUserService: MockUserServiceInstance;

    @Setup
    public Setup() {
        this.mockSalesforceService = MockServiceFactory.getMockInstance<MockSalesforceServiceInstance>(MockSalesforceServiceInstance);
        this.mockAuthService = MockServiceFactory.getMockInstance<MockAuthServiceInstance>(MockAuthServiceInstance);
        this.mockCache = MockServiceFactory.getMockInstance<MockCacheServiceInstance>(MockCacheServiceInstance);
        this.mockUserService = MockServiceFactory.getMockInstance<MockUserServiceInstance>(MockUserServiceInstance);
        NestTest.createTestingModule({
            controllers: [],
            components: [
                WorkshopsService,
                { provide: 'SalesforceService', useValue: this.mockSalesforceService },
                { provide: 'AuthService', useValue: this.mockAuthService },
                { provide: 'CacheService', useValue: this.mockCache },
                { provide: 'UserService', useValue: this.mockUserService }
            ]
        });
    }

    @Test('Component initialized correctly')
    public initialized() {
        const service = getService();

        Expect(service).toBeDefined();
        Expect(service.getAll).toBeDefined();
        Expect(service.get).toBeDefined();
        Expect(service.describe).toBeDefined();
        Expect(service.search).toBeDefined();
        Expect(service.facilitators).toBeDefined();
        Expect(service.create).toBeDefined();
        Expect(service.update).toBeDefined();
        Expect(service.upload).toBeDefined();
        Expect(service.delete).toBeDefined();
    }

    @TestCase(false, false, { permissions: [], role: { permissions: [] } })
    @TestCase(false, true, { permissions: [], role: { permissions: [] } })
    @TestCase(true, true, { permissions: [], role: { permissions: [] } })
    @TestCase(false, false, undefined)
    @TestCase(false, true, undefined)
    @TestCase(true, true, undefined)
    @AsyncTest('Get All Workshops')
    public async getAll(isPublic: boolean, refresh: boolean, user: any) {
        const service = getService();

        let expected;
        const actual = await service.getAll(isPublic, refresh, user);

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(Any).exactly(1).times;

        if (!isPublic) Expect(this.mockUserService.getWorkshopIds).toHaveBeenCalledWith(user).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.query).toHaveBeenCalledWith(Any).exactly(1).times;

            expected = this.mockSalesforceService.query.call().records;

            if (isPublic) Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, this.mockSalesforceService.query.call().records);
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
            expected = this.mockCache.getCache.call();
        }
        Expect(actual).toEqual(expected);
    }

    @TestCase('a1Sg0000001jXbg')
    @AsyncTest('Get a specific Workshop')
    public async get(id: string) {
        const service = getService();
        SpyOn(service, 'facilitators').andReturn([]);

        const actual = await service.get(id);

        Expect(this.mockSalesforceService.retrieve).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(service.facilitators).toHaveBeenCalledWith(id).exactly(1).times;

        const expected = this.mockSalesforceService.retrieve.call();
        expected.facilitators = [];
        Expect(actual).toEqual(expected);
    }

    @TestCase(true)
    @TestCase(false)
    @AsyncTest('Describe the Workshop__c object')
    public async describe(refresh: boolean) {
        const service = getService();

        let expected;
        const actual = await service.describe(refresh);

        const key = 'describeWorkshops';

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(key).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.describe).toHaveBeenCalledWith('Workshop__c').exactly(1).times;
            expected = this.mockSalesforceService.describe.call();
            Expect(this.mockCache.cache).toHaveBeenCalledWith(key, expected);
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(key).exactly(1).times;
            expected = this.mockCache.getCache.call();
        }
        Expect(actual).toEqual(expected);
    }

    @TestCase('D*', 'Id,Name', true)
    @TestCase('D*', 'Id,Name', false)
    @AsyncTest('Search for a Workshop')
    public async search(search: string, retrieve: string, refresh: boolean) {
        const service = getService();

        let expected;
        const actual = await service.search(search, retrieve, refresh);

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(Any).exactly(1).times;


        if (refresh) {
            Expect(this.mockSalesforceService.search).toHaveBeenCalledWith(Any).exactly(1).times;
            expected = this.mockSalesforceService.search.call().searchRecords;
            Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, expected);
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
            expected = this.mockCache.getCache.call();
        }
        Expect(actual).toEqual(expected);
    }

    @TestCase('a1Sg0000001jXbg')
    @AsyncTest('Get a Workshops facilitators')
    public async facilitators(id: string) {
        const service = getService();

        const actual = await service.facilitators(id);

        Expect(this.mockSalesforceService.query).toHaveBeenCalledWith(Any).exactly(1).times;

        const expected = this.mockSalesforceService.query.call().records;
        Expect(actual).toEqual(expected);
    }

    @TestCase({ Name: 'test' })
    @AsyncTest('Create a workshop')
    public async create(workshop: any) {
        const service = getService();
        const grantPermissions = SpyOn(service, 'grantPermissions');
        grantPermissions.andStub();

        const actual = await service.create(workshop);

        Expect(this.mockSalesforceService.create).toHaveBeenCalledWith(Any).exactly(1).times;

        const expected = this.mockSalesforceService.create.call()[0];
        workshop.Id = expected.id;

        Expect(grantPermissions).toHaveBeenCalledWith(workshop);
        Expect(actual).toEqual(expected);
    }

    @TestCase({ Id: 'a1Sg0000001jXbg', Name: 'test', facilitators: [] })
    @AsyncTest('Update a workshop')
    public async update(workshop) {
        const service = getService();
        SpyOn(service, 'facilitators').andReturn([]);

        const grantPermissions = SpyOn(service, 'grantPermissions');
        const removePermissions = SpyOn(service, 'removePermissions');
        grantPermissions.andStub();
        removePermissions.andStub();

        const actual = await service.update(workshop);

        Expect(this.mockSalesforceService.update).toHaveBeenCalledWith(Any).exactly(1).times;
        const expected = this.mockSalesforceService.update.call()[0];

        Expect(service.facilitators).toHaveBeenCalledWith(workshop.Id).exactly(1).times;

        Expect(grantPermissions).toHaveBeenCalledWith(workshop).exactly(1).times;
        Expect(removePermissions).toHaveBeenCalledWith(Any, Any).exactly(1).times;
        Expect(actual).toEqual(expected);
    }

    @TestCase('a1Sg0000001jXbg', 'uploadedFile', [new Buffer('test').toString('base64')])
    @AsyncTest('Attach a file to a Workshop__c record')
    public async upload(id: string, filename: string, files: string[]) {
        const service = getService();

        const actual = await service.upload(id, filename, files);

        Expect(this.mockSalesforceService.create).toHaveBeenCalledWith(Any).exactly(1).times;

        const expected = this.mockSalesforceService.create.call();

        Expect(actual).toEqual(expected);
    }

    @TestCase('a1Sg0000001jXbg')
    @AsyncTest('Delete a Workshop')
    public async delete(id: string) {
        const service = getService();

        const actual = await service.delete(id);
        Expect(this.mockSalesforceService.delete).toHaveBeenCalledWith(Any).exactly(1).times;

        const expected = this.mockSalesforceService.delete.call()[0];

        Expect(this.mockAuthService.deletePermission).toHaveBeenCalledWith(`/workshops/${id}`, Any(Number)).exactly(3).times;
        Expect(actual).toEqual(expected);
    }

}