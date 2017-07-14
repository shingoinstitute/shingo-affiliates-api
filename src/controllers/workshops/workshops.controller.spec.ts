import { Test as NestTest } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { WorkshopsController } from './workshops.controller';
import { SalesforceService, CacheService } from '../../components';
import { Expect, Test, AsyncTest, TestFixture, Setup, SpyOn, Any, TestCase } from 'alsatian';
import { mock, instance, when, anything } from 'ts-mockito';

const expectedReadAll = { totalSize: 0, done: true, records: [{Id: 'a1Sg0000001jXbg'}] };
const expectedFacilitators = { totalSize: 0, done: true, records: [{Instructor__r: {Email: "email@example.com"}}] };
const expectedCreate = { id: 'a1Sg0000001jXbg', success: true, errors: [] };
const expectedDescribe = {field: 'Some Field', why: 'SF Describe object is HUUUUGE!'};

class MockSFClient {
    
    public query(query, callback){
        if(query.table === 'WorkshopFacilitatorAssociation__c') return callback(null, { contents: JSON.stringify(expectedFacilitators) });
        if(query.table === 'Workshop__c') return callback(null, { contents: JSON.stringify(expectedReadAll) });
        else return callback({error: 'UNKNOWN_TABLE', query});
    }

    public retrieve(query, callback){
        return callback(null, { contents: JSON.stringify(expectedReadAll.records) });
    }

    public create(data, callback){
        return callback(null, { contents: JSON.stringify([ expectedCreate ]) });
    }

    public update(data, callback){
        return callback(null, { contents: JSON.stringify([ expectedCreate ]) });        
    }

    public delete(data, callback){
        return callback(null, { contents: JSON.stringify([ expectedCreate ]) });        
    }

    public describe(data, callback){
        return callback(null, { contents: JSON.stringify(expectedDescribe) });
    }

    public search(data, callback){
        return callback(null, { contents: JSON.stringify({ searchRecords: expectedReadAll.records }) });
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

@TestFixture('Workshops Controller')
export class WorkshopsControllerFixture {

    private mockSfInstance : MockSfInstance;
    private mockCacheInstance : MockCacheInstance;

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

        NestTest.createTestingModule({
            controllers: [ WorkshopsController ],
            components: [ 
                { provide: SalesforceService, useValue: this.mockSfInstance },
                { provide: CacheService, useValue: this.mockCacheInstance }
            ]
        });
    }

    @Test('Controller initilized correctly')
    public initialized(){
        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

        Expect(controller).toBeDefined();
        Expect(controller.readAll).toBeDefined();
        Expect(controller.readPublic).toBeDefined();
        Expect(controller.describe).toBeDefined();
        Expect(controller.search).toBeDefined();
        Expect(controller.read).toBeDefined();
        Expect(controller.facilitators).toBeDefined();
        Expect(controller.create).toBeDefined();
        Expect(controller.update).toBeDefined();
        Expect(controller.delete).toBeDefined();
    }

    @AsyncTest('Read all workshops')
    public async readAll(){
        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

        let mockRequest = {};
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');

        let mockNext = function(error) { return Promise.resolve(error); }
        let mockSession = {
            user: {
                permissions: [{resource: `/workshops/${expectedReadAll.records[0].Id}`}],
                roles: [{permissions: [{resource: `/workshops/${expectedReadAll.records[0].Id}`}]}]
            }
        }
        const actual = await controller.readAll(mockRequest, mockResponse, mockNext, mockSession);

        Expect(actual).toBeDefined();
        Expect(actual).toEqual(expectedReadAll);
        Expect(this.mockSfInstance.getClient().query).toHaveBeenCalled().exactly(1).times;
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
    }

    @TestCase('true')
    @TestCase('false')
    @AsyncTest('Read all public workshops')
    public async readPublic(refresh){
        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

        let mockRequest = { };
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');
        SpyOn(this.mockCacheInstance, 'getCache').andReturn(expectedReadAll);

        let mockNext = function(error) { return Promise.resolve(error); }

        const actual = await controller.readPublic(mockRequest, mockResponse, mockNext, refresh);

        Expect(actual).toBeDefined();
        Expect(actual).toEqual(expectedReadAll);
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
        Expect(this.mockCacheInstance.isCached).toHaveBeenCalledWith(Any).exactly(1).times;
        if(refresh === 'true'){
            Expect(this.mockSfInstance.getClient().query).toHaveBeenCalled().exactly(1).times;
            Expect(this.mockCacheInstance.cache).toHaveBeenCalledWith(Any, Any).exactly(1).times;
            Expect(this.mockCacheInstance.getCache).not.toHaveBeenCalled();
        } else {
            Expect(this.mockSfInstance.getClient().query).not.toHaveBeenCalled();
            Expect(this.mockCacheInstance.cache).not.toHaveBeenCalled();
            Expect(this.mockCacheInstance.getCache).toHaveBeenCalledWith(Any).exactly(1).times;
        }
    }

    @TestCase('true')
    @TestCase('false')
    @AsyncTest('Describe Workshop__c')
    public async describe(refresh){
        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

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

    @TestCase('true')
    @TestCase('false')
    @TestCase('')
    @AsyncTest('Search for workshops')
    public async search(refresh : string){
    const controller = NestTest.get<WorkshopsController>(WorkshopsController);

        let mockRequest = {};
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

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
        if(refresh === ''){
            Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST).exactly(1).times;
            Expect(actual).toEqual({error: 'Missing search and retrieve  parameters!'})
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

    @AsyncTest('Read a workshop')
    public async read(){
        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

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

     @AsyncTest('Read the facilitators of a workshop')
    public async facilitators(){
        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

        let mockRequest = {};
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');

        let mockNext = function(error) { return Promise.resolve(error); }
        
        const actual = await controller.facilitators(mockRequest, mockResponse, mockNext, expectedReadAll.records[0].Id);

        Expect(actual).toEqual(expectedFacilitators);
        Expect(this.mockSfInstance.getClient().query).toHaveBeenCalled().exactly(1).times;
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
    }

    @AsyncTest('Create a workshop')
    public async create(){

        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

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
            Name: 'Test',
            Organizing_Affiliate__c: mockSession.affiliate,
            Start_Date__c: new Date(),
            End_Date__c: new Date()
        }

        const actual = await controller.create(mockRequest, mockResponse, mockNext, mockBody, mockSession);

        Expect(actual).toEqual(expectedCreate);
        Expect(this.mockSfInstance.getClient().create).toHaveBeenCalled().exactly(1).times;
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
    }
    
    @AsyncTest('Update a workshop')
    public async update(){

        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

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
            Id: expectedCreate.id,
            Name: 'Test',
            Organizing_Affiliate__c: mockSession.affiliate,
            Start_Date__c: new Date(),
            End_Date__c: new Date()
        }

        const actual = await controller.update(mockRequest, mockResponse, mockNext, mockBody.Id, mockBody, mockSession);

        Expect(actual).toEqual(expectedCreate);
        Expect(this.mockSfInstance.getClient().update).toHaveBeenCalled().exactly(1).times;
        Expect(this.mockSfInstance.getClient().query).toHaveBeenCalled().exactly(1).times;
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
    }

    @AsyncTest('delete a workshop')
    public async delete(){

        const controller = NestTest.get<WorkshopsController>(WorkshopsController);

        let mockSession = { affiliate: '001g000001glcsWAAQ', user: { permissions: [ { resource: `/workshops/${expectedCreate.id}`}], roles: [{ permissions: [{resource: `/workshops/${expectedReadAll.records[0].Id}`}]}]}};
        let mockRequest = { session: mockSession};
        let mockResponse = {
            json(o) { return Promise.resolve(o); },
            status(code) { return this; }
        }

        SpyOn(mockResponse, 'json');
        SpyOn(mockResponse, 'status');

        let mockNext = function(error) { return Promise.resolve(error); }

        const actual = await controller.delete(mockRequest, mockResponse, mockNext, expectedCreate.id);

        Expect(actual).toEqual(expectedCreate);
        Expect(this.mockSfInstance.getClient().delete).toHaveBeenCalled().exactly(1).times;
        Expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK).exactly(1).times;
        Expect(mockResponse.json).toHaveBeenCalled().exactly(1).times;
    }
}
