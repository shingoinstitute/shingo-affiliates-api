import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import {
    CacheService,
} from '../'
import _ from 'lodash'
import * as jwt from 'jwt-simple'
import { SalesforceClient, QueryRequest } from '@shingo/shingo-sf-api'
import { AuthClient, Role, User } from '@shingo/shingo-auth-api'
import { LoggerInstance } from 'winston'
// tslint:disable-next-line:no-implicit-dependencies
import { tryCache } from '../../util'
import { MapBody } from '../../controllers/facilitators/facilitatorInterfaces';

interface Facilitator {
  Id: string
  FirstName: string
  LastName: string
  Email: string
  Title: string
  Account: {
    Id: string
    Name: string
  }
  Facilitator_For__r: {
    Id: string
    Name: string
  }
  Photograph__c: string
  Biography__c: string
}
interface AuthedFacilitator extends Facilitator {
  id: number
  role: Role | undefined
  lastLogin: string
  services: string
}

/**
 * @desc A service to provide functions for working with Facilitators
 *
 * @export
 * @class FacilitatorsService
 */
@Injectable()
export class FacilitatorsService {

  private getAllKey = 'FacilitatorsService.getAll';

  constructor(
    private sfService: SalesforceClient,
    private authService: AuthClient,
    private cache: CacheService,
    @Inject('LoggerService') private log: LoggerInstance
  ) { }

  /**
   * Get all facilitators for the affiliate specified.
   * All if affiliate === ''. The queried fields from Salesforce are as follows:
   *
   * [
   *  "Id",
   *  "FirstName",
   *  "LastName",
   *  "Email",
   *  "Title",
   *  "Account.Id",
   *  "Account.Name",
   *  "Facilitator_For__r.Id",
   *  "Facilitator_For__r.Name",
   *  "Photograph__c",
   *  "Biography__c"
   * ]
   *
   * @param refresh Force the refresh of the cache
   * @param affiliate SF Id of the affiliate to get facilitators for (or '' to get all facilitators)
   */
  getAll(refresh = false, affiliate = '') {

    const baseClause = `RecordType.DeveloperName='Affiliate_Instructor'`
    const query: QueryRequest = {
      fields: [
        'Id',
        'FirstName',
        'LastName',
        'Email',
        'Title',
        'Account.Id',
        'Account.Name',
        'Facilitator_For__r.Id',
        'Facilitator_For__r.Name',
        'Photograph__c',
        'Biography__c',
      ],
      table: 'Contact',
      clauses: affiliate !== '' ? baseClause + ` AND Facilitator_For__c='${affiliate}` : baseClause,
    }

    return tryCache(this.cache, this.getAllKey,
      async () =>  {
        const facilitators = (await this.sfService.query<Facilitator>(query)).records
        const authFacilitators = await this.addUserAuthInfo(facilitators)

        const authedFacs = authFacilitators.filter((f): f is AuthedFacilitator =>
          typeof (f as AuthedFacilitator).id !== 'undefined'
            && !!(f as AuthedFacilitator).services // the empty string is falsy, so we coerce to boolean
            && (f as AuthedFacilitator).services.includes('affiliate-portal')
        )

        return authedFacs
      }, refresh)
  }

  private addUserInfo<T extends object>(facilitator: T, user: User) {
    const newObj = {
      ...(facilitator as object),
      id: user.id,
      role: user.roles.find(role => role.service === 'affiliate-portal'),
      lastLogin: user.lastLogin,
      services: user.services,
    }

    return newObj as T & typeof newObj
  }

  private async addUserAuthInfo(facilitators: Facilitator[]) {
    const ids = facilitators.map(facilitator => `'${facilitator.Id}'`)
    const usersArr = await this.authService.getUsers(`user.extId IN (${ids.join()})`)
    const users = _.keyBy(usersArr, 'extId')
    const authFacilitators: Array<Facilitator | AuthedFacilitator> = facilitators.map(facilitator => {
      if (users[facilitator.Id]) {
        return this.addUserInfo(facilitator, users[facilitator.Id])
      }
      return facilitator
    })

    return authFacilitators
  }

  /**
   * Describes the Contact object
   *
   * See the Salesforce documentation for more about 'describe'
   *
   * @param refresh Force the refresh of the cache
   */
  describe(refresh = false) {
    const key = 'describeContact'

    return tryCache(this.cache, key,
      () => this.sfService.describe('Contact'),
      refresh
    )
  }

  /**
   * Executes a SOSL query to search for text on Contacts of record type Affiliate Instructor Salesforce.
   *
   * Example response body:
   * ```
   * [
   *      {
   *          "Id": "003g000001VvwEZAAZ",
   *          "Name": "Test One",
   *          "Email": "testone@example.com"
   *      },
   *      {
   *          "Id": "003g000001VvwEZABA",
   *          "Name": "Test Two",
   *          "Email": "testtwo@example.com"
   *      },
   *      {
   *          "Id": "003g000001VvwEZABB",
   *          "Name": "Test Three",
   *          "Email": "testthree@example.com"
   *      },
   *  ]
   * ```
   *
   * @param search Header 'x-search'. SOSL search expression (i.e. '*Test*').
   * @param retrieve Header 'x-retrieve'. List of the Contact fields to retrieve (i.e. 'Id, Name, Email')
   * @param isMapped Affiliate is mapped to a authentication user
   * @param affiliate The SF Id to filter results for (or '' for no filter)
   * @param refresh Force the refresh of the cache
   */
  search(
    search: string,
    retrieve: ReadonlyArray<string>,
    isMapped = true,
    affiliate = '',
    refresh = false
  ): Promise<any[]> {
    // // Generate the data parameter for the RPC call
    const realRetrieve = [...new Set([ ...retrieve, 'AccountId', 'RecordType.DeveloperName', 'Id'])]

    const data = {
      search: `{${search}}`,
      retrieve: `Contact(${realRetrieve.join()})`,
    }

    return tryCache(this.cache, data,
      async () => {
        const facilitators = (await this.sfService.search(data)).searchRecords || []
        const filteredFacs = facilitators.filter(result => {
          if (affiliate === '' && isMapped) {
            return result.RecordType && result.RecordType.DeveloperName === 'Affiliate_Instructor'
          } else if (affiliate !== '') {
            return result.AccountId === affiliate
              && result.RecordType && result.RecordType.DeveloperName === 'Affiliate_Instructor'
          } else return result
        })

        if (filteredFacs.length > 0) {
          // Add the facilitator's auth id to the object
          const authedFacs = await this.addUserAuthInfo(filteredFacs)
          const accountIds = authedFacs.filter(f => !!(f as any).AccountId).map((f: any) => `'${f.AccountId}'`)

          const query: QueryRequest = {
            fields: ['Id', 'Name'],
            table: 'Account',
            clauses: `Id IN (${accountIds.join()})`,
          }

          const affiliates = _.keyBy((await this.sfService.query(query)).records || [], 'Id');

          const affiliateMergedFacs = authedFacs.map(f => ({
            ...f,
            ...(
              (f as any).AccountId && typeof affiliates[(f as any).AccountId] !== 'undefined'
                ? { Account: affiliates[(f as any).AccountId] }
                : {}
              ),
          }))

          if (isMapped) {
            return affiliateMergedFacs.filter(f =>
              (f as any).services && (f as any).services.includes('affiliate-portal')
            )
          } else {
            return affiliateMergedFacs.filter(f =>
              typeof (f as any).services === 'undefined' || !(f as any).services.includes('affiliate-portal')
            );
          }
        }

        return facilitators
      }, refresh
    )
  }

  private getUserBy(data: { extId: string } | { email: string }): Promise<User> {
    const { extId, email } = data as { extId?: string, email?: string }

    if (extId) return this.authService.getUser(`user.extId='${extId}'`)
    else return this.authService.getUser(`user.email='${email}'`)
  }

  private tryFindUser(extId: string, email: string): Promise<User> {
    return this.getUserBy({ extId })
      .catch(() => {
        this.log.warn(`Failed to find user in auth DB via user's Salesforce ID. Attempting to find by email address...`)
        return this.getUserBy({ email })
      })
      .catch(e => {
        this.log.error('Failed to find user in auth DB using their Salesforce ID and their email address.');
        throw e
      })
  }

  /**
   * Get the facilitator with the given id
   *
   * @param id Salesforce ID for a Contact
   */
  async get(id: string): Promise<any> {
    // Create the data parameter for the RPC call
    const data = {
      object: 'Contact',
      ids: [id],
    }

    return tryCache(this.cache, data,
      async () => {
        const facilitator = await this.sfService.retrieve(data)[0]
        facilitator.Account = (await this.sfService.retrieve({ object: 'Account', ids: [facilitator.AccountId] }))[0]

        const user = await this.tryFindUser(facilitator.Id, facilitator.Email)

        if (!user.services || !user.services.includes('affiliate-portal')) throw new NotFoundException('', 'NOT_FOUND')

        const newFac = user.id !== 0 ? this.addUserInfo(facilitator, user) : facilitator

        _.merge(newFac, _.omit(user, ['email', 'password']))

        return newFac
      }
    )
  }

  /**
   * Creates a new Contact of record type 'Affiliate Instructor' in Salesforce and addes a user to the Shingo Auth api.
   * The user created for the Auth API will be assigned the role of roleId (defaults to 'Facilitator')
   *
   * Returns a response like:
   * ```
   * {
   *  "jwt": string,
   *  "id:" number
   * }
   * ```
   *
   * @param user User to create
   */
  async create(user): Promise<any> {
    const contact = _.omit(user, ['Id', 'password', 'roleId', 'role'])

    // Create the contact in Salesforce
    // what is this magic string???
    contact.RecordTypeId = '012A0000000zpqrIAA'

    const data = {
      object: 'Contact',
      records: [{ contents: JSON.stringify(contact) }],
    }

    const record = (await this.sfService.create(data))[0]

    if (!record.success) throw new Error('Failed to create user: ' + (record.errors || []).join('\n'))

    this.cache.invalidate(this.getAllKey)

    return this.createOrMapAuth(record.id, user)
  }

  /**
   * Maps an existing Contact record to a new/current login
   *
   * @param id  The Salesforce Id of the Contact to map
   * @param user The newly created user
   */
  async mapContact(id: string, user: MapBody & { password?: string }): Promise<any> {
    const data = {
      object: 'Contact',
      ids: [id],
    }

    const record = (await this.sfService.retrieve(data))[0];
    if (typeof record === 'undefined') throw new NotFoundException('', 'CONTACT_NOT_FOUND')

    // another magic string. Why
    record.RecordTypeId = '012A0000000zpqrIAA'
    const updateData = {
      object: 'Contact',
      records: [{ contents: JSON.stringify(_.merge(_.omit(record, ['Name']), user)) }],
    }

    const successObject = (await this.sfService.update(updateData))[0];

    this.cache.invalidate(this.getAllKey);

    return this.createOrMapAuth(id, user);
  }

  /**
   * Searches for an existing user with the same email.
   * If not found, one is created, else the 'affiliate-portal' service is added and permissions are granted.
   *
   * @param id Salesforce Id of the associated contact
   * @param user
   */
  async createOrMapAuth(id: string, user: MapBody & { password?: string }) {
    // FIXME: remove this use of global
    // tslint:disable-next-line:no-string-literal
    let roleId: number = global['facilitatorId']
    if (user.role) {
      const role = await this.authService.getRole(`name='${user.role.name}'`)
      if (role.id > 0) roleId = role.id
    }

    const initialAuth = await this.authService.getUser(`user.email='${user.Email}'`);

    const auth = initialAuth.email === ''
      ? await this.createNewAuth(user.Email, user.password!, roleId, id)
      : await this.mapCurrentAuth(user.Email, roleId, id)

    await this.authService.addRoleToUser({ userEmail: user.Email, roleId })

    await this.authService.grantPermissionToUser(`affiliate -- ${user.AccountId}`, 1, auth.id)
    await this.authService.grantPermissionToUser(`workshops -- ${user.AccountId}`, 2, auth.id)

    this.cache.invalidate(this.getAllKey)

    return { id, ...auth }
  }

  /**
   * Uses the Shingo Auth API to create a new login
   *
   * @param email
   * @param password
   * @param roleId
   * @param extId - Salesforce Id of the associated contact
   */
  createNewAuth(email: string, password: string, roleId: number, extId: string) {
    return this.authService.createUser({ email, password, services: 'affiliate-portal', extId })
      .then(user => {
        this.cache.invalidate(this.getAllKey);
        return { jwt: user.jwt, id: user.id };
      })
  }

  /**
   * Uses the Shingo Auth API to map a Salesforce contact to a current login
   *
   * @param userEmail
   * @param roleId
   * @param extId - Salesforce Id of the associated contact
   */
  async mapCurrentAuth(userEmail: string, roleId: number, extId: string) {
    const user = await this.authService.getUser(`user.email='${userEmail}'`);

    if (typeof user === 'undefined') throw new NotFoundException('', 'USER_NOT_FOUND')

    user.extId = extId;
    user.services = user.services === '' ? 'affiliate-portal' : user.services + ', affiliate-portal'
    await this.authService.updateUser(user)

    this.cache.invalidate(this.getAllKey)

    return { jwt: user.jwt, id: user.id }
  }

  /**
   * Updates a facilitator's fields.
   *
   * Returns the following:
   * ```
   * {
   *      "record": {
   *        "id": SalesforceId,
   *        "success": boolean,
   *        "errors": []
   *      },
   *      "salesforce": boolean,
   *      "auth": boolean
   *  }
   * ```
   *
   * @param user The facilitator object to update
   */
  async update(user): Promise<any> {
    const contact = _.omit(user, ['password', 'Account', 'Facilitator_For__r', 'id', 'role'])

    if (user.role) {
      const role = await this.authService.getRole(`role.name='${user.role.name}'`)
      await this.changeRole(user.Id, role.id)
    }

    // Get current user data to check if email address is being udpated.
    const prevUser: any = (await this.sfService.retrieve({ object: 'Contact', ids: [ user.Id ] }))[0]

    // Update Contact record in Salesforce
    const data = {
      object: 'Contact',
      records: [{ contents: JSON.stringify(contact) }],
    }

    const record = (await this.sfService.update(data))[0]

    if (!record.success) throw new Error('Failed to update user: ' + (record.errors || []).join('\n'))

    // If the users email or password changed, update their user auth
    const auth = (user.Email !== prevUser.Email) || user.password
      ? await this.updateAuth(user, record.id)
      : false

    // Update permissions
    if (user.AccountId !== prevUser.AccountId) {
      await this.authService.revokePermissionFromUser(`affiliate -- ${prevUser.AccountId}`, 1, user.id)
      await this.authService.revokePermissionFromUser(`workshops -- ${prevUser.AccountId}`, 2, user.id)
      await this.authService.grantPermissionToUser(`affiliate -- ${user.AccountId}`, 1, user.id)
      await this.authService.grantPermissionToUser(`workshops -- ${user.AccountId}`, 2, user.id)
    }

    this.cache.invalidate(user.Id)
    this.cache.invalidate(this.getAllKey)

    return { salesforce: true, auth, record }
  }

  /**
   * Update the associated login of a facilitator
   *
   * @param user Facilitator's fields to update
   * @param extId Facilitator's Contact ID
   */
  async updateAuth(user: any, extId: string): Promise<boolean> {
    const set: { extId: string, email?: string, password?: string } = { extId }
    if (user.Email) set.email = user.Email
    if (user.password) set.password = user.password

    const updated = await this.authService.updateUser(set)

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return updated
  }

  /**
   * Deletes a facilitator.
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
   *
   * @param id - Salesforce Id of the Contact to delete
   */
  async delete(id: string) {
    // Create the data parameter for the RPC call
    const data = {
      object: 'Contact',
      ids: [id],
    }

    const record = (await this.sfService.delete(data))[0];

    this.cache.invalidate(id);
    this.cache.invalidate(this.getAllKey);

    return record
  }

  /**
   * @desc Delete a login from the Shingo Auth API
   *
   * @param extId - Facilitator's Contact Id
   */
  async deleteAuth(extId: string): Promise<boolean> {
    const deleted = await this.authService.deleteUser({ extId })

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return deleted
  }

  /**
   * Remove the Affiliate Portal as service for a login
   *
   * @param extId - Facilitator's Contact Id
   */
  async unmapAuth(extId: string): Promise<boolean> {
    const user = await this.authService.getUser(`user.extId='${extId}'`)

    if (typeof user === 'undefined') throw new NotFoundException('', 'USER_NOT_FOUND')

    const services = user.services.split(',').map(s => s.trim())
    const newServices = services.map(s => s === 'affiliate-portal' ? 'af-p-disabled' : s)
    user.services = newServices.join()

    this.log.warn('Disabling %j', user)
    const updated = await this.authService.updateUser(user)

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return updated
  }

  /**
   * Change a Facilitator's role to the role specified by roleId
   * If a role exists that belongs to the Affiliate Portal, it is removed first
   *
   * @param extId - Facilitator's Contact Id
   * @param roleId - Id of the role to change to
   */
  async changeRole(extId: string, roleId): Promise<boolean> {
    const user = await this.authService.getUser(`user.extId='${extId}'`)

    if (user.id === 0) throw new NotFoundException('', 'USER_NOT_FOUND')

    const currentRole = user.roles.filter(role => role.service === 'affiliate-portal')[0];

    const set = { userEmail: user.email, roleId }

    // remove any existing affiliate-portal role
    if (typeof currentRole !== 'undefined') {
      await this.authService.removeRoleFromUser({ userEmail: user.email, roleId: currentRole.id })
    }

    const added = await this.authService.addRoleToUser(set)

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return added
  }

  /**
   * Generates a reset token for a user
   * @param email user email
   */
  async generateReset(email: string): Promise<string> {
    // FIXME: this really should be a function in authService
    const user = await this.authService.getUser(`user.email='${email}'`)

    if (user.id === 0) throw new NotFoundException('', 'USER_NOT_FOUND')

    const expires = Date.now() + 1000 * 60 * 60
    const token = jwt.encode({ expires, email }, process.env.JWT_SECRET || 'ilikedogges')

    user.resetToken = token

    await this.authService.updateUser(_.omit(user, ['password']))

    return token
  }

  /**
   * Resets a password given a reset token and the new password
   * @param token jwt token
   * @param password new password
   */
  async resetPassword(token: string, password: string): Promise<User> {
    // FIXME: this should be a function in authService
    const user = await this.authService.getUser(`user.resetToken='${token}'`)

    // Why are they checking for the user with id 0 everywhere?
    if (user.id === 0) throw new NotFoundException('', 'USER_NOT_FOUND')

    const decoded = jwt.decode(token, process.env.JWT_SECRET || 'ilikedogges')

    if (new Date(decoded.expires) < new Date()) throw new ForbiddenException('', 'RESET_TOKEN_EXPIRED')

    await this.authService.updateUser({ id: user.id, password })

    return user
  }

}
