import { Inject, Injectable } from '@nestjs/common'
import { CacheService } from '..'
import { Affiliate } from './affiliate'
import _ from 'lodash'
import { tryCache, RequireKeys } from '../../util'
import { SalesforceClient, QueryRequest } from '@shingo/shingo-sf-api'
import { AuthClient } from '@shingo/shingo-auth-api'
import { LoggerInstance } from 'winston'
import { CreateBody, UpdateBody } from '../../controllers/affiliates/affiliateInterfaces'

export { Affiliate }

/**
 * @desc A service to provide functions for working with Affiliates
 *
 * @export
 * @class AffiliatesService
 */
@Injectable()
export class AffiliatesService {

  constructor(
    private sfService: SalesforceClient,
    private authService: AuthClient,
    private cache: CacheService,
    @Inject('LoggerService') private log: LoggerInstance
  ) { }

  /**
   * @desc Get all Affiliates (minus McKinsey if <code>isPublic</code>).
   *
   * Queries the following fields:
   * ```
   * [
   *  "Id",
   *  "Name",
   *  "Summary__c",
   *  "Logo__c",
   *  "Page_Path__c",
   *  "Website",
   *  "Languages__c"
   * ]
   * ```
   *
   * @param isPublic Filter out private Affiliates
   * @param refresh Force the refresh of the cache
   */
  async getAll(isPublic = false, refresh = false): Promise<Affiliate[]> {
    const keyBase = 'AffiliatesService.getAll';
    const key = isPublic ? keyBase + '_public' : keyBase

    const clauseBase = `RecordType.DeveloperName='Licensed_Affiliate'`
    const query: QueryRequest = {
      fields: [
        'Id',
        'Name',
        'Summary__c',
        'Logo__c',
        'Page_Path__c',
        'Website',
        'Languages__c',
      ],
      table: 'Account',
      clauses: isPublic ? clauseBase + ` AND (NOT Name Like 'McKinsey%')` : clauseBase,
    }

    const affiliates = await tryCache(
      this.cache,
      key,
      () => this.sfService.query(query).then(q => q.records || []), refresh
    ) as Affiliate[]

    if (isPublic) {
      return affiliates
    }

    const roles = (await this.authService.getRoles(`role.name LIKE 'Course Manager -- %'`));

    return affiliates.filter(aff => roles.findIndex(role => role.name === `Course Manager -- ${aff.Id}`) !== -1);
  }

  /**
   * Get the facilitator with the given id.
   *
   * @param id Salesforce ID for an Account
   */
  get(id: string): Promise<RequireKeys<Affiliate, 'Id'>> {
    return tryCache(this.cache, id, async () => (await this.sfService.retrieve({ object: 'Account', ids: [id] }))[0])
  }

  /**
   * Uses the Salesforce REST API to describe the Account object.
   * See the Salesforce documentation for more about 'describe'
   *
   * @param refresh Force the refresh of the cache
   */
  describe(refresh = false) {
    // Set the key for the cache
    const key = 'describeAccounts'

    return tryCache(this.cache, key, () => this.sfService.describe('Account'), refresh)
  }

  /**
   * Executes a SOSL query to search for text on Accounts of record type Licensed Affiliate.
   *
   * Example response body:
   * ```
   * [
   *      {
   *          "Id": "003g000001VvwEZAAZ",
   *          "Name": "Test One",
   *      },
   *      {
   *          "Id": "003g000001VvwEZABA",
   *          "Name": "Test Two",
   *      },
   *      {
   *          "Id": "003g000001VvwEZABB",
   *          "Name": "Test Three",
   *      },
   *  ]
   * ```
   *
   * @param search SOSL search expression (i.e. '*Test*')
   * @param retrieve A list of the Account fields to retrieve (i.e. 'Id, Name')
   * @param refresh Force the refresh of the cache
   */
  search(search: string, retrieve: string[], refresh = false): Promise<Affiliate[]> {
    const newRetrieve = [...(new Set([...retrieve, 'RecordType.DeveloperName']))]
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Account(${newRetrieve.join()})`,
    }

    // If no cached result, use the shingo-sf-api to get result
    return tryCache(this.cache, data, async () => {
      const affiliates = (await this.sfService.search(data)).searchRecords as Affiliate[] || []
      return affiliates.filter(aff => aff.RecordType && aff.RecordType.DeveloperName === 'Licensed_Affiliate')
    }, refresh)
  }

  /**
   * Executes a SOSL query to search for Contacts that match the given AccountId,
   * and returns a list of Contacts that can be used as Course Managers.
   *
   * @param id A Salesforce AccountId.
   * @param search SOSL search expression (i.e. '*Test*').
   * @param retrieve A list of the Account fields to retrieve (i.e. 'Id, Name')
   * @param refresh Force the refresh of the cache
   */
  async searchCM(id: string, search: string, retrieve: string[], refresh = false): Promise<any[]> {
    const newRetrieve = [...(new Set([...retrieve, 'AccountId']))]

    const data = {
      search: `{${search}}`,
      retrieve: `Contact(${newRetrieve.join()})`,
    }

    return tryCache(this.cache, data, async () => {
      const cms = (await this.sfService.search(data)).searchRecords || []
      return cms.filter(cm => cm.AccountId === id)
    }, refresh)
  }

  /**
   * Creates a new Account of record type 'Licensed Affiliate' in Salesforce and corresponding permissions and roles.
   *
   * @param affiliate - Affiliate to create
   */
  async create(affiliate: CreateBody) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Account',
      records: [{ contents: JSON.stringify(affiliate) }],
    }

    const result = (await this.sfService.create(data))[0]

    if (result.success) {
      // tslint:disable-next-line:no-object-literal-type-assertion
      await this.map(result.id)
    }

    this.cache.invalidate('AffiliatesService.getAll')

    return result
  }

  /**
   * Create the corresponding permissions and roles for the Affiliate in the Shingo Auth API
   *
   * @param id Affiliate's Account Id
   */
  async map(id: string) {
    const cm = await this.authService.createRole({
      name: `Course Manager -- ${id}`,
      service: 'affiliate-portal',
    })

    for (const level of [0, 1, 2] as [0, 1, 2]) {
      this.authService.createPermission({ resource: `workshops -- ${id}`, level }).then(workshopPerm =>
        this.authService.grantPermissionToRole(workshopPerm.resource, 2, cm.id)
      )

      this.authService.createPermission({ resource: `affiliate -- ${id}`, level }).then(affiliatePerm =>
        this.authService.grantPermissionToRole(affiliatePerm.resource, 1, cm.id)
      )
    }

    // tslint:disable-next-line:variable-name
    const RecordTypeId = '012A0000000zpraIAA'

    await this.sfService.update({
      object: 'Account',
      records: [{ contents: JSON.stringify({ Id: id, RecordTypeId }) }],
    })

    this.cache.invalidate('AffiliatesService.getAll')
  }

  /**
   * Updates an Affiliate's fields:
   *
   * Returns the following:
   * ```
   * {
   *      "id": SalesforceId,
   *      "success": boolean,
   *      "errors": []
   *  }
   * ```
   *
   * @param affiliate - Affiliate's fields to update
   */
  async update(affiliate: UpdateBody) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Account',
      records: [{ contents: JSON.stringify(affiliate) }],
    }

    const result = (await this.sfService.update(data))[0]

    this.cache.invalidate(affiliate.Id)
    this.cache.invalidate('AffiliatesService.getAll')

    return result
  }

  /**
   * Removes all permissions, roles, and user logins associated with the Affiliate.
   *
   * @param id - Salesforce Id of the Account to "delete"
   */
  async delete(id: string) {
    const result = await this.get(id)
    result.RecordTypeId = '012A0000000zprfIAA'

    await this.deletePermissions(result.Id)

    await this.deleteRoles(result.Id)

    await this.deleteFacilitators(result.Id)

    const update = await this.update(_.pick(result, ['Id', 'RecordTypeId']))

    this.cache.invalidate(id)
    this.cache.invalidate('AffiliatesService.getAll')
    this.cache.invalidate('AffiliatesService.getAll_public')

    return update
  }

  /**
   * Delete the associated permissions of an Affiliate from the Auth API.
   * Namely 'workshops -- ID' and 'affiliate -- ID'
   *
   * @param id The Affilaite's Salesforce Id
   */
  private deletePermissions(id: string) {
    // promise resolves when all permissions are deleted for every level
    return Promise.all(([0, 1, 2] as [0, 1, 2]).map(level => {
      return [
        this.authService.deletePermission(`workshops -- ${id}`, level)
          .then(success => ({ perm: `workshops -- ${id}`, level, success })),
        this.authService.deletePermission(`affiliate -- ${id}`, level)
          .then(success => ({ perm: `affiliate -- ${id}`, level, success })),
      ]
    }).reduce((p, c) => [...p, ...c], []))
  }

  /**
   * Delete the Affiliate specific roles from the Auth API.
   * Namely, 'Course Manager -- ID'
   *
   * @param id The Affiliate's Salesforce Id
   */
  private async deleteRoles(id: string) {
    const cm = await this.authService.getRole(`role.name='Course Manager -- ${id}'`)
    return this.authService.deleteRole(cm)
  }

  /**
   * Delete the Affiliate's Facilitators logins from the Auth API.
   *
   * @param id The Affiliate's SalesforceId
   */
  private async deleteFacilitators(id: string) {
    const query: QueryRequest = {
        fields: ['Id'],
        table: 'Contact',
        clauses: `Facilitator_For__c='${id}' AND RecordType.DeveloperName='Affiliate_Instructor'`,
    }
    const facilitators = (await this.sfService.query(query)).records as any[] || [];
    return Promise.all(facilitators.map(fac =>
      this.authService.deleteUser({ extId: fac.Id })
        .then(success => ({ facilitator: fac.Id as string, success }))
    ))
  }
}
