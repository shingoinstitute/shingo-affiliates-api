import { Test as NestTest } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { FacilitatorsController } from './facilitators.controller';
import { SalesforceService, CacheService, AuthService } from '../../components';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';
import { mock, instance, when, anything } from 'ts-mockito';

const expectedReadAll = { totalSize: 0, done: true, records: [{Id: '003g000001VvwEZAAZ', AccountId: '001g000001glcsWAAQ', RecordType: { Name: 'Affiliate Instructor' }}] };
const expectedSFCreate = { id: '003g000001VvwEZAAZ', success: true, errors: [] };
const expectedAuthCreate = { id: 1, jwt: 'aoijhfdposaiud.eiopiepoeih.aoihdpoaihgpoihj', email: 'testemail@example.com' };
const expectedCreate = { id: expectedAuthCreate.id, jwt: expectedAuthCreate.jwt };
const expectedDescribe = {field: 'Some Field', why: 'SF Describe object is HUUUUGE!'};

class MockSFClient {
    
    public query(query, callback){
        return callback(null, { contents: JSON.stringify(expectedReadAll) });
    }

    public retrieve(query, callback){
        return callback(null, { contents: JSON.stringify(expectedReadAll.records) });
    }

    public create(data, callback){
        return callback(null, { contents: JSON.stringify([ expectedSFCreate ]) });
    }

    public update(data, callback){
        return callback(null, { contents: JSON.stringify([ expectedSFCreate ]) });        
    }

    public delete(data, callback){
        return callback(null, { contents: JSON.stringify([ expectedSFCreate ]) });        
    }

    public describe(data, callback){
        return callback(null, { contents: JSON.stringify(expectedDescribe) });
    }

    public search(data, callback){
        return callback(null, { contents: JSON.stringify({ searchRecords: expectedReadAll.records }) });
    }

}

class MockAuthClient {
    public createUser(data, callback) {
        return callback(null, expectedAuthCreate);
    }

    public addRoleToUser(data, callback) {
        return callback(null, { response: true });
    }
}

interface MockSfInstance {
    getClient() : MockSFClient;
}

interface MockCacheInstance {
    getCache(o : any) : any;
    isCached(o : any) : boolean;
    cache(o : any, v : any) : void;
}

interface MockAuthInstance {
    getClient() : MockAuthClient;
}

@TestFixture('Facilitators Controller')
export class FacilitatorsControllerFixture {

    private mockSfInstance : MockSfInstance;
    private mockCacheInstance : MockCacheInstance;
    private mockAuthInstance : MockAuthInstance;

    @Setup
    public Setup(){
        let mockSfService = mock(SalesforceService);
        let mockSfClient = new MockSFClient();
        
        when(mockSfService.getClient()).thenReturn(mockSfClient);
        
        this.mockSfInstance = instance(mockSfService);

        SpyOn(this.mockSfInstance, 'getClient');
        SpyOn(mockSfClient, 'query');
        SpyOn(mockSfClient, 'retrieve');
        SpyOn(mockSfClient, 'create');
        SpyOn(mockSfClient, 'update');
        SpyOn(mockSfClient, 'delete');
        SpyOn(mockSfClient, 'describe');
        SpyOn(mockSfClient, 'search');

        let mockCacheService = mock(CacheService);
        this.mockCacheInstance = instance(mockCacheService);
        SpyOn(this.mockCacheInstance, 'cache');
        SpyOn(this.mockCacheInstance, 'isCached').andReturn(true);

        let mockAuthService = mock(AuthService);
        let mockAuthClient = new MockAuthClient();

        when(mockAuthService.getClient()).thenReturn(mockAuthClient);

        this.mockAuthInstance = instance(mockAuthService);
        SpyOn(this.mockAuthInstance, 'getClient');
        SpyOn(mockAuthClient, 'createUser');
        SpyOn(mockAuthClient, 'addRoleToUser');

        NestTest.createTestingModule({
            controllers: [ FacilitatorsController ],
            components: [ 
                { provide: SalesforceService, useValue: this.mockSfInstance },
                { provide: CacheService, useValue: this.mockCacheInstance },
                { provide: AuthService, useValue: this.mockAuthInstance }
            ]
        });
    }

    @Test('Controller initilized correctly')
    public initialized(){
        const controller = NestTest.get<FacilitatorsController>(FacilitatorsController);

        Expect(controller).toBeDefined();
        Expect(controller.readAll).toBeDefined();
        Expect(controller.describe).toBeDefined();
        Expect(controller.search).toBeDefined();
        Expect(controller.read).toBeDefined();
        Expect(controller.create).toBeDefined();
        // Expect(controller.update).toBeDefined();
        // Expect(controller.delete).toBeDefined();
    }

    @TestCase('001g000001glcsWAAQ', 'true', 'Affiliate Manager')
    @TestCase('001g000001glcsWAAQ', 'false', 'Affiliate Manager')
    @TestCase('001g000001glcsWAAQ', '', 'Affiliate Manager')
    @TestCase('', 'true', 'Affiliate Manager')
    @TestCase('', 'false', 'Affiliate Manager')
    @TestCase('', '', 'Affiliate Manager')
    @TestCase('001g000001glcsWAAQ', 'true', 'Facilitator')
    @TestCase('001g000001glcsWAAQ', 'false', 'Facilitator')
    @TestCase('001g000001glcsWAAQ', '', 'Facilitator')
    @TestCase('', 'true', 'Facilitator')
    @TestCase('', 'false', 'Facilitator')
    @TestCase('', '', 'Facilitator')
    @AsyncTest('Read all facilitators')
    public async readAll(affId : string, refresh : string, role : string){
        const controller = NestTest.get<FacilitatorsController>(FacilitatorsController);

        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');
        SpyOn(this.mockCacheInstance, 'getCache').andReturn(expectedReadAll);

        let mockNext = function(error) { return Promise.resolve(error); }
        let mockSession = {
            user: {
                roles: [ { name: role } ]
            },
            affiliate: affId
        }
        let mockRequest = { session: mockSession };

        const actual = await controller.readAll(mockRequest, mockResponse, mockNext, affId, refresh);

        Expect(actual).toBeDefined();
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
        if(role === 'Facilitator' && affId === '') {
            Expect(actual).toEqual({error: "MISSING_FIELDS"})
            Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST).exactly(1).times;
        } else {
            Expect(actual).toEqual(expectedReadAll);
            Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(this.mockCacheInstance.isCached).toHaveBeenCalledWith(Any).exactly(1).times;
            if(refresh === 'true'){
                Expect(this.mockSfInstance.getClient().query).toHaveBeenCalled().exactly(1).times;
                Expect(this.mockCacheInstance.cache).toHaveBeenCalledWith(Any, Any).exactly(1).times;
                Expect(this.mockCacheInstance.getCache).not.toHaveBeenCalled();
            } else {
                Expect(this.mockCacheInstance.cache).not.toHaveBeenCalled();
                Expect(this.mockSfInstance.getClient().query).not.toHaveBeenCalled();
                Expect(this.mockCacheInstance.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
            }
        }
    }

    @TestCase('true')
    @TestCase('false')
    @AsyncTest('Describe Contact')
    public async describe(refresh){
        const controller = NestTest.get<FacilitatorsController>(FacilitatorsController);

        let mockRequest = {};
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');
        SpyOn(this.mockCacheInstance, 'getCache').andReturn(expectedDescribe);

        let mockNext = function(error) { return Promise.resolve(error); }

        const actual = await controller.describe(mockRequest, mockResponse, mockNext, refresh);

        Expect(actual).toBeDefined();
        Expect(actual).toEqual(expectedDescribe);
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
        Expect(this.mockCacheInstance.isCached).toHaveBeenCalledWith(Any).exactly(1).times;
        if(refresh === 'true'){
            Expect(this.mockSfInstance.getClient().describe).toHaveBeenCalled().exactly(1).times;
            Expect(this.mockCacheInstance.cache).toHaveBeenCalledWith(Any, Any).exactly(1).times;
            Expect(this.mockCacheInstance.getCache).not.toHaveBeenCalled();
        } else {
            Expect(this.mockSfInstance.getClient().describe).not.toHaveBeenCalled();
            Expect(this.mockCacheInstance.cache).not.toHaveBeenCalled();
            Expect(this.mockCacheInstance.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
        }
    }

    @TestCase('true', 'Affiliate Manager', '001g000001glcsWAAQ')
    @TestCase('false', 'Affiliate Manager', '001g000001glcsWAAQ')
    @TestCase('', 'Affiliate Manager', '001g000001glcsWAAQ')
    @TestCase('true', 'Affiliate Manager', '')
    @TestCase('false', 'Affiliate Manager', '')
    @TestCase('', 'Affiliate Manager', '')
    @TestCase('true', 'Facilitator', '001g000001glcsWAAQ')
    @TestCase('false', 'Facilitator', '001g000001glcsWAAQ')
    @TestCase('', 'Facilitator', '001g000001glcsWAAQ')
    @TestCase('true', 'Facilitator', '')
    @TestCase('false', 'Facilitator', '')
    @TestCase('', 'Facilitator', '')
    @AsyncTest('Search for facilitators')
    public async search(refresh : string, role : string, affId : string){
    const controller = NestTest.get<FacilitatorsController>(FacilitatorsController);

        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }
        let mockSession = {
            user: {
                roles: [ { name: role } ]
            },
            affiliate: affId
        }
        let mockRequest = { 
            session: mockSession,
            headers: {
                'x-affiliate': affId
            }
        };

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');
        SpyOn(this.mockCacheInstance, 'getCache').andReturn(expectedReadAll.records);

        let mockNext = function(error) { return Promise.resolve(error); }

        let s = '';
        let r = '';
        if(refresh !== ''){
            s = '*Anthing*';
            r = 'Id';
        } 

        const actual = await controller.search(mockRequest, mockResponse, mockNext, s, r, refresh);
        Expect(actual).toBeDefined();
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
        if(refresh === '' || (role === 'Facilitator' && affId === '')){
            Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(actual).toEqual({error: 'MISSING_FIELDS'})
            Expect(this.mockCacheInstance.isCached).not.toHaveBeenCalled();
        } else {
            Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
            Expect(actual).toEqual(expectedReadAll.records);
            Expect(this.mockCacheInstance.isCached).toHaveBeenCalledWith(Any).exactly(1).times;

            if(refresh === 'true'){
                Expect(this.mockSfInstance.getClient().search).toHaveBeenCalled().exactly(1).times;
                Expect(this.mockCacheInstance.cache).toHaveBeenCalledWith(Any, Any).exactly(1).times;
                Expect(this.mockCacheInstance.getCache).not.toHaveBeenCalled();
            } else {
                Expect(this.mockSfInstance.getClient().search).not.toHaveBeenCalled();
                Expect(this.mockCacheInstance.cache).not.toHaveBeenCalled();
                Expect(this.mockCacheInstance.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
            }
        }
    }

    @AsyncTest('Read a facilitator')
    public async read(){
        const controller = NestTest.get<FacilitatorsController>(FacilitatorsController);

        let mockRequest = {};
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');

        let mockNext = function(error) { return Promise.resolve(error); }
        
        const actual = await controller.read(mockRequest, mockResponse, mockNext, expectedReadAll.records[0].Id);
        Expect(actual).toBeDefined();
        Expect(actual).toEqual(expectedReadAll.records[0]);
        Expect(this.mockSfInstance.getClient().retrieve).toHaveBeenCalled().exactly(1).times;
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
    }

    @AsyncTest('Create a workshop')
    public async create(){
        const controller = NestTest.get<FacilitatorsController>(FacilitatorsController);

        let mockSession = { affiliate: '001g000001glcsWAAQ', user: { permissions: []}};
        let mockRequest = { session: mockSession};
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');

        let mockNext = function(error) { return Promise.resolve(error); }
        let mockBody = {
            AccountId: '001g000001glcsWAAQ',
            FirstName: 'Example',
            LastName: 'User',
            Email: 'exampleuser@example.com',
            password: 'password'
        }

        const actual = await controller.create(mockRequest, mockResponse, mockNext, mockBody);

        Expect(actual).toEqual(expectedCreate);
        Expect(this.mockSfInstance.getClient().create).toHaveBeenCalled().exactly(1).times;
        Expect(this.mockAuthInstance.getClient().createUser).toHaveBeenCalled().exactly(1).times;
        Expect(this.mockAuthInstance.getClient().addRoleToUser).toHaveBeenCalled().exactly(1).times;
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
    }
}