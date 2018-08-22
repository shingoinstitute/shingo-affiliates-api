import { Inject, Injectable } from '@nestjs/common';
import {
    CacheService,
    LoggerService
} from '../';
import { tryCache } from '../../util';
import { SalesforceClient, QueryRequest, IdRequest, SearchRequest } from '@shingo/shingo-sf-api';

/**
 * @desc A service to provide functions for working with Support Pages
 *
 * @export
 * @class SupportService
 */
@Injectable()
export class SupportService {

    constructor(
      private sfService: SalesforceClient,
      private cache: CacheService,
      private log: LoggerService
    ) { }

    public async getAll(role: string, refresh: boolean = false): Promise<any[]> {
        const query: QueryRequest = {
            fields: [
                'Id',
                'Title__c',
                'Category__c',
                'Content__c',
                'Restricted_To__c',
            ],
            table: 'Support_Page__c',
            clauses: `Application__c='Affiliate Portal'`,
        }

        return (await tryCache(
          this.cache,
          query, () => this.sfService.query(query).then(d => d.records || []),
          refresh
        )).filter((page: any) => page.Restricted_To__c.includes(role));
    }

    public async get(id: string, refresh: boolean = false): Promise<any> {
        const request: IdRequest = {
            object: 'Support_Page__c',
            ids: [id],
        }

        return tryCache(this.cache, request, () => this.sfService.retrieve(request).then(d => d[0]), refresh);
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

        return tryCache(this.cache, key, () => this.sfService.describe('Support_Page__c'), refresh);
    }

    public async search(search: string, retrieve: string, role: string, refresh: boolean = false): Promise<any[]> {
        // Generate the data parameter for the RPC call
        const data: SearchRequest = {
            search: `{${search}}`,
            retrieve: `Support_Page__c(${retrieve})`,
        }

        return (await tryCache(this.cache, data, () => this.sfService.search(data).then(d => d.searchRecords), refresh))
            .filter(page => page.Restricted_To__c.includes(role));
    }
}
