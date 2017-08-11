import { Test as NestTest } from '@nestjs/testing';
import { AffiliatesService, LoggerService } from '../../components';
import { MockSalesforceServiceInstance, MockAuthServiceInstance, MockCacheServiceInstance, MockLoggerInstance } from '../../components/mock';
import { MockServiceFactory } from '../../factories';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';

function getService() {
    const service: AffiliatesService = NestTest.get<AffiliatesService>(AffiliatesService);
    return service;
}

@TestFixture('Affiliates Service')
export class AffiliatesServiceFixture {

    private mockSalesforceService: MockSalesforceServiceInstance;
    private mockAuthService: MockAuthServiceInstance;
    private mockCache: MockCacheServiceInstance;

    @Setup
    public Setup() {
        this.mockSalesforceService = MockServiceFactory.getMockInstance<MockSalesforceServiceInstance>(MockSalesforceServiceInstance);
        this.mockAuthService = MockServiceFactory.getMockInstance<MockAuthServiceInstance>(MockAuthServiceInstance);
        this.mockCache = MockServiceFactory.getMockInstance<MockCacheServiceInstance>(MockCacheServiceInstance);
        NestTest.createTestingModule({
            controllers: [],
            components: [
                AffiliatesService,
                { provide: 'SalesforceService', useValue: this.mockSalesforceService },
                { provide: 'AuthService', useValue: this.mockAuthService },
                { provide: 'CacheService', useValue: this.mockCache },
                { provide: 'LoggerService', useValue: MockServiceFactory.getMockInstance<MockLoggerInstance>(MockLoggerInstance) }
            ]
        });
    }

    @Test('Component initialized correctly')
    public initialized() {
        const service = getService();

        Expect(service).not.toBeNull();
        Expect(service.getAll).toBeDefined();
        Expect(service.get).toBeDefined();
        Expect(service.describe).toBeDefined();
        Expect(service.search).toBeDefined();
        Expect(service.searchCM).toBeDefined();
        Expect(service.create).toBeDefined();
        Expect(service.map).toBeDefined();
        Expect(service.update).toBeDefined();
        Expect(service.delete).toBeDefined();
    }

    @TestCase(false, false)
    @TestCase(false, true)
    @TestCase(true, false)
    @TestCase(true, true)
    @AsyncTest('Get all Affiliates')
    public async getAll(isPublic: boolean, refresh: boolean) {
        const service = getService();

        let expected;
        const actual = await service.getAll(isPublic, refresh);

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(Any).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.query).toHaveBeenCalledWith(Any).exactly(1).times;
            expected = this.mockSalesforceService.query.call().records;

            if (isPublic) Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, expected);
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(Any).exactly(1).times;

            expected = this.mockCache.getCache.call()
        }

        Expect(actual).toEqual(expected);
    }

    @TestCase('003c00000dsFFaa')
    @AsyncTest('Get an Affiliate')
    public async get(id: string) {
        const service = getService();

        const actual = await service.get(id);

        Expect(this.mockSalesforceService.retrieve).toHaveBeenCalledWith(Any).exactly(1).times;

        const expected = this.mockSalesforceService.retrieve.call()[0];

        Expect(actual).toEqual(expected);
    }

    @TestCase(false)
    @TestCase(true)
    @AsyncTest('Describe the Account object')
    public async describe(refresh: boolean) {
        const service = getService();

        let expected;
        const actual = await service.describe(refresh);
        const key = 'describeAccounts';

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(key).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.describe).toHaveBeenCalledWith('Account').exactly(1).times;

            expected = this.mockSalesforceService.describe.call();

            Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, expected).exactly(1).times;
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(key).exactly(1).times;

            expected = this.mockCache.getCache.call();
        }

        Expect(actual).toEqual(expected);

    }

    @TestCase('D*', 'Id,Name', false)
    @TestCase('D*', 'Id,Name', true)
    @AsyncTest('Search for an Affiliate')
    public async search(search: string, retrieve: string, refresh: boolean) {
        const service = getService();

        this.mockSalesforceService.search.andReturn({ searchRecords: [{ RecordType: { Name: 'Licensed Affiliate' } }] });

        let expected;
        const actual = await service.search(search, retrieve, refresh);

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(Any).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.search).toHaveBeenCalledWith(Any).exactly(1).times;

            expected = this.mockSalesforceService.search.call().searchRecords;

            Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, Any);
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(Any).exactly(1).times;

            expected = this.mockCache.getCache.call();
        }

        Expect(actual).toEqual(expected);
    }

    @TestCase('003c00000dsFFaa', 'D*', 'Id,Name', true)
    @TestCase('003c00000dsFFaa', 'D*', 'Id,Name', false)
    @AsyncTest('Search for a Course Manager')
    public async searchCM(id: string, search: string, retrieve: string, refresh: boolean) {
        const service = getService();

        this.mockSalesforceService.search.andReturn({ searchRecords: [{ AccountId: id }] });

        let expected;
        const actual = await service.searchCM(id, search, retrieve, refresh);

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(Any).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.search).toHaveBeenCalledWith(Any).exactly(1).times;

            expected = this.mockSalesforceService.search.call().searchRecords;

            Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, Any).exactly(1).times;
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(Any).exactly(1).times;

            expected = this.mockCache.getCache.call();
        }

        Expect(actual).toEqual(expected);
    }

    @TestCase({})
    @AsyncTest('Create an Affiliate')
    public async create(affiliate: any) {
        const service = getService();
        SpyOn(service, 'map').andStub();

        const actual = await service.create(affiliate);

        Expect(this.mockSalesforceService.create).toHaveBeenCalledWith(Any).exactly(1).times;

        const expected = this.mockSalesforceService.create.call()[0];

        Expect(service.map).toHaveBeenCalledWith(expected.id).exactly(1).times;

        Expect(actual).toEqual(expected);
    }

    @TestCase('003c00000dsFFaa')
    @AsyncTest('Map an existing Affiliate')
    public async map(id: string) {
        const service = getService();

        const cm = { id: 1 };
        const perm = { resource: `affiliate -- ${id}` };

        this.mockAuthService.createRole.andReturn(cm);
        this.mockAuthService.createPermission.andReturn(perm);

        const actual = await service.map(id);

        Expect(this.mockAuthService.createRole).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(this.mockAuthService.createPermission).toHaveBeenCalledWith(Any).exactly(6).times;
        Expect(this.mockAuthService.grantPermissionToRole).toHaveBeenCalledWith(perm.resource, Any(Number), cm.id).exactly(6).times;

        Expect(actual).not.toBeDefined();
    }

    @TestCase({})
    @AsyncTest('Update an Affiliate')
    public async update(affiliate: any) {
        const service = getService();

        const actual = await service.update(affiliate);

        Expect(this.mockSalesforceService.update).toHaveBeenCalledWith(Any).exactly(1).times;

        const expected = this.mockSalesforceService.update.call()[0];

        Expect(actual).toEqual(expected);
    }

    @TestCase('003c00000dsFFaa')
    @AsyncTest('"Delete" an Affilaite')
    public async delete(id: string) {
        const service = getService();
        SpyOn(service, "get").andReturn({ Id: id });
        SpyOn(service, "update").andReturn({ id });
        const deletePermissions = SpyOn(service, "deletePermissions");
        const deleteRoles = SpyOn(service, "deleteRoles")
        const deleteFacilitators = SpyOn(service, "deleteFacilitators");

        this.mockSalesforceService.query.andReturn({ records: [{ Id: '' }] });

        const actual = await service.delete(id);

        Expect(service.get).toHaveBeenCalledWith(id).exactly(1).times;
        Expect(deletePermissions).toHaveBeenCalledWith(id).exactly(1).times;
        Expect(deleteRoles).toHaveBeenCalledWith(id).exactly(1).times;
        Expect(deleteFacilitators).toHaveBeenCalledWith(id).exactly(1).times;
        Expect(service.update).toHaveBeenCalledWith(Any).exactly(1).times;

        // Delete Permissions
        Expect(this.mockAuthService.deletePermission).toHaveBeenCalledWith(Any(String), Any(Number)).exactly(6).times;

        // Delete Roles
        Expect(this.mockAuthService.getRole).toHaveBeenCalledWith(`role.name='Course Manager -- ${id}'`).exactly(1).times;
        Expect(this.mockAuthService.deleteRole).toHaveBeenCalled().exactly(1).times;

        // Delete Facilitators
        Expect(this.mockSalesforceService.query).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(this.mockAuthService.deleteUser).toHaveBeenCalledWith(Any).exactly(1).times;

        Expect(actual).toEqual({ id });
    }

}