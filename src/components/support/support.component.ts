import { Inject, Injectable } from '@nestjs/common'
import { CacheService } from '../'
import { tryCache, retrieveResult } from '../../util'
import { SalesforceClient } from '@shingo/sf-api-client'
import { LoggerInstance } from 'winston'

// tslint:disable-next-line:class-name
interface Support_Page__c {
  Id: string
  Title__c: string
  Category__c: string
  Content__c: string
  Restricted_To__c: string
}

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
    @Inject('LoggerService') private log: LoggerInstance,
  ) {}

  async getAll(role: string, refresh = false) {
    const query = {
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
      query,
      () =>
        this.sfService.query<Support_Page__c>(query).then(d => d.records || []),
      refresh,
    )).filter(page => page.Restricted_To__c.includes(role))
  }

  async get(id: string, refresh = false) {
    const request = {
      object: 'Support_Page__c',
      ids: [id],
    }

    return tryCache(
      this.cache,
      request,
      () => this.sfService.retrieve(request).then(retrieveResult),
      refresh,
    )
  }

  /**
   * Describes the Support_Page__c object
   *
   * See the Salesforce documentation for more about 'describe'
   *
   * @param refresh Force the refresh of the cache
   */
  async describe(refresh = false) {
    const key = 'describeSupportPage'

    return tryCache(
      this.cache,
      key,
      () => this.sfService.describe('Support_Page__c'),
      refresh,
    )
  }

  async search(
    search: string,
    retrieve: string[],
    role: string,
    refresh = false,
  ) {
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Support_Page__c(${retrieve.join(',')})`,
    }

    return (await tryCache(
      this.cache,
      data,
      () =>
        this.sfService
          .search(data)
          .then(d => d.searchRecords as Support_Page__c[]),
      refresh,
    )).filter(page => page.Restricted_To__c.includes(role))
  }
}
