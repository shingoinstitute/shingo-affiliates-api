import { Injectable } from '@nestjs/common'
import { CacheService } from '../'
import { tryCache, retrieveResult } from '../../util'
import { Support_Page__c } from '../../sf-interfaces/Support_Page__c.interface'
import { SalesforceService } from '../salesforce.component'

export const visibleTo = (roles: string[]) => (page: Support_Page__c) => {
  const restrictions = (page.Restricted_To__c || '').split(';')
  if (restrictions.length === 0) return true

  return restrictions.some(r => roles.includes(r))
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
    private sfService: SalesforceService,
    private cache: CacheService,
  ) {}

  getAll(roles: string[], refresh = false): Promise<Support_Page__c[]> {
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

    return tryCache(
      this.cache,
      query,
      () => this.sfService.query<Support_Page__c>(query),
      refresh,
    ).then(rs => rs.filter(visibleTo(roles)))
  }

  get(
    id: string,
    roles: string[],
    refresh = false,
  ): Promise<Support_Page__c | undefined> {
    const request = {
      object: 'Support_Page__c',
      ids: [id],
    }

    return tryCache(
      this.cache,
      request,
      () =>
        this.sfService.retrieve<Support_Page__c>(request).then(retrieveResult),
      refresh,
    ).then(r => {
      if (r === null) return undefined
      if (visibleTo(roles)(r)) {
        return r
      }
    })
  }

  /**
   * Describes the Support_Page__c object
   *
   * See the Salesforce documentation for more about 'describe'
   *
   * @param refresh Force the refresh of the cache
   */
  describe(refresh = false) {
    const key = 'describeSupportPage'

    return tryCache(
      this.cache,
      key,
      () => this.sfService.describe('Support_Page__c'),
      refresh,
    )
  }

  search(
    search: string,
    retrieve: string[],
    roles: string[],
    refresh = false,
  ): Promise<Support_Page__c[]> {
    // we need the Restricted_To__c for filtering
    const realRetrieve = [...new Set([...retrieve, 'Restricted_To__c'])]
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Support_Page__c(${realRetrieve.join(',')})`,
    }

    return tryCache(
      this.cache,
      data,
      () =>
        this.sfService
          .search(data)
          .then(d => d.searchRecords as Support_Page__c[]),
      refresh,
    ).then(rs => rs.filter(visibleTo(roles)))
  }
}
