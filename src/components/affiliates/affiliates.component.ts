import { Injectable } from '@nestjs/common'
import { AuthService, CacheService } from '../'
import { SalesforceService } from '../salesforce/new-salesforce.component'
import { Affiliate } from './affiliate'
import { tryCache } from '../../util'
import { Contact, Account } from '../../sf-interfaces'
import { SFQ } from '../../util/salesforce'
import { SuccessResult } from 'jsforce'
import { RecordTypeService } from '../recordtype/RecordType.component'

export const workshopResource = (id: string) => `workshops -- ${id}`
export const affiliateResource = (id: string) => `affiliate -- ${id}`

export { Affiliate }

/**
 * @desc A service to provide functions for working with Affiliates
 *
 * @export
 * @class AffiliatesService
 */
@Injectable()
export class AffiliatesService {
  private queryFn: <T>(x: string) => Promise<T[]>

  constructor(
    private sfService: SalesforceService,
    private recordTypes: RecordTypeService,
    private authService: AuthService = new AuthService(),
    private cache: CacheService = new CacheService()
  ) {
    this.queryFn = this.sfService.query.bind(this.sfService)
  }

  /**
   * @desc Get all AFfiliates (minus McKinsey if <code>isPublic</code>). Queries the following fields:<br><br>
   * <code>[<br>
   *  &emsp;"Id",<br>
   *  &emsp;"Name",<br>
   *  &emsp;"Summary__c",<br>
   *  &emsp;"Logo__c",<br>
   *  &emsp;"Page_Path__c",<br>
   *  &emsp;"Website",<br>
   *  &emsp;"Languages__c"<br>
   * ]</code>
   *
   * @param {boolean} [isPublic=false] - Filter out private Affiliates
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @returns {Promise<Affiliate[]>}
   * @memberof AffiliatesService
   */
  getAll(isPublic: boolean = false, refresh: boolean = false) {
    let key = 'AffiliatesService.getAll'
    let where = "RecordType.DeveloperName='Licensed_Affiliate'"
    if (isPublic) {
      key += '_public'
      where += " AND (NOT Name LIKE 'McKinsey%')"
    }
    const query = new SFQ('Account')
      .select(
        'Id',
        'Name',
        'Summary__c',
        'Logo__c',
        'Page_Path__c',
        'Website',
        'Languages__c'
      )
      .where(where)

    return tryCache(
      this.cache,
      key,
      async () => {
        const affiliates = await query.query(this.queryFn)
        if (isPublic) return affiliates

        const { roles } = (await this.authService.getRoles(
          `role.name LIKE 'Course Manager -- %'`
        )) as { roles: Array<{ name: string }> }

        return affiliates.filter(aff =>
          roles.find(role => role.name === `Course Manager -- ${aff.Id}`)
        )
      },
      refresh
    )
  }

  /**
   * @desc Get the facilitator with the id passed at the parameter :id. The following fields are returned:<br><br>
   * <code>[<br>
   * TODO: Add fields that are returned<br>
   * ]</code>
   *
   * @param {string} id - Salesforce ID for an Account
   * @returns {Promise<Affiliate>}
   * @memberof AffiliatesService
   */
  get(id: string): Promise<Affiliate> {
    return tryCache(this.cache, id, async () => {
      const [affiliate] = await this.sfService.retrieve({
        object: 'Account',
        ids: [id],
      })
      return affiliate
    })
  }

  /**
   * @desc Uses the Salesforce REST API to describe the Account object. See the Salesforce documentation for more about 'describe'
   *
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @memberof AffiliatesService
   */
  describe(refresh = false) {
    // Set the key for the cache
    const key = 'describeAccounts'

    // If no cached result, use the shingo-sf-api to get the result
    return tryCache(
      this.cache,
      key,
      () => this.sfService.describe('Account'),
      refresh
    )
  }

  /**
   * @desc Executes a SOSL query to search for text on Accounts of record type Licensed Affiliate. Example response body:<br><br>
   * <code>[<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "003g000001VvwEZAAZ",<br>
   *          &emsp;&emsp;"Name": "Test One",<br>
   *      &emsp;},<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "003g000001VvwEZABA",<br>
   *          &emsp;&emsp;"Name": "Test Two",<br>
   *      &emsp;},<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "003g000001VvwEZABB",<br>
   *          &emsp;&emsp;"Name": "Test Three",<br>
   *      &emsp;},<br>
   *  ]</code>
   *
   * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Test*').
   * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Account fields to retrieve (i.e. 'Id, Name')
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @memberof AffiliatesService
   */
  search(search: string, retrieve: string, refresh: boolean = false) {
    if (!retrieve.includes('RecordType.DeveloperName'))
      retrieve += ', RecordType.DeveloperName'
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Account(${retrieve})`,
    }

    return tryCache(
      this.cache,
      data,
      async () => {
        const { searchRecords: affiliates = [] } = await this.sfService.search<
          Partial<Account>
        >(data)
        return affiliates.filter(
          aff =>
            aff.RecordType &&
            aff.RecordType.DeveloperName === 'Licensed_Affiliate'
        )
      },
      refresh
    )
  }

  /**
   * @desc Executes a SOSL query to search for Contacts that match the given AccountId, and returns a list of Contacts that can be used as Course Managers.
   * @param {string} id - A Salesforce AccountId.
   * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Test*').
   * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Account fields to retrieve (i.e. 'Id, Name')
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   */
  searchCM(
    id: string,
    search: string,
    retrieve: string,
    refresh: boolean = false
  ) {
    if (!retrieve.includes('AccountId')) retrieve += ', AccountId'
    const data = {
      search: `{${search}}`,
      retrieve: `Contact(${retrieve})`,
    }

    return tryCache(
      this.cache,
      data,
      async () => {
        const { searchRecords: cms = [] } = await this.sfService.search<
          Partial<Contact>
        >(data)
        return cms.filter(cm => cm.AccountId === id)
      },
      refresh
    )
  }

  /**
   * @desc Creates a new Account of record type 'Licensed Affiliate' in Salesforce and corresponding permissions and roles. Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"id": SalesforceId,<br>
   *      &emsp;"success": boolean,<br>
   *      &emsp;"errors": []<br>
   *  }</code>
   *
   * @param {Affiliate} affiliate - Affiliate to create
   * @memberof AffiliatesService
   */
  async create(affiliate: Affiliate) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Account',
      records: [affiliate],
    }

    const [result] = await this.sfService.create(data)
    await this.map({ Id: result.id } as Affiliate)

    this.cache.invalidate('AffiliatesService.getAll')

    return result
  }

  /**
   * @desc Create the corresponding permissions and roles for the Affiliate in the Shingo Auth API.
   *
   * @param {string} id - Affiliate's Account Id
   * @memberof AffiliatesService
   */
  async map(affiliate: Affiliate) {
    const cm = await this.authService.createRole({
      name: `Course Manager -- ${affiliate.Id}`,
      service: 'affiliate-portal',
    })
    for (const level of [0, 1, 2] as const) {
      const workshopPerm = await this.authService.createPermission({
        resource: `workshops -- ${affiliate.Id}`,
        level,
      })
      await this.authService.grantPermissionToRole(
        workshopPerm.resource,
        2,
        cm.id
      )

      const affiliatePerm = await this.authService.createPermission({
        resource: `affiliate -- ${affiliate.Id}`,
        level,
      })
      await this.authService.grantPermissionToRole(
        affiliatePerm.resource,
        1,
        cm.id
      )
    }

    affiliate.RecordTypeId = await this.recordTypes.get('Licensed_Affiliate')
    await this.sfService.update({ object: 'Account', records: [affiliate] })
    this.cache.invalidate('AffiliatesService.getAll')
  }

  /**
   * @desc Updates an Affiliate's fields: Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"id": SalesforceId,<br>
   *      &emsp;"success": boolean,<br>
   *      &emsp;"errors": []<br>
   *  }</code>
   *
   * @param {Affiliate} affiliate - Affiliate's fields to update
   * @returns {Promise<SFSuccessObject>}
   * @memberof AffiliatesService
   */
  async update(affiliate: Partial<Account> & { Id: string }) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Account',
      records: [affiliate],
    }

    const [result] = await this.sfService.update(data)

    this.cache.invalidate(affiliate.Id!)
    this.cache.invalidate('AffiliatesService.getAll')

    return result
  }

  /**
   * @desc Removes all permissions, roles, and user logins associated with the Affiliate. Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"id": SalesforceId,<br>
   *      &emsp;"success": boolean,<br>
   *      &emsp;"errors": []<br>
   *  }</code>
   *
   * @param {string} id - Salesforce Id of the Account to "delete"
   * @memberof AffiliatesService
   */
  async delete(id: string) {
    let r: SuccessResult | undefined
    const RecordTypeId = await this.recordTypes.get('Standard_Org')

    try {
      r = await this.update({ Id: id, RecordTypeId })
    } catch {
      console.error(`Unable to update record type for Affiliate with id ${id}`)
    }

    if (r) {
      await this.deletePermissions(id)
      await this.deleteRoles(id)
      await this.deleteFacilitators(id)

      this.cache.invalidate(id)
      this.cache.invalidate('AffiliatesService.getAll')
      this.cache.invalidate('AffiliatesService.getAll_public')
    }
  }

  /**
   * @desc Delete the associated permissions of an Affiliate from the Auth API. Namely 'workshops -- ID' and 'affiliate -- ID'
   *
   * @private
   * @param {SalesforceId} id - The Affilaite's Salesforce Id
   * @memberof AffiliatesService
   */
  private async deletePermissions(id: string) {
    for (const level of [0, 1, 2] as const) {
      await this.authService.deletePermission(`workshops -- ${id}`, level)
      await this.authService.deletePermission(`affiliate -- ${id}`, level)
    }
  }

  /**
   * @desc Delete the Affiliate specific roles from the Auth API. Namely, 'Course Manager -- ID'
   *
   * @private
   * @param {SalesforceId} id - The Affiliate's Salesforce Id
   * @memberof AffiliatesService
   */
  private async deleteRoles(id: string) {
    const cm = await this.authService.getRole(
      `role.name='Course Manager -- ${id}'`
    )
    await this.authService.deleteRole(cm)
  }

  /**
   * @desc Delete the Affiliate's Facilitators logins from the Auth API.
   *
   * @private
   * @param {SalseforceId} id - The Affiliate's SalesforceId
   * @memberof AffiliatesService
   */
  private async deleteFacilitators(id: string) {
    const query = new SFQ('Contact')
      .select('Id')
      .where(
        `Facilitator_For__c='${id}' AND RecordType.DeveloperName='Affiliate_Instructor'`
      )

    const facilitators = (await query.query(this.queryFn)) || []
    await Promise.all(
      facilitators.map(fac => this.authService.deleteUser({ extId: fac.Id }))
    )
  }
}
