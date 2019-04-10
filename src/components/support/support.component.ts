import { Injectable } from '@nestjs/common'
import { CacheService } from '../'
import SalesforceService from '../salesforce/new-salesforce.component'
import { SFQ } from '../../util/salesforce'
import { tryCache } from '../../util'
import { Support_Page__c } from '../../sf-interfaces'

/**
 * @desc A service to provide functions for working with Support Pages
 *
 * @export
 * @class SupportService
 */
@Injectable()
export class SupportService {
  private queryFn: <T>(x: string) => Promise<T[]>
  constructor(
    private sfService: SalesforceService,
    private cache: CacheService
  ) {
    this.queryFn = this.sfService.query.bind(this.sfService)
  }

  getAll(role: string, refresh: boolean = false) {
    const key = 'SupportService.getAll'
    const query = new SFQ('Support_Page__c')
      .select('Id', 'Title__c', 'Category__c', 'Content__c', 'Restricted_To__c')
      .where(`Application__c='Affiliate Portal'`)

    return tryCache(
      this.cache,
      key,
      async () => {
        const pages = (await query.query(this.queryFn)) || []
        return pages.filter(
          page => !page.Restricted_To__c || page.Restricted_To__c.includes(role)
        )
      },
      refresh
    )
  }

  get(id: string, refresh: boolean = false) {
    const request = {
      object: 'Support_Page__c',
      ids: [id],
    }

    return tryCache(
      this.cache,
      request,
      async () => {
        const [page] = await this.sfService.retrieve<Support_Page__c>(request)
        return page
      },
      refresh
    )
  }

  /**
   * @desc Uses the Salesforce REST API to describe the Support_Page__c object. See the Salesforce documentation for more about 'describe'
   *
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @memberof SupportService
   */
  describe(refresh: boolean = false) {
    const key = 'describeSupportPage'

    return tryCache(
      this.cache,
      key,
      () => this.sfService.describe('Support_Page__c'),
      refresh
    )
  }

  search(
    search: string,
    retrieve: string,
    role: string,
    refresh: boolean = false
  ) {
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Support_Page__c(${retrieve})`,
    }

    return tryCache(
      this.cache,
      data,
      async () => {
        const { searchRecords: pages = [] } = await this.sfService.search<
          Partial<Support_Page__c>
        >(data)
        return pages.filter(
          page => !page.Restricted_To__c || page.Restricted_To__c.includes(role)
        )
      },
      refresh
    )
  }
}
