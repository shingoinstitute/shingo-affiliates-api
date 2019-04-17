import { BadRequestException, Injectable } from '@nestjs/common'
import {
  AuthService,
  CacheService,
  affiliateResource,
  workshopResource,
} from '../'
import _ from 'lodash'
import jwt from 'jwt-simple'
import { RecordTypeService } from '../recordtype/RecordType.component'
import SalesforceService from '../salesforce/new-salesforce.component'
import { tryCache, ArrayValue, Omit } from '../../util'
import { SFQ } from '../../util/salesforce'
import { Contact, RecordType, Account } from '../../sf-interfaces'
import { EnsureRoleService } from '../ensurerole.component'

// TODO: Fix these types to something more accurate once we have the auth service properly typed
type AddAuthInfo = {
  id?: number
  role?: { service: string }
  lastLogin?: string
  services?: string
}
type User = {
  services?: string
  id?: number
  roles?: any[]
  lastLogin?: string
}

const isAffilateInstructor = (r: Partial<Contact>) =>
  r.RecordType && r.RecordType.DeveloperName === 'Affiliate_Instructor'

/**
 * @desc A service to provide functions for working with Facilitators
 *
 * @export
 * @class FacilitatorsService
 */
@Injectable()
export class FacilitatorsService {
  private getAllKey = 'FacilitatorsService.getAll'
  private queryFn: <T>(x: string) => Promise<T[]>

  constructor(
    private newSfService: SalesforceService,
    private authService: AuthService,
    private cache: CacheService,
    private recordType: RecordTypeService,
    private ensure: EnsureRoleService
  ) {
    this.queryFn = this.newSfService.query.bind(this.newSfService)
  }

  /**
   * @desc Get all facilitators for the affiliate specified. All if <code>affiliate === ''</code>. The queried fields from Salesforce are as follows:<br><br>
   * <code>[<br>
   *  &emsp;"Id",<br>
   *  &emsp;"FirstName",<br>
   *  &emsp;"LastName",<br>
   *  &emsp;"Email",<br>
   *  &emsp;"Title",<br>
   *  &emsp;"Account.Id",<br>
   *  &emsp;"Account.Name",<br>
   *  &emsp;"Facilitator_For\__r.Id",<br>
   *  &emsp;"Facilitator_For\__r.Name",<br>
   *  &emsp;"Photograph\__c",<br>
   *  &emsp;"Biography\__c"<br>
   * ]</code>
   *
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @param {string} [affiliate] - SF Id of the affiliate to get facilitators for (or '' to get all facilitators)
   * @memberof FacilitatorsService
   */
  getAll(refresh = false, affiliate?: string) {
    let where = `RecordType.DeveloperName='Affiliate_Instructor'`
    if (affiliate != '') where += ` AND Facilitator_For__c='${affiliate}'`

    const query = new SFQ('Contact')
      .select(
        'Id',
        'FirstName',
        'LastName',
        'Email',
        'Title',
        'Photograph__c',
        'Biography__c'
      )
      .parent('Account')
      .select('Id', 'Name')
      .done()
      .parent('Facilitator_For__r')
      .select('Id', 'Name')
      .done()
      .where(where)

    return tryCache(
      this.cache,
      this.getAllKey,
      async () => {
        const facilitators = (await query.query(this.queryFn)) || []
        const withAuth = await this.addAuthData(facilitators)

        // Add the facilitator's auth id to object
        return withAuth.filter(
          facilitator =>
            facilitator.id != null &&
            facilitator.services &&
            facilitator.services.includes('affiliate-portal')
        )
      },
      refresh
    )
  }

  private async getAuthUsers(facilitators: Array<{ Id: string }>) {
    const ids = facilitators.map(facilitator => `'${facilitator.Id}'`)
    const { users: usersArr = [] } = await this.authService.getUsers(
      `user.extId IN (${ids.join()})`
    )
    const users = _.keyBy(usersArr, 'extId')
    return users
  }

  private addUserInfo<T extends object>(
    facilitator: T,
    user: User
  ): T & AddAuthInfo {
    const newObj = {
      ...facilitator,
      id: user.id,
      // TODO: return all roles, not just the first found
      role: (user.roles || []).find(r => r.service === 'affiliate-portal'),
      lastLogin: user.lastLogin,
      services: user.services,
    }

    return newObj
  }

  private async addAuthData<T extends { Id: string }>(facilitators: T[]) {
    type R = T & AddAuthInfo
    const users = await this.getAuthUsers(facilitators)

    return facilitators.map(
      (facilitator): R =>
        users[facilitator.Id]
          ? this.addUserInfo(facilitator, users[facilitator.Id])
          : (facilitator as T)
    )
  }

  /**
   * @desc Uses the Salesforce REST API to describe the Contact object. See the Salesforce documentation for more about 'describe'
   *
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @memberof FacilitatorsService
   */
  describe(refresh = false) {
    const key = 'describeContact'
    return tryCache(
      this.cache,
      key,
      () => this.newSfService.describe('Contact'),
      refresh
    )
  }

  /**
   * @desc Executes a SOSL query to search for text on Contacts of record type Affiliate Instructor Salesforce. Example response body:<br><br>
   * <code>[<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "003g000001VvwEZAAZ",<br>
   *          &emsp;&emsp;"Name": "Test One",<br>
   *          &emsp;&emsp;"Email": "testone@example.com"<br>
   *      &emsp;},<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "003g000001VvwEZABA",<br>
   *          &emsp;&emsp;"Name": "Test Two",<br>
   *          &emsp;&emsp;"Email": "testtwo@example.com"<br>
   *      &emsp;},<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "003g000001VvwEZABB",<br>
   *          &emsp;&emsp;"Name": "Test Three",<br>
   *          &emsp;&emsp;"Email": "testthree@example.com"<br>
   *      &emsp;},<br>
   *  ]</code>
   *
   * @param search - Header 'x-search'. SOSL search expression (i.e. '*Test*').
   * @param retrieve - Header 'x-retrieve'. A comma seperated list of the Contact fields to retrieve (i.e. 'Id, Name, Email')
   * @param affiliate The SF Id to filter results for (or '' for no filter)
   * @param refresh Force the refresh of the cache
   * @memberof FacilitatorsService
   */
  search(
    search: string,
    retrieve: string,
    isMapped = true,
    affiliate = '',
    refresh = true
  ) {
    // Generate the data parameter for the RPC call
    if (!retrieve.includes('AccountId')) retrieve += ', AccountId'
    if (!retrieve.includes('RecordType.DeveloperName'))
      retrieve += ', RecordType.DeveloperName'
    if (!retrieve.includes('Id')) retrieve += ', Id'
    const data = {
      search: `{${search}}`,
      retrieve: `Contact(${retrieve})`,
    }

    type SearchResult = Partial<Contact> &
      Pick<Contact, 'Id' | 'AccountId'> & {
        RecordType?: Pick<RecordType, 'DeveloperName'>
      }

    return tryCache(
      this.cache,
      data,
      async () => {
        /* this method does way too much, but I don't know enough about how it is used to refactor it
          1. We request the Contacts using the search data and filter to correct facilitators
          2. We get the authentication info for each facilitator if it exists
          5. If isMapped is true, return only the facilitators that have associated authentication info
          6. Otherwise return only the facilitators that don't have associated authentication info
        */
        let {
          searchRecords: facilitators = [],
        } = await this.newSfService.search<SearchResult>(data)

        facilitators = facilitators.filter(result =>
          affiliate === '' && isMapped
            ? isAffilateInstructor(result)
            : affiliate !== ''
            ? result.AccountId === affiliate && isAffilateInstructor(result)
            : result
        )

        if (facilitators.length) {
          // reduce allows us to map and filter in a single iteration
          const accountIds = facilitators.reduce(
            (acc, f) =>
              f.AccountId ? (acc.push(`'${f.AccountId}'`), acc) : acc,
            [] as string[]
          )
          // Add the facilitator's auth id to the object
          const authed = await this.addAuthData(facilitators)

          const query = new SFQ('Account')
            .select('Id', 'Name')
            .where(`Id IN (${accountIds.join()})`)
          const affArray = (await query.query(this.queryFn)) || []
          const affiliates = _.keyBy(affArray, 'Id')

          // reduce allows us to map and filter in a single iteration
          // we filter by pushing the result to the acc array if a predicate passes
          // and we map by modifying the value
          return authed.reduce(
            (acc, fac) => {
              const f = {
                ...fac,
                Account:
                  (fac.AccountId && affiliates[fac.AccountId]) || undefined,
              }
              if (isMapped) {
                if (f.services && f.services.includes('affiliate-portal')) {
                  acc.push(f)
                }
              } else if (
                f.services == null ||
                !f.services.includes('affiliate-portal')
              ) {
                acc.push(f)
              }

              return acc
            },
            [] as Array<
              Omit<ArrayValue<typeof authed>, 'Account'> & {
                Account?: ArrayValue<typeof affArray>
              }
            >
          )
        }
        return facilitators
      },
      refresh
    )
  }

  private getUserBy(data: { extId: string } | { email: string }) {
    const { extId, email } = data as { extId?: string; email?: string }

    if (extId) return this.authService.getUser(`user.extId='${extId}'`)
    else return this.authService.getUser(`user.email='${email}'`)
  }

  // TODO: Fix return types once user service is properly typed
  private tryFindUser(extId: string, email: string): Promise<User | undefined> {
    return this.getUserBy({ extId })
      .then(u => u || this.getUserBy({ email }))
      .then(u => {
        if (typeof u === 'undefined') {
          console.warn(
            `Failed to find user {email: ${email}, extId: ${extId}} in auth DB using their Salesforce ID and their email address.`
          )
          // throw new Error('Failed to find user by Salesforce ID and email')
        }
        return u
      })
  }

  /**
   * @desc Get the facilitator with the id passed at the parameter :id. The following fields are returned:<br><br>
   * <code>[<br>
   * TODO: Add fields that are returned<br>
   * ]</code>
   *
   * @param id Salesforce ID for a Contact
   * @memberof FacilitatorsService
   */
  get(id: string) {
    return tryCache(this.cache, id, async () => {
      // Create the data parameter for the RPC call
      const data = {
        object: 'Contact',
        ids: [id],
      }

      let [facilitator] = await this.newSfService.retrieve<Contact>(data)
      if (!facilitator) return

      facilitator['Account'] = facilitator.AccountId
        ? (await this.newSfService.retrieve<Account>({
            object: 'Account',
            ids: [facilitator.AccountId],
          }))[0]
        : undefined

      const user = await this.tryFindUser(facilitator.Id, facilitator.Email!)
      // TODO: return undefined here and have the controller handle NOT_FOUND error
      if (!user) throw { error: 'NOT_FOUND', status: 404 }

      if (!user.services || !user.services.includes('affiliate-portal'))
        throw { error: 'NOT_FOUND', status: 404 }

      // why are we doing something different for user 0? User 0 doesn't even exist in the production db
      const newFac =
        user.id !== 0 ? this.addUserInfo(facilitator, user) : facilitator

      // TODO: don't just merge all properties, store in sub-object of facilitator
      // instead of facilitator & user, do facilitator & { auth: user }, for simpler typing
      // simpler filtering for salesforce
      _.merge(newFac, _.omit(user, ['email', 'password']))

      return newFac
    })
  }

  /**
   * @desc Creates a new Contact of record type 'Affiliate Instructor' in Salesforce and addes a user to the Shingo Auth api. The user create for the Auth API will be assigned the role of roleId (defaults to 'Facilitator'). Returns a response like:<br><br>
   * <code>{<br>
   *  &emsp;"jwt": string,<br>
   *  &emsp;"id:" number<br>
   * }</code>
   *
   * @param {any} user - User to create
   * @memberof FacilitatorsService
   */
  async create(user: any) {
    // TODO: simplify this logic by having auth user be a sub object, not merged
    let contact = _.omit(user, ['Id', 'password', 'roleId', 'role'])

    // Create the contact in Salesforce
    contact.RecordTypeId = await this.recordType.get('Affiliate_Instructor')
    const data = {
      object: 'Contact',
      records: [contact],
    }
    const [record] = await this.newSfService.create(data)
    this.cache.invalidate(this.getAllKey)
    return this.createOrMapAuth(record.id, user)
  }

  /**
   * @desc Maps an existing Contact record to a new/current login
   *
   * @param {SalesforceId} id  - The Salesforce Id of the Contact to map
   * @param {any} user
   * @memberof FacilitatorsService
   */
  async mapContact(id: string, user: any) {
    const data = {
      object: 'Contact',
      ids: [id],
    }

    const [record] = await this.newSfService.retrieve(data)

    // TODO: have controller handle errors, return a Nothing-like value here (fp-ts None, null, undefined)
    if (record == undefined) throw { error: 'CONTACT_NOT_FOUND' }

    record.RecordTypeId = this.recordType.get('Affiliate_Instructor')

    // FIXME: We really shouldn't be pulling down the whole record and re-updating it merged
    // Salesforce handles this for us, we can just cause problems if we try to update a removed or readonly/formula field
    // Plus we are just indiscriminantly merging the user object here - what if user (which mostly comes from our auth DB) has
    // fields that don't exist in salesforce? Big problems. This is really really really really dumb code
    // FIX IT FIX FIX FIX

    // FIXME: I really don't think we should be doing this merging here
    // user only has AccountId and Email, which should already be set on record
    // also, I don't think its necessary to get the whole record Contact just to update the RecordTypeId field
    const updateData = {
      object: 'Contact',
      records: [
        _.merge(
          _.omit(record, ['Name', 'Workshop_Evaluation_Subject_Line__c']),
          user
        ),
      ],
    }

    await this.newSfService.update(updateData)

    this.cache.invalidate(this.getAllKey)
    return this.createOrMapAuth(id, user)
  }

  /**
   * @desc Searches for an existing user with the same email. If not found, one is created, else the 'affiliate-portal' service is added and permissions are granted.
   *
   * @param {SalesforceId} id - Salesforce Id of the associated contact
   * @param {any} user
   * @memberof FacilitatorsService
   */
  async createOrMapAuth(id: string, user: any) {
    // TODO: replace with an injectable service instead of modifying global on app startup
    let roleId = this.ensure.facilitatorId

    if (user.role) {
      const role = await this.authService.getRole(`name='${user.role.name}'`)
      if (!role) {
        throw new BadRequestException(
          `Role with name ${user.role.name} does not exist`
        )
      }
      // why are we checking if role has id greater than 0? Makes no sense
      // moving to a new database or new data will break all of these checks
      if (role.id > 0) roleId = role.id
    }

    const initialAuth = await this.authService.getUser(
      `user.email='${user.Email}'`
    )

    const auth =
      !initialAuth || initialAuth.email === ''
        ? await this.createNewAuth(user.Email, user.password, roleId, id)
        : await this.mapCurrentAuth(user.Email, roleId, id)

    // FIXME: this will break if the auth user email doesn't match the salesforce email
    await this.authService.addRoleToUser({ userEmail: user.Email, roleId })

    await this.authService.grantPermissionToUser(
      affiliateResource(user.AccountId),
      1,
      auth.id
    )
    await this.authService.grantPermissionToUser(
      workshopResource(user.AccountId),
      2,
      auth.id
    )

    this.cache.invalidate(this.getAllKey)

    return { id: id, ...auth }
  }

  /**
   * @desc Uses the Shingo Auth API to create a new login
   *
   * @param {string} email
   * @param {string} password
   * @param {number} roleId
   * @param {string} extId - Salesforce Id of the associated contact
   * @memberof FacilitatorsService
   */
  async createNewAuth(
    email: string,
    password: string,
    roleId: number,
    extId: string
  ) {
    const user = await this.authService.createUser({
      email,
      password,
      services: 'affiliate-portal',
      extId,
    })

    this.cache.invalidate(this.getAllKey)
    // TODO: log in the user here - we already have the email and plain-text password
    return { jwt: user.jwt, id: user.id }
  }

  /**
   * @desc Uses the Shingo Auth API to map a Salesforce contact to a current login
   *
   * @param {string} userEmail
   * @param {number} roleId
   * @param {string} extId - Salesforce Id of the associated contact
   * @memberof FacilitatorsService
   */
  async mapCurrentAuth(userEmail: string, roleId: number, extId: string) {
    const user = await this.authService.getUser(`user.email='${userEmail}'`)

    if (user === undefined) throw { error: 'USER_NOT_FOUND' }

    user.extId = extId

    const services =
      user.services === '' || user.services == null
        ? 'affiliate-portal'
        : [...new Set(['affiliate-portal', ...user.services.split(',')])].join()

    user.services = services

    await this.authService.updateUser(user)

    this.cache.invalidate(this.getAllKey)

    return { jwt: user.jwt, id: user.id }
  }

  /**
   * @desc Updates a facilitator's fields. Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"record": {<br>
   *      &emsp;&emsp;"id": SalesforceId,<br>
   *      &emsp;&emsp;"success": boolean,<br>
   *      &emsp;&emsp;"errors": []<br>
   *      &emsp;},<br>
   *      &emsp;"salesforce": boolean,<br>
   *      &emsp;"auth": boolean
   *  }</code>
   *
   * @param {any} user - The facilitator object to update
   * @memberof FacilitatorsService
   */
  async update(user: any) {
    const contact = _.omit(user, [
      'password',
      'Account',
      'Facilitator_For__r',
      'id',
      'role',
    ])

    if (user.role) {
      const role = await this.authService.getRole(
        `role.name='${user.role.name}'`
      )

      if (!role) {
        throw new BadRequestException(
          `Role with name ${user.role.name} does not exist`
        )
      }

      await this.changeRole(user.Id, role.id)
    }

    // Get current user data to check if email address is being udpated.
    const [prevUser] = await this.newSfService.retrieve<Contact>({
      object: 'Contact',
      ids: [user.Id],
    })

    if (!prevUser)
      throw new BadRequestException(`Contact with id ${user.Id} does not exist`)

    // Update Contact record in Salesforce
    const data = {
      object: 'Contact',
      records: [contact],
    }
    const [record] = await this.newSfService.update(data)

    // If the users email or password changed, update their user auth
    const auth =
      user.Email !== prevUser.Email || user.password
        ? await this.updateAuth(user, record.id)
        : false

    // Update permissions
    if (user.AccountId !== prevUser.AccountId) {
      await this.authService.revokePermissionFromUser(
        affiliateResource(prevUser.AccountId!),
        1,
        user.id
      )
      await this.authService.revokePermissionFromUser(
        workshopResource(prevUser.AccountId!),
        2,
        user.id
      )
      await this.authService.grantPermissionToUser(
        affiliateResource(user.AccountId),
        1,
        user.id
      )
      await this.authService.grantPermissionToUser(
        workshopResource(user.AccountId),
        2,
        user.id
      )
    }

    this.cache.invalidate(user.Id)
    this.cache.invalidate(this.getAllKey)

    return { salesforce: true, auth, record }
  }

  /**
   * @desc Update the associated login of a facilitator
   *
   * @param {any} user - Facilitator's fields to update
   * @param {any} extId - Facilitator's Contact ID
   * @returns {Promise<boolean>}
   * @memberof FacilitatorsService
   */
  async updateAuth(user: any, extId: string) {
    const set: { extId: string; email?: string; password?: string } = { extId }
    if (user.Email) set.email = user.Email
    if (user.password) set.password = user.password

    // TODO: remove unsafe as any type assertion
    const updated = await this.authService.updateUser(set as any)

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return !!(updated && updated.response)
  }

  /**
   * @desc Deletes a facilitator. Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"id": SalesforceId,<br>
   *      &emsp;"success": boolean,<br>
   *      &emsp;"errors": []<br>
   *  }</code>
   *
   *
   * @param {string} id - Salesforce Id of the Contact to delete
   * @memberof FacilitatorsService
   */
  async delete(id: string) {
    // Create the data parameter for the RPC call
    const data = {
      object: 'Contact',
      ids: [id],
    }
    const [record] = await this.newSfService.delete(data)

    this.cache.invalidate(id)
    this.cache.invalidate(this.getAllKey)

    return record
  }

  /**
   * @desc Delete a login from the Shingo Auth API
   *
   * @param {string} extId - Facilitator's Contact Id
   * @returns {Promise<boolean>}
   * @memberof FacilitatorsService
   */
  async deleteAuth(extId: string) {
    const deleted = await this.authService.deleteUser({ extId })

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return !!(deleted && deleted.response)
  }

  /**
   * @desc Remove the Affiliate Portal as service for a login
   *
   * @param {string} extId - Facilitator's Contact Id
   * @memberof FacilitatorsService
   */
  async unmapAuth(extId: string) {
    const user = await this.authService.getUser(`user.extId='${extId}'`)

    if (!user) throw { error: 'USER_NOT_FOUND' }

    const newServices = ((user.services as string) || '').split(',').map(ss => {
      const s = ss.trim()
      return s === 'affiliate-portal' ? 'af-p-disabled' : s
    })
    user.services = newServices.join()

    console.warn('Disabling', user)
    const updated = await this.authService.updateUser(user)

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return !!(updated && updated.response)
  }

  /**
   * @desc Change a Facilitator's role to the role specified by <code>roleId</code>. If a role exists that belongs to the Affiliate Portal, it is removed first
   *
   * @param {string} extId - Facilitator's Contact Id
   * @param {any} roleId - Id of the role to change to
   * @returns {Promise<boolean>}
   * @memberof FacilitatorsService
   */
  async changeRole(extId: string, roleId: number) {
    // This is a dumb method. Why can a user not have multiple roles?
    // what's the point of user.roles being an array then?
    // if it was supposed to be one role per service, user.roles should have been
    // a Record<string, Role> keyed by the service instead

    const user = await this.authService.getUser(`user.extId='${extId}'`)

    if (user.id === 0) throw { error: 'USER_NOT_FOUND' }

    const currentRole = (user.roles || []).find(
      (      role: { service: string; }) => role.service === 'affiliate-portal'
    )

    const set = { userEmail: user.email, roleId }
    if (currentRole != null) {
      await this.authService.removeRoleFromUser({
        userEmail: user.email,
        roleId: currentRole.id,
      })
    }
    const added = await this.authService.addRoleToUser(set)

    this.cache.invalidate(extId)
    this.cache.invalidate(this.getAllKey)

    return !!(added && added.response)
  }

  // FIXME: this should be moved into the authservice
  async generateReset(email: string) {
    const user = await this.authService.getUser(`user.email='${email}'`)

    if (user.id === 0) throw { error: 'USER_NOT_FOUND' }

    const expires = Date.now() + 1000 * 60 * 60
    const token = jwt.encode(
      { expires, email },
      process.env.JWT_SECRET || 'ilikedogges'
    )

    user.resetToken = token

    await this.authService.updateUser(_.omit(user, ['password']))

    return token
  }

  // FIXME: this should be moved into the authservice
  async resetPassword(token: string, password: string) {
    const user = await this.authService.getUser(`user.resetToken='${token}'`)

    if (user.id === 0) throw { error: 'USER_NOT_FOUND' }

    const decoded = jwt.decode(token, process.env.JWT_SECRET || 'ilikedogges')

    if (new Date(decoded.expires) < new Date())
      throw { error: 'RESET_TOKEN_EXPIRED' }

    // FIXME: remove unsafe any assertion
    await this.authService.updateUser({ id: user.id, password } as any)

    return user
  }
}
