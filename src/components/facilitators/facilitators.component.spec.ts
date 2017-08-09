import { Test as NestTest } from '@nestjs/testing';
import { FacilitatorsService, LoggerService } from '../../components';
import { MockSalesforceServiceInstance, MockAuthServiceInstance, MockCacheServiceInstance, MockLoggerInstance } from '../../components/mock';
import { MockServiceFactory } from '../../factories';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';

function getService() {
    const service: FacilitatorsService = NestTest.get<FacilitatorsService>(FacilitatorsService);
    return service;
}

@TestFixture('Facilitators Service')
export class FacilitatorsServiceFixture {

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
                FacilitatorsService,
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
        Expect(service.create).toBeDefined();
        Expect(service.mapContact).toBeDefined();
        Expect(service.createOrMapAuth).toBeDefined();
        Expect(service.createNewAuth).toBeDefined();
        Expect(service.mapCurrentAuth).toBeDefined();
        Expect(service.update).toBeDefined();
        Expect(service.updateAuth).toBeDefined();
        Expect(service.delete).toBeDefined();
        Expect(service.deleteAuth).toBeDefined();
        Expect(service.unmapAuth).toBeDefined();
    }

    @TestCase({ role: { name: 'Affiliate Manager' } }, false, '')
    @TestCase({ role: { name: 'Affiliate Manager' } }, false, '0a00002340222')
    @TestCase({ role: { name: 'Affiliate Manager' } }, true, '')
    @TestCase({ role: { name: 'Affiliate Manager' } }, true, '0a00002340222')
    @TestCase({ role: { name: 'Facilitator' } }, false, '')
    @TestCase({ role: { name: 'Facilitator' } }, false, '0a00002340222')
    @TestCase({ role: { name: 'Facilitator' } }, true, '')
    @TestCase({ role: { name: 'Facilitator' } }, true, '0a00002340222')
    @AsyncTest('Get all Facilitators')
    public async getAll(user: any, refresh: boolean, affiliate: string) {
        const service = getService();

        let expected;
        const actual = await service.getAll(user, refresh, affiliate);

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(Any).exactly(1).times;

        if (refresh) {
            expected = [];
            Expect(this.mockSalesforceService.query).toHaveBeenCalledWith(Any).exactly(1).times;


            Expect(this.mockAuthService.getUsers).toHaveBeenCalledWith(Any(String)).exactly(1).times;
            Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, Any);
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
            expected = this.mockCache.getCache.call();

        }
        Expect(actual).toEqual(expected);

    }

    @TestCase(true)
    @TestCase(false)
    @AsyncTest('Describe the Contact object')
    public async describe(refresh: boolean) {
        const service = getService();

        let expected;
        const actual = await service.describe(refresh);

        const key = 'describeContact';

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(key).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.describe).toHaveBeenCalledWith('Contact').exactly(1).times;

            expected = this.mockSalesforceService.describe.call();

            Expect(this.mockCache.cache).toHaveBeenCalledWith(key, expected);
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(key);

            expected = this.mockCache.getCache.call();
        }

        Expect(actual).toEqual(expected);
    }

    @TestCase('D*', 'Id,Name', '', true)
    @TestCase('D*', 'Id,Name', '', false)
    @TestCase('D*', 'Id,Name', '02000asd303sf30', true)
    @TestCase('D*', 'Id,Name', '02000asd303sf30', false)
    @TestCase('D*', 'Id,Name', '02000asd303sF30', true)
    @TestCase('D*', 'Id,Name', '02000asd303sF30', false)
    @AsyncTest('Search for a Facilitator')
    public async search(search: string, retrieve: string, affiliate: string, refresh: boolean) {
        const service = getService();

        const searchRecords = [{
            Id: '0200sdf03030030',
            Name: 'Test user',
            RecordType: { Name: 'Affiliate Instructor' },
            AccountId: '02000asd303sf30'
        }];

        this.mockSalesforceService.search.andReturn({ searchRecords })

        let expected;
        const actual = await service.search(search, retrieve, affiliate, refresh);

        Expect(this.mockCache.isCached).toHaveBeenCalledWith(Any).exactly(1).times;

        if (refresh) {
            Expect(this.mockSalesforceService.search).toHaveBeenCalledWith(Any).exactly(1).times;
            if (affiliate === '' || affiliate === searchRecords[0].AccountId) Expect(this.mockAuthService.getUsers).toHaveBeenCalledWith(Any(String)).exactly(1).times;
            Expect(this.mockCache.cache).toHaveBeenCalledWith(Any, Any(Array)).exactly(1).times;
            expected = [];
        } else {
            Expect(this.mockCache.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
            expected = this.mockCache.getCache.call();
        }
        Expect(actual).toEqual(expected);
    }

    @TestCase('0200sdf03030030')
    @AsyncTest('Get a Facilitator')
    public async get(id: string) {
        const service = getService();

        this.mockAuthService.getUser.andReturn({});

        const record = {
            Id: id,
            Email: 'test.user@example.com'
        }

        this.mockSalesforceService.retrieve.andReturn([record]);

        const actual = await service.get(id);

        Expect(this.mockSalesforceService.retrieve).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(this.mockAuthService.getUser).toHaveBeenCalledWith(`user.email='${record.Email}'`).exactly(1).times;
        Expect(actual).toEqual(record);
    }

    @TestCase({ Email: 'test.email@example.com' })
    @AsyncTest('Create a Facilitator')
    public async create(user: any) {
        const service = getService();
        SpyOn(service, 'createOrMapAuth').andReturn(user);

        const actual = await service.create(user);

        Expect(this.mockSalesforceService.create).toHaveBeenCalledWith(Any).exactly(1).times;
        const record = this.mockSalesforceService.create.call()[0];
        Expect(service.createOrMapAuth).toHaveBeenCalledWith(record.id, user).exactly(1).times;
        Expect(actual).toEqual(user);
    }

    @TestCase('0200sdf03030030', { Email: 'test.email@example.com' }, false)
    @TestCase(undefined, undefined, true)
    @AsyncTest('Map an existing Contact to a new/current Auth')
    public async mapContact(id: string, user: any, noContactFound: boolean) {
        const service = getService();
        SpyOn(service, 'createOrMapAuth').andReturn(user);

        if (noContactFound) this.mockSalesforceService.retrieve.andReturn([]);

        try {
            const actual = await service.mapContact(id, user);

            Expect(this.mockSalesforceService.retrieve).toHaveBeenCalledWith(Any).exactly(1).times;
            Expect(this.mockSalesforceService.update).toHaveBeenCalledWith(Any).exactly(1).times;

            Expect(service.createOrMapAuth).toHaveBeenCalledWith(id, user).exactly(1).times;
            Expect(actual).toEqual(user);
        } catch (error) {
            Expect(this.mockSalesforceService.retrieve).toHaveBeenCalledWith(Any).exactly(1).times;
            Expect(error.error).toEqual('CONTACT_NOT_FOUND');
            Expect(noContactFound).toBeTruthy();
        }
    }

    @TestCase('0200sdf03030030', { Email: 'test.email@example.com', email: '' })
    @TestCase('0200sdf03030030', { Email: 'test.email@example.com', email: 'test.email@example.com' })
    @AsyncTest('Create or Map a Auth')
    public async createOrMap(id: string, user: any) {
        const service = getService();
        SpyOn(service, 'createNewAuth').andReturn({ email: user.Email });
        SpyOn(service, 'mapCurrentAuth').andReturn({ email: user.Email });

        this.mockAuthService.getUser.andReturn(user);

        const actual = await service.createOrMapAuth(id, user);

        Expect(this.mockAuthService.getUser).toHaveBeenCalledWith(`user.email='${user.Email}'`);
        if (user.email === '') {
            Expect(service.createNewAuth).toHaveBeenCalledWith(user.Email, Any, Any, id).exactly(1).times;
        } else {
            Expect(service.mapCurrentAuth).toHaveBeenCalledWith(user.Email, Any, id).exactly(1).times;
        }

        Expect(this.mockAuthService.grantPermissionToUser).toHaveBeenCalledWith(`affiliate -- ${user.AccountId}`, 1, Any);
        Expect(this.mockAuthService.grantPermissionToUser).toHaveBeenCalledWith(`workshops -- ${user.AccountId}`, 2, Any);

        Expect(actual).toEqual({ id, email: user.Email });
    }

    @TestCase('test.user@example.com', 'password', 1, '0200sdf03030030')
    @AsyncTest('Create a new Auth')
    public async createNewAuth(email: string, password: string, roleId: number, extId: string) {
        const service = getService();

        this.mockAuthService.createUser.andReturn({ id: 1, jwt: 'abcd' });

        const actual = await service.createNewAuth(email, password, roleId, extId);

        Expect(this.mockAuthService.createUser).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(this.mockAuthService.addRoleToUser).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(actual).toEqual({ jwt: 'abcd', id: 1 });
    }

    @TestCase('test.user@example.com', 1, '0200sdf03030030')
    @AsyncTest('Map a current Auth')
    public async mapCurrentAuth(email: string, roleId: number, extId: string) {
        const service = getService();

        this.mockAuthService.getUser.andReturn({ id: 1, jwt: 'abcd' });

        const actual = await service.mapCurrentAuth(email, roleId, extId);

        Expect(this.mockAuthService.getUser).toHaveBeenCalledWith(`user.email='${email}'`).exactly(1).times;
        Expect(this.mockAuthService.updateUser).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(this.mockAuthService.addRoleToUser).toHaveBeenCalledWith(Any).exactly(1).times;

        Expect(actual).toEqual({ jwt: 'abcd', id: 1 });
    }

    @TestCase({ Email: 'test.email@example.com' })
    @TestCase({})
    @AsyncTest('Update a Facilitator')
    public async update(user: any) {
        const service = getService();
        SpyOn(service, 'updateAuth').andReturn(true);

        let expected;
        const actual = await service.update(user);

        Expect(this.mockSalesforceService.update).toHaveBeenCalledWith(Any).exactly(1).times;
        const record = this.mockSalesforceService.update.call()[0];
        if (user.Email) {
            Expect(service.updateAuth).toHaveBeenCalledWith(user, Any(String)).exactly(1).times;
            expected = { salesforce: true, auth: service.updateAuth({}, ''), record };
        } else {
            expected = { salesforce: true, auth: false, record }
        }

        Expect(actual).toEqual(expected);
    }

    @TestCase({ Email: 'test.email@example.com' }, '', true)
    @TestCase({ Email: 'test.email@example.com' }, '', false)
    @AsyncTest('Update an Auth')
    public async updateAuth(user: any, extId: string, updated: boolean) {
        const service = getService();

        this.mockAuthService.updateUser.andReturn({ response: updated });

        const actual = await service.updateAuth(user, extId);
        Expect(this.mockAuthService.updateUser).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(actual).toEqual(updated);
    }

    @TestCase('0200sdf03030030')
    @AsyncTest('Delete a Facilitator')
    public async delete(id: string) {
        const service = getService();

        const actual = await service.delete(id);

        Expect(this.mockSalesforceService.delete).toHaveBeenCalledWith(Any).exactly(1).times;
        const expected = this.mockSalesforceService.delete.call()[0];

        Expect(actual).toEqual(expected);
    }

    @TestCase('0200sdf03030030', true)
    @TestCase('0200sdf03030030', false)
    @AsyncTest('Delete an Auth')
    public async deleteAuth(id: string, deleted: boolean) {
        const service = getService();

        this.mockAuthService.deleteUser.andReturn({ response: deleted })

        const actual = await service.deleteAuth(id);

        Expect(this.mockAuthService.deleteUser).toHaveBeenCalledWith(Any).exactly(1).times;
        Expect(actual).toEqual(deleted);
    }

    @TestCase('0200sdf03030030', true)
    @TestCase('0200sdf03030030', false)
    @AsyncTest('Unmap an auth')
    public async unmapAuth(id: string, updated: boolean) {
        const service = getService();

        this.mockAuthService.getUser.andReturn({ services: 'affiliate-portal' });
        this.mockAuthService.updateUser.andReturn({ response: updated });

        const actual = await service.unmapAuth(id);

        Expect(this.mockAuthService.getUser).toHaveBeenCalledWith(`user.extId='${id}'`).exactly(1).times;
        Expect(this.mockAuthService.updateUser).toHaveBeenCalledWith(Any).exactly(1).times;

        Expect(actual).toEqual(updated);
    }

    @TestCase('0200sdf03030030', 1, { roles: [] }, false)
    @TestCase('0200sdf03030030', 1, { roles: [{ name: 'test', service: 'affiliate-portal' }] }, false)
    @AsyncTest('Change a Facilitators Role')
    public async changeRole(id: string, roleId: number, user: any, added: boolean) {
        const service = getService();

        this.mockAuthService.getUser.andReturn(user)
        this.mockAuthService.addRoleToUser.andReturn({ response: added });

        const actual = await service.changeRole(id, roleId);

        Expect(this.mockAuthService.getUser).toHaveBeenCalledWith(`user.extId='${id}'`).exactly(1).times;
        Expect(this.mockAuthService.addRoleToUser).toHaveBeenCalledWith(Any).exactly(1).times;
        if (user.roles.length) Expect(this.mockAuthService.removeRoleFromUser).toHaveBeenCalledWith(Any).exactly(1).times;
        else Expect(this.mockAuthService.removeRoleFromUser).not.toHaveBeenCalled();
        Expect(actual).toEqual(added);
    }
}