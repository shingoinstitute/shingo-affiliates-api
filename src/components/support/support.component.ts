import { Component, Inject } from '@nestjs/common';
import {
    SalesforceService, CacheService,
    SFQueryObject, LoggerService
} from '../';

/**
 * @desc A service to provide functions for working with Support Pages
 * 
 * @export
 * @class SupportService
 */
@Component()
export class SupportService {

    constructor( @Inject('SalesforceService') private sfService: SalesforceService = new SalesforceService(),
        @Inject('CacheService') private cache: CacheService = new CacheService(),
        @Inject('LoggerService') private log: LoggerService = new LoggerService()) { }

    public async getAll(role: string, refresh: boolean = false): Promise<any[]> {
        let query = {
            action: "SELECT",
            fields: [
                "Id",
                "Title__c",
                "Category__c",
                "Content__c",
                "Restricted_To__c"
            ],
            table: "Support_Page__c",
            clauses: `Application__c='Affiliate Portal'`
        }

        let pages;
        if (!this.cache.isCached(query) || refresh) {
            pages = (await this.sfService.query(query as SFQueryObject)).records as any;
            this.cache.cache(query, pages);
        } else {
            pages = this.cache.getCache(query);
        }

        pages = pages.filter(page => page.Restricted_To__c.includes(role));

        return Promise.resolve(pages);
    }

    public async get(id: string, refresh: boolean = false): Promise<any> {
        let request = {
            object: 'Support_Page__c',
            ids: [id]
        }

        let page;
        if (!this.cache.isCached(request) || refresh) {
            page = (await this.sfService.retrieve(request))[0] as any;
            this.cache.cache(request, page);
        } else {
            page = this.cache.getCache(request);
        }

        return Promise.resolve(page);
    }

    /**
     * @desc Uses the Salesforce REST API to describe the Support_Page__c object. See the Salesforce documentation for more about 'describe'
     * 
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @returns {Promise<any>} 
     * @memberof SupportService
     */
    public async describe(refresh: boolean = false): Promise<any> {
        const key = 'describeSupportPage';

        if (!this.cache.isCached(key) || refresh) {
            const describeObject = await this.sfService.describe('Support_Page__c');

            this.cache.cache(key, describeObject);

            return Promise.resolve(describeObject);
        } else {
            return Promise.resolve(this.cache.getCache(key));
        }
    }

    public async search(search: string, retrieve: string, role: string, refresh: boolean = false): Promise<any[]> {
        // Generate the data parameter for the RPC call
        const data = {
            search: `{${search}}`,
            retrieve: `Support_Page__c(${retrieve})`
        }

        // If no cached result, use the shingo-sf-api to get result
        let pages;
        if (!this.cache.isCached(data) || refresh) {
            pages = (await this.sfService.search(data)).searchRecords as any[] || [];

            // Cache results
            this.cache.cache(data, pages);

        }
        // else return the cached result
        else {
            pages = this.cache.getCache(data);
        }

        pages = pages.filter(page => page.Restricted_To__c.includes(role));

        return Promise.resolve(pages);
    }
}