import { Inject, Injectable, BadRequestException } from '@nestjs/common'
import { CacheService } from '../'
import _ from 'lodash'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient, authservices as A } from '@shingo/auth-api-client'
import { LoggerInstance } from 'winston'
// tslint:disable-next-line:no-implicit-dependencies
import { tryCache, retrieveResult } from '../../util'
import {
  MapBody,
  CreateBody,
  UpdateBody,
} from '../../controllers/facilitators/facilitatorInterfaces'
import { EnsureRoleService } from '../ensurerole.component'
import { Contact } from '../../Contact.interface'
import {
  workshopResource,
  affiliateResource,
} from '../affiliates/affiliates.component'

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

type AddUserInfo<T extends object> = T & {
  id: A.User['id']
  roles: A.Role[]
  lastLogin: A.User['lastLogin']
  services: A.User['services']
}

/**
 * @desc A service to provide functions for working with Facilitators
 *
 * @export
 * @class FacilitatorsService
 */
@Injectable()
export class FacilitatorsService {
  private getAllKey = 'FacilitatorsService.getAll'

  constructor(
    private sfService: SalesforceClient,
    private authService: AuthClient,
    private cache: CacheService,
    @Inject('LoggerService') private log: LoggerInstance,
    private ensure: EnsureRoleService,
  ) {}

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
    const query = {
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
      clauses:
        affiliate !== ''
          ? baseClause + ` AND Facilitator_For__c='${affiliate}'`
          : baseClause,
    }

    return tryCache(
      this.cache,
      this.getAllKey,
      async () => {
        const facilitators = (await this.sfService.query<Facilitator>(query))
          .records
        const authFacilitators = await this.addUserAuthInfo(facilitators)

        const authedFacs = authFacilitators.filter(
          (f): f is AddUserInfo<Facilitator> =>
            typeof (f as AddUserInfo<Facilitator>).id !== 'undefined' &&
            !!(f as AddUserInfo<Facilitator>).services && // the empty string is falsy, so we coerce to boolean
            (f as AddUserInfo<Facilitator>).services!.includes(
              'affiliate-portal',
            ),
        )

        return authedFacs
      },
      refresh,
    )
  }

  private addUserInfo<T extends object>(
    facilitator: T,
    user: A.User,
  ): AddUserInfo<T> {
    const newObj = {
      ...(facilitator as object),
      id: user.id,
      roles: (user.roles || []).filter(r => r.service === 'affiliate-portal'),
      lastLogin: user.lastLogin,
      services: user.services,
    }

    return newObj as T & typeof newObj
  }

  private async addUserAuthInfo<T extends { Id: string } = Facilitator>(
    facilitators: T[],
  ) {
    const ids = facilitators.map(facilitator => `'${facilitator.Id}'`)
    const usersArr = await this.authService.getUsers(
      `user.extId IN (${ids.join()})`,
    )
    const users = _.keyBy(usersArr, 'extId')
    const authFacilitators: Array<T | AddUserInfo<T>> = facilitators.map(
      facilitator => {
        if (users[facilitator.Id]) {
          return this.addUserInfo(facilitator, users[facilitator.Id])
        }
        return facilitator
      },
    )

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

    return tryCache(
      this.cache,
      key,
      () => this.sfService.describe('Contact'),
      refresh,
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
    refresh = false,
  ) {
    // // Generate the data parameter for the RPC call
    const realRetrieve = [
      ...new Set([...retrieve, 'AccountId', 'RecordType.DeveloperName', 'Id']),
    ]

    const data = {
      search: `{${search}}`,
      retrieve: `Contact(${realRetrieve.join()})`,
    }

    interface RetrieveResult {
      Id: string
      AccountId: string
      RecordType: {
        DeveloperName: string
      }
    }
    interface QueryResult {
      Id: string
      Name: string
    }

    type AddAccount<T> = T & { Account?: QueryResult }

    return tryCache(
      this.cache,
      data,
      async (): Promise<
        | Array<AddAccount<AddUserInfo<RetrieveResult>>>
        | Array<AddAccount<RetrieveResult>>
      > => {
        /* this method does way too much, but I don't know enough about how it is used to refactor it
          1. We request the Contacts using the search data and filter to correct facilitators
          2. We get the authentication info for each facilitator if it exists
          3. Using the account Ids from the facilitators, we request associated Account objects from salesforce
          4. We add the account data to every facilitator under the Account key
          5. If isMapped is true, return only the facilitators that have associated authentication info
          6. Otherwise return only the facilitators that don't have associated authentication info
        */

        // Step 1
        const facilitators = await this.sfService
          .search<RetrieveResult>(data)
          .then(r => r.searchRecords || [])

        const filteredFacs = facilitators.filter(result => {
          if (!isMapped) return !!result

          return (
            // if affiliate is not the empty string, make sure AccountId is equal to affiliate
            (result.AccountId === affiliate || affiliate === '') &&
            // make sure contact is is an Affiliate_Instructor
            result.RecordType &&
            result.RecordType.DeveloperName === 'Affiliate_Instructor'
          )
        })

        if (filteredFacs.length === 0) return []

        // Step 2
        // Add the facilitator's auth id to the object
        const authedFacs = await this.addUserAuthInfo(filteredFacs)

        // Step 3
        const accountIds = authedFacs
          // why are we filtering on accountId? it should always be truthy
          .filter(f => !!f.AccountId)
          .map(f => `'${f.AccountId}'`)

        // what is the point of this request?
        // TODO: we could add Account.Id and Account.Name to the retrieve fields above and remove step 3 and 4
        const query = {
          fields: ['Id', 'Name'],
          table: 'Account',
          clauses: `Id IN (${accountIds.join()})`,
        }

        // Step 4
        const affiliates = _.keyBy(
          await this.sfService
            .query<QueryResult>(query)
            .then(r => r.records || []),
          'Id',
        )

        const affiliateMergedFacs = authedFacs.map(f => {
          const newFac: AddAccount<typeof f> = { ...f }

          if (f.AccountId && typeof affiliates[f.AccountId] !== 'undefined') {
            newFac.Account = affiliates[f.AccountId]
          }

          return newFac
        })

        return isMapped
          ? // Step 5
            affiliateMergedFacs.filter(
              (f): f is AddAccount<AddUserInfo<RetrieveResult>> =>
                !!(f as AddUserInfo<RetrieveResult>).services &&
                (f as AddUserInfo<RetrieveResult>).services!.includes(
                  'affiliate-portal',
                ),
            )
          : // Step 6
            affiliateMergedFacs.filter(
              (f): f is AddAccount<RetrieveResult> =>
                typeof (f as AddUserInfo<RetrieveResult>).services ===
                  'undefined' ||
                !(f as AddUserInfo<RetrieveResult>).services!.includes(
                  'affiliate-portal',
                ),
            )
      },
      refresh,
    )
  }

  private getUserBy(data: { extId: string } | { email: string }) {
    const { extId, email } = data as { extId?: string; email?: string }

    if (extId) return this.authService.getUser(`user.extId='${extId}'`)
    else return this.authService.getUser(`user.email='${email}'`)
  }

  private tryFindUser(
    extId: string,
    email: string,
  ): Promise<A.User | undefined> {
    return this.getUserBy({ extId })
      .then(u => u || this.getUserBy({ email }))
      .then(u => {
        if (typeof u === 'undefined') {
          this.log.warn(
            `Failed to find user {email: ${email}, extId: ${extId}} in auth DB using their Salesforce ID and their email address.`,
          )
          // throw new Error('Failed to find user by Salesforce ID and email')
        }
        return u
      })
  }

  /**
   * Get the facilitator with the given id
   *
   * @param id Salesforce ID for a Contact
   */
  async get(id: string) {
    // Create the data parameter for the RPC call
    const data = {
      object: 'Contact',
      ids: [id],
    }

    return tryCache(this.cache, data, async () => {
      const facilitator:
        | (Contact & { Account?: any })
        | null = await this.sfService
        .retrieve<Contact>(data)
        .then(retrieveResult)

      if (facilitator === null) return undefined

      facilitator.Account = await this.sfService
        .retrieve({
          object: 'Account',
          ids: [facilitator.AccountId],
        })
        .then(retrieveResult)

      const user = await this.tryFindUser(facilitator.Id, facilitator.Email)
      if (!user) return undefined

      if (!user.services || !user.services.includes('affiliate-portal'))
        return undefined

      const newFac =
        // why are we doing something different for user 0? User 0 doesn't even exist in the production db
        user.id !== 0 ? this.addUserInfo(facilitator, user) : facilitator

      // why are we merging if we just called addUserInfo? that should return an object with most user info merged
      _.merge(newFac, _.omit(user, ['email']))

      return newFac
    })
  }

  /**
   * Creates a new Contact of record type 'Affiliate Instructor' in Salesforce and adds a user to the Shingo Auth api.
   * The user created for the Auth API will be assigned the role of roleId (defaults to 'Facilitator')
   *
   * @param user User to create
   */
  async create(user: CreateBody) {
    const contact = _.omit(user, ['Id', 'password', 'roleId', 'role'])

    const data = {
      object: 'Contact',
      // Create the contact in Salesforce
      // what is this magic string???
      records: [{ ...contact, RecordTypeId: '012A0000000zpqrIAA' }],
    }

    const record = (await this.sfService.create(data))[0]

    this.cache.invalidate(this.getAllKey)

    return this.createOrMapAuth(record.id, user)
  }

  /**
   * Maps an existing Contact record to a new/current login
   *
   * @param id  The Salesforce Id of the Contact to map
   * @param user The newly created user
   */
  async mapContact(id: string, user: MapBody) {
    const data = {
      object: 'Contact',
      ids: [id],
    }

    const record = await this.sfService
      .retrieve<Contact>(data)
      .then(retrieveResult)

    if (typeof record === 'undefined' || record === null)
      // we really shouldn't be throwing HTTPExceptions outside of controllers
      throw new BadRequestException('', 'CONTACT_NOT_FOUND')

    // another magic string. Why
    record.RecordTypeId = '012A0000000zpqrIAA'
    const updateData = {
      object: 'Contact',
      // FIXME: I really don't think we should be doing this merging here
      // user only has AccountId and Email, which should already be set on record
      // also, I don't think its necessary to get the whole record Contact just to update the RecordTypeId field
      records: [
        _.merge(_.omit(record, ['Name']), _.omit(user, 'password', 'role')),
      ],
    }

    await this.sfService.update(updateData)

    this.cache.invalidate(this.getAllKey)

    return this.createOrMapAuth(id, user)
  }

  /**
   * Associates a current auth account to the affiliate portal or creates a new account
   * Grants permissions for workshop and affiliate resources to the user
   *
   * @param id Salesforce Id of the associated contact
   * @param user
   */
  async createOrMapAuth(id: string, user: MapBody) {
    let roleId = this.ensure.facilitatorId
    if (user.role) {
      const role = await this.authService.getRole(
        `role.name='${user.role.name}'`,
      )
      if (!role) {
        throw new BadRequestException(
          `Role with name ${user.role.name} does not exist`,
        )
      }
      // why are we checking if role has id greater than 0? Makes no sense
      // moving to a new database or new data will break all of these checks
      if (role.id! > 0) roleId = role.id!
    }

    const initialAuth = await this.authService.getUser(
      `user.email='${user.Email}'`,
    )

    const auth: { id: number; jwt?: string } = initialAuth
      ? await this.mapCurrentAuth(initialAuth, id)
      : await this.createNewAuth(user.Email, user.password!, id)

    // FIXME: this will break if the auth user email doesn't match the salesforce email
    await this.authService.addRoleToUser({ userEmail: user.Email, roleId })

    await this.authService.grantPermissionToUser(
      affiliateResource(user.AccountId),
      1,
      auth.id,
    )
    await this.authService.grantPermissionToUser(
      workshopResource(user.AccountId),
      2,
      auth.id,
    )

    this.cache.invalidate(this.getAllKey)

    return { extId: id, userId: auth.id, jwt: auth.jwt }
  }

  /**
   * Uses the Shingo Auth API to create a new login
   * Creates a new authUser with the affiliate-portal service
   *
   * @param email
   * @param password
   * @param roleId
   * @param extId - Salesforce Id of the associated contact
   */
  async createNewAuth(email: string, password: string, extId: string) {
    const user = await this.authService.createUser({
      email,
      password,
      services: 'affiliate-portal',
      extId,
    })
    this.cache.invalidate(this.getAllKey)
    const token = await this.authService.login({ email, password })
    return { jwt: token, id: user.id! }
  }

  /**
   * Uses the Shingo Auth API to map a Salesforce contact to a current login
   * Adds the affiliate-portal service to the user's services and updates
   *
   * @param userEmail
   * @param roleId
   * @param extId - Salesforce Id of the associated contact
   */
  async mapCurrentAuth(user: A.User, extId: string) {
    if (typeof user === 'undefined')
      throw new BadRequestException('', 'USER_NOT_FOUND')

    const services =
      user.services === '' || typeof user.services === 'undefined'
        ? 'affiliate-portal'
        : [...new Set([...user.services.split(','), 'affiliate-portal'])].join()

    await this.authService.updateUser({
      ...user,
      extId,
      services,
    })

    this.cache.invalidate(this.getAllKey)

    return { id: user.id! }
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
  async update(user: UpdateBody) {
    const contact = _.omit(user, [
      'password',
      'Account',
      'Facilitator_For__r',
      'id',
      'role',
    ])

    if (user.role) {
      const role = await this.authService.getRole(
        `role.name='${user.role.name}'`,
      )

      if (!role) {
        throw new BadRequestException(
          `Role with name ${user.role.name} does not exist`,
        )
      }

      await this.changeRole(user.Id, role.id!)
    }

    // Get current user data to check if email address is being udpated.
    const prevUser = await this.sfService
      .retrieve<Contact>({
        object: 'Contact',
        ids: [user.Id],
      })
      .then(retrieveResult)

    if (prevUser === null)
      throw new BadRequestException(`Contact with id ${user.Id} does not exist`)

    // Update Contact record in Salesforce
    const data = {
      object: 'Contact',
      records: [contact],
    }

    const record = (await this.sfService.update(data))[0]

    // If the users email or password changed, update their user auth
    const auth =
      user.Email !== prevUser.Email || user.password
        ? await this.updateAuth(user, record.id)
        : false

    // Update permissions
    if (user.AccountId !== prevUser.AccountId) {
      await this.authService.revokePermissionFromUser(
        affiliateResource(prevUser.AccountId),
        1,
        user.id,
      )
      await this.authService.revokePermissionFromUser(
        workshopResource(prevUser.AccountId),
        2,
        user.id,
      )
      await this.authService.grantPermissionToUser(
        affiliateResource(user.AccountId),
        1,
        user.id,
      )
      await this.authService.grantPermissionToUser(
        workshopResource(user.AccountId),
        2,
        user.id,
      )
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
  async updateAuth(
    user: { Email?: string; password?: string },
    extId: string,
  ): Promise<boolean> {
    const set: { extId: string; email?: string; password?: string } = { extId }
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

    const record = (await this.sfService.delete(data))[0]

    this.cache.invalidate(id)
    this.cache.invalidate(this.getAllKey)

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

    if (typeof user === 'undefined')
      throw new BadRequestException('', 'USER_NOT_FOUND')

    const services = (user.services || '').split(',').map(s => s.trim())
    const newServices = services.map(
      s => (s === 'affiliate-portal' ? 'af-p-disabled' : s),
    )
    user.services = newServices.join()

    this.log.warn('Disabling %j', user)
    const updated = await this.authService.updateUser({ ...user, extId })

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
  async changeRole(extId: string, roleId: number): Promise<boolean> {
    // This is a dumb method. Why can a user not have multiple roles?
    // what's the point of user.roles being an array then?
    // if it was supposed to be one role per service, user.roles should have been
    // a Record<string, Role> keyed by the service instead

    const user = await this.authService.getUser(`user.extId='${extId}'`)

    // yet another check for the mysterious id 0
    if (!user || user.id === 0)
      throw new BadRequestException('', 'USER_NOT_FOUND')

    const currentRoles = (user.roles || []).filter(
      role => role.service === 'affiliate-portal' && role.id !== roleId,
    )

    const set = { userEmail: user.email!, roleId }

    // remove any existing affiliate-portal role
    if (currentRoles.length > 0) {
      await Promise.all(
        currentRoles.map(({ id }) =>
          this.authService.removeRoleFromUser({
            userEmail: user.email!,
            roleId: id!,
          }),
        ),
      )
    }

    let added = true
    if (!(user.roles || []).find(r => r.id === roleId)) {
      added = await this.authService.addRoleToUser(set)
    }

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return added
  }

  /**
   * Generates a reset token for a user
   * @param email user email
   */
  generateReset(email: string) {
    return this.authService.generateResetToken(email)
  }

  /**
   * Resets a password given a reset token and the new password
   * @param token jwt token
   * @param password new password
   */
  resetPassword(token: string, password: string) {
    return this.authService.resetPassword(token, password)
  }
}
