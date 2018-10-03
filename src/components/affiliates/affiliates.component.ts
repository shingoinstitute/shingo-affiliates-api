import { Inject, Injectable, BadRequestException } from '@nestjs/common'
import { CacheService } from '..'
import { Affiliate } from './affiliate'
import _ from 'lodash'
import { tryCache, retrieveResult, Overwrite } from '../../util'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient, authservices as A } from '@shingo/auth-api-client'
import { LoggerInstance } from 'winston'
import {
  CreateBody,
  UpdateBody,
} from '../../controllers/affiliates/affiliateInterfaces'
import { flatten, cartesian } from '../../util/fp'
import { map } from '../../util/fp/generator'
import { Contact } from '../../sf-interfaces/Contact.interface'
import { Account } from '../../sf-interfaces/Account.interface'

export { Affiliate }

export const workshopResource = (id: string) => `workshops -- ${id}`
export const affiliateResource = (id: string) => `affiliate -- ${id}`

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
    @Inject('LoggerService') private log: LoggerInstance,
  ) {}

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
  async getAll(isPublic = false, refresh = false) {
    const keyBase = 'AffiliatesService.getAll'
    const key = isPublic ? keyBase + '_public' : keyBase

    type QueryResponse = Pick<
      Account,
      | 'Id'
      | 'Name'
      | 'Summary__c'
      | 'Logo__c'
      | 'Page_Path__c'
      | 'Website'
      | 'Languages__c'
    >

    const clauseBase = `RecordType.DeveloperName='Licensed_Affiliate'`
    const query = {
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
      clauses: isPublic
        ? clauseBase + ` AND (NOT Name Like 'McKinsey%')`
        : clauseBase,
    }

    return tryCache(
      this.cache,
      key,
      async () => {
        const affiliates = await this.sfService
          .query<QueryResponse>(query)
          .then(q => q.records || [])

        if (isPublic) {
          return affiliates
        }

        const roles = await this.authService.getRoles(
          `role.name LIKE 'Course Manager -- %'`,
        )

        return affiliates.filter(
          aff =>
            roles.findIndex(
              role => role.name === `Course Manager -- ${aff.Id}`,
            ) !== -1,
        )
      },
      refresh,
    )
  }

  /**
   * Get the facilitator with the given id.
   *
   * @param id Salesforce ID for an Account
   */
  get(id: string) {
    // FIXME: this can return any account in our salesforce instance, not just registered affiliates
    return tryCache(this.cache, id, () =>
      this.sfService
        .retrieve<Account>({ object: 'Account', ids: [id] })
        .then(retrieveResult)
        .then(r => (r === null ? undefined : r)),
    )
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

    return tryCache(
      this.cache,
      key,
      () => this.sfService.describe('Account'),
      refresh,
    )
  }

  /**
   * Executes a SOSL query to search for text on Accounts of record type Licensed Affiliate.
   *
   * @param search SOSL search expression (i.e. '*Test*')
   * @param retrieve A list of the Account fields to retrieve (i.e. 'Id, Name')
   * @param refresh Force the refresh of the cache
   */
  search(search: string, retrieve: string[], refresh = false) {
    const newRetrieve = [...new Set([...retrieve, 'RecordType.DeveloperName'])]
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Account(${newRetrieve.join()})`,
    }

    type SearchResult = Partial<Account>

    // If no cached result, use the shingo-sf-api to get result
    return tryCache(
      this.cache,
      data,
      async () => {
        const affiliates = await this.sfService
          .search<SearchResult>(data)
          .then(d => d.searchRecords || [])
        return affiliates.filter(
          (
            aff,
          ): aff is Overwrite<
            typeof aff,
            { RecordType: { DeveloperName: 'Licensed_Affiliate' } }
          > =>
            !!aff.RecordType &&
            aff.RecordType.DeveloperName === 'Licensed_Affiliate',
        )
      },
      refresh,
    )
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
  async searchCM(
    id: string,
    search: string,
    retrieve: string[],
    refresh = false,
  ) {
    const newRetrieve = [...new Set([...retrieve, 'AccountId'])]

    const data = {
      search: `{${search}}`,
      retrieve: `Contact(${newRetrieve.join()})`,
    }

    type SearchResult = Overwrite<Partial<Contact>, Pick<Contact, 'AccountId'>>

    return tryCache(
      this.cache,
      data,
      async () => {
        const cms = await this.sfService
          .search<SearchResult>(data)
          .then(d => d.searchRecords || [])
        return cms.filter(cm => cm.AccountId === id)
      },
      refresh,
    )
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
      records: [affiliate],
    }

    const result = (await this.sfService.create(data))[0]

    await this.map(result.id)

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

    const wResource = workshopResource(id)
    const aResource = affiliateResource(id)

    await Promise.all([
      // create/grant these permissions to the course manager role
      // grantPermissionToRole creates if role doesn't already exist
      this.authService.grantPermissionToRole(wResource, 2, cm.id!),
      this.authService.grantPermissionToRole(aResource, 1, cm.id!),
      // create other permissions
      flatten(
        [wResource, aResource].map(resource => {
          // level not created by the above grant call
          const level = resource === aResource ? 2 : 1

          return [
            this.authService.createPermission({ resource, level: 0 }),
            this.authService.createPermission({ resource, level }),
          ]
        }),
      ),
    ])

    // WHAT IS THIS MAGIC???
    // FIXME: Fix magic (and brittle) string
    // tslint:disable-next-line:variable-name
    const RecordTypeId = '012A0000000zpraIAA'

    await this.sfService.update({
      object: 'Account',
      records: [{ Id: id, RecordTypeId }],
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
      records: [affiliate],
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
    if (typeof result === 'undefined')
      throw new BadRequestException(`Account with id ${id} does not exist`)
    // NANI!?!?!?
    // FIXME: Fix magic (and brittle) string
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
    const pairs = cartesian([0, 1, 2] as [0, 1, 2], [
      workshopResource(id),
      affiliateResource(id),
    ])
    const ps = map(pairs, ([level, resource]) =>
      this.authService.deletePermission(resource, level).then(success => ({
        perm: resource,
        level,
        success,
      })),
    )

    // promise resolves when all permissions are deleted for every level
    return Promise.all([...ps])
  }

  /**
   * Delete the Affiliate specific roles from the Auth API.
   * Namely, 'Course Manager -- ID'
   *
   * @param id The Affiliate's Salesforce Id
   */
  private async deleteRoles(id: string) {
    const cm = await this.authService.getRole(
      `role.name='Course Manager -- ${id}'`,
    )
    if (!cm) {
      this.log.warn(
        `affiliate.deleteRoles(): Role 'Course Manager -- ${id}' does not exist`,
      )
      return true
    }

    return this.authService.deleteRole(cm as Required<A.Role>)
  }

  /**
   * Delete the Affiliate's Facilitators logins from the Auth API.
   *
   * @param id The Affiliate's SalesforceId
   */
  private async deleteFacilitators(id: string) {
    const query = {
      fields: ['Id'],
      table: 'Contact',
      clauses: `Facilitator_For__c='${id}' AND RecordType.DeveloperName='Affiliate_Instructor'`,
    }

    const facilitators =
      (await this.sfService.query<Pick<Contact, 'Id'>>(query)).records || []

    return Promise.all(
      facilitators.map(fac =>
        this.authService
          .deleteUser({ extId: fac.Id })
          .then(success => ({ facilitator: fac.Id, success })),
      ),
    )
  }
}
