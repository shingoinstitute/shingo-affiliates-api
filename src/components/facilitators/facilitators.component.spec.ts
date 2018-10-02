import { Test } from '@nestjs/testing'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient, authservices as A } from '@shingo/auth-api-client'
import { FacilitatorsService } from './facilitators.component'
import { CacheService } from '../cache/cache.component'
import { CacheServiceMock } from '../cache/cache.component.mock'
import { mockLogger } from '../../factories/logger.mock'
import { EnsureRoleService } from '../ensurerole.component'
import { EnsureRoleServiceMock } from '../mock/ensurerole.component.mock'
import { omit } from 'lodash'
import {
  CreateBody,
  MapBody,
} from '../../controllers/facilitators/facilitatorInterfaces'
import {
  affiliateResource,
  workshopResource,
} from '../affiliates/affiliates.component'
// tslint:disable:no-shadowed-variable

describe('FacilitatorsService', () => {
  let sfService: SalesforceClient
  let authService: AuthClient
  let facService: FacilitatorsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [FacilitatorsService],
      providers: [
        {
          provide: AuthClient,
          // very unlikely to be a service running on this port,
          // so if any method is not mocked we definitely will fail
          useFactory: () => new AuthClient('localhost:65535'),
        },
        {
          provide: SalesforceClient,
          useFactory: () => new SalesforceClient('localhost:65535'),
        },
      ],
    })
      .overrideProvider(EnsureRoleService)
      .useClass(EnsureRoleServiceMock)
      .overrideProvider(CacheService)
      .useClass(CacheServiceMock)
      .overrideProvider('LoggerService')
      .useValue(mockLogger)
      .compile()

    authService = module.get<AuthClient>(AuthClient)
    sfService = module.get<SalesforceClient>(SalesforceClient)
    facService = module.get<FacilitatorsService>(FacilitatorsService)
  })

  const contacts = [
    {
      Id: 'A00000000',
      FirstName: 'John',
      LastName: 'Doe',
      Email: 'jd@example.com',
      Title: 'Sir',
      Account: {
        Id: 'A10000000',
        Name: 'John Doe',
      },
      Faciliator_For__r: {
        Id: 'A200000000',
        Name: 'Some Facilitator',
      },
      Photograph__c: 'http://example.com/image.jpg',
      Biography__c: 'A bio',
    },
    {
      Id: 'A00000001',
      FirstName: 'George',
      LastName: 'Of The Jungle',
      Email: 'jd@example.com',
      Title: 'Sir',
      Account: {
        Id: 'A10000001',
        Name: 'AN ACCOUNT HERE',
      },
      Faciliator_For__r: {
        Id: 'A200000001',
        Name: 'Some Facilitator',
      },
      Photograph__c: 'http://example.com/image.jpg',
      Biography__c: 'A bio',
    },
  ]

  const authUsers = [
    {
      id: 0,
      lastLogin: new Date().toUTCString(),
      services: 'affiliate-portal',
      roles: [
        { id: 0, name: 'Some Role', service: 'affiliate-portal' },
        { id: 1, name: 'Non-Affiliate', service: 'other-portal' },
      ],
      extId: contacts[0].Id,
    },
    {
      id: 1,
      lastLogin: new Date().toUTCString(),
      extId: contacts[1].Id,
    },
  ]

  describe('getAll', () => {
    const createSpys = () => {
      const query = jest
        .spyOn(sfService, 'query')
        .mockResolvedValue({ records: contacts })
      const getUsers = jest
        .spyOn(authService, 'getUsers')
        .mockResolvedValue(authUsers)
      return { query, getUsers }
    }

    it('queries salesforce for a contact object with Affiliate_Instructor record type', async () => {
      expect.assertions(2)
      const { query } = createSpys()

      await facService.getAll()

      expect(query).toHaveBeenCalledTimes(1)
      expect(query.mock.calls[0][0]).toMatchObject({
        table: 'Contact',
        clauses: `RecordType.DeveloperName='Affiliate_Instructor'`,
      })
    })

    it('queries for a specific associated facilitator if passed affiliate parameter is not the empty string', async () => {
      expect.assertions(2)
      const { query } = createSpys()

      const id = 'A1234'

      await facService.getAll(false, id)

      expect(query).toHaveBeenCalledTimes(1)
      expect(query.mock.calls[0][0]).toMatchObject({
        table: 'Contact',
        clauses: `RecordType.DeveloperName='Affiliate_Instructor' AND Facilitator_For__c='${id}'`,
      })
    })

    it('queries the authService for users associated with the found contacts', async () => {
      expect.assertions(2)
      const { getUsers } = createSpys()

      const ids = contacts.map(c => `'${c.Id}'`)

      await facService.getAll()

      expect(getUsers).toHaveBeenCalledTimes(1)
      expect(getUsers).toHaveBeenCalledWith(`user.extId IN (${ids.join()})`)
    })

    it('returns the contact objects merged with their user info', () => {
      createSpys()

      // contacts[1] is not returned because the associated user's services doesn't include 'affiliate-portal'
      const mergedContacts = [
        {
          ...contacts[0],
          // we merge keys {id,roles,lastLogin,services} from the associated user
          ...omit(authUsers[0], 'extId'),
          // role with id 1 gets removed because its service is not affiliate-portal
          roles: [authUsers[0].roles![0]],
        },
      ]

      return expect(facService.getAll()).resolves.toEqual(mergedContacts)
    })
  })

  describe('describe', () => {
    it('describes the Contact object using sfService', async () => {
      expect.assertions(1)
      const describe = jest
        .spyOn(sfService, 'describe')
        .mockResolvedValue('Some Describe')

      await facService.describe()

      expect(describe).toHaveBeenCalledWith('Contact')
    })
  })

  describe('search', () => {
    const createSpys = (
      searchRecords: any[],
      users: any[],
      accounts: any[],
    ) => {
      const search = jest
        .spyOn(sfService, 'search')
        .mockResolvedValue({ searchRecords })
      const getUsers = jest
        .spyOn(authService, 'getUsers')
        .mockResolvedValue(users)
      const query = jest
        .spyOn(sfService, 'query')
        .mockResolvedValue({ records: accounts })

      return { search, getUsers, query }
    }

    const data = (twoGood = false) => ({
      contacts: [
        {
          AccountId: 'A100000',
          RecordType: {
            DeveloperName: 'Affiliate_Instructor',
          },
          Id: 'A000000',
        },
        {
          AccountId: 'testing 123',
          RecordType: {
            DeveloperName: twoGood ? 'Affiliate_Instructor' : 'Something_Else',
          },
          Id: 'A000001',
        },
        {
          AccountId: 'A100002',
          RecordType: {
            DeveloperName: 'Something_Else',
          },
          Id: 'A000002',
        },
      ],

      users: [
        {
          id: 0,
          lastLogin: new Date().toUTCString(),
          services: 'affiliate-portal',
          extId: 'A000000', // must match contacts[0].Id
        },
        {
          id: 1,
          lastLogin: new Date().toUTCString(),
          services: twoGood ? 'affiliate-portal' : undefined,
          extId: 'A000001', // must match contacts[1].Id
        },
      ],
    })

    it('retrieves from Contact the fields: AccountId, RecordType.DeveloperName, Id, as well as fields from the retrieve parameter', async () => {
      expect.assertions(1)
      const { search } = createSpys([], [], [])
      await facService.search('some search', ['Name'])
      expect(search).toHaveBeenCalledWith({
        search: '{some search}',
        retrieve: 'Contact(Name,AccountId,RecordType.DeveloperName,Id)',
      })
    })

    it('filters the Contacts to those that are Registered Affiliate_Instructors', () => {
      const { contacts, users } = data()
      createSpys(contacts, users, [])
      return expect(
        facService.search('some search', []),
      ).resolves.toMatchObject([contacts[0]])
    })

    it('filters to Contacts with the correct AccountId if the affiliate parameter is not the empty string', () => {
      // we pass true to users to make sure we dont get false positives
      // from filtering down to only contacts with valid auth accounts
      const { contacts, users } = data(true)
      createSpys(contacts, users, [])
      return expect(
        facService.search('some search', [], true, contacts[1].AccountId),
      ).resolves.toMatchObject([contacts[1]])
    })

    it('adds the auth user information to the returned objects', () => {
      const { contacts, users } = data()
      createSpys(contacts, users, [])
      return expect(
        facService.search('some search', []),
      ).resolves.toMatchObject([omit(users[0], 'extId')])
    })

    it('returns contacts without valid auth user accounts if isMapped == false', () => {
      const { contacts, users } = data()
      createSpys(contacts, users, [])
      return expect(
        facService.search('some search', [], false),
      ).resolves.toMatchObject([contacts[1], contacts[2]])
    })
  })

  describe('get', () => {
    const createSpys = (
      user: { services: string } | undefined,
      account: any,
      facilitator: { Id: string; Email: string; AccountId: string } | null,
    ) => {
      const getUser = jest
        .spyOn(authService, 'getUser')
        .mockResolvedValue(user)
        .mockResolvedValueOnce(undefined)

      const retrieve = jest
        .spyOn(sfService, 'retrieve')
        .mockResolvedValue({})
        .mockResolvedValueOnce([facilitator])
        .mockResolvedValueOnce([account])

      return { getUser, retrieve }
    }

    const account = {
      Id: 'A100000',
    }

    const facilitator = {
      Id: 'A0000000',
      Email: 'test.user@example.com',
      AccountId: account.Id,
    }

    const user = {
      id: 1,
      services: 'affiliate-portal',
      email: 'test.user@example.com',
      roles: [],
      lastLogin: new Date().toUTCString(),
      extId: facilitator.Id,
    }

    it('uses sfService.retrieve to get the contact object with the specified id', async () => {
      expect.assertions(1)
      const { retrieve } = createSpys(user, account, facilitator)

      await facService.get(facilitator.Id)

      expect(retrieve).toHaveBeenNthCalledWith(1, {
        object: 'Contact',
        ids: [facilitator.Id],
      })
    })

    it('uses sfservice.retrieve to get an associated account', async () => {
      expect.assertions(1)
      const { retrieve } = createSpys(user, account, facilitator)

      await facService.get(facilitator.Id)

      expect(retrieve).toHaveBeenNthCalledWith(2, {
        object: 'Account',
        ids: [facilitator.AccountId],
      })
    })

    it('gets an auth user using authservice, getting by extId first, getting by email if that fails', async () => {
      expect.assertions(2)
      const { getUser } = createSpys(user, account, facilitator)

      await facService.get(facilitator.Id)

      expect(getUser).toHaveBeenCalledTimes(2)
      expect(getUser.mock.calls).toEqual([
        [`user.extId='${facilitator.Id}'`],
        [`user.email='${facilitator.Email}'`],
      ])
    })

    it('returns the retrieved contact with the user object merged and account under the Account key', () => {
      createSpys(user, account, facilitator)
      return expect(facService.get(facilitator.Id)).resolves.toEqual({
        ...facilitator,
        Account: account,
        ...omit(user, ['email']),
      })
    })

    it('returns undefined when the requested facilitator (Contact) does not exist', () => {
      createSpys(user, account, null)

      return expect(facService.get('asdf')).resolves.toBeUndefined()
    })

    it('returns undefined when the requested auth user does not exist', () => {
      createSpys(undefined, account, facilitator)

      return expect(facService.get(facilitator.Id)).resolves.toBeUndefined()
    })

    it('returns undefined if the requested auth user is not registered in the portal', () => {
      createSpys({ ...user, services: '' }, account, facilitator)

      return expect(facService.get(facilitator.Id)).resolves.toBeUndefined()
    })
  })

  describe('create', () => {
    const createData: CreateBody = {
      FirstName: 'John',
      LastName: 'Doe',
      AccountId: 'Some Account Id',
      Email: 'john.doe@example.com',
      password: 'Password123',
      roleId: 2,
    }

    it('creates a new Contact with a magic RecordTypeId string using sfService', async () => {
      expect.assertions(1)
      const create = jest
        .spyOn(sfService, 'create')
        .mockResolvedValue([{ success: true, id: '1234' }])

      jest.spyOn(facService, 'createOrMapAuth').mockResolvedValue({})

      await facService.create(createData)

      expect(create).toHaveBeenCalledWith({
        object: 'Contact',
        records: [
          omit(
            { ...createData, RecordTypeId: '012A0000000zpqrIAA' },
            'password',
            'roleId',
            'role',
          ),
        ],
      })
    })

    it('calls createOrMapAuth to associate a auth user login', async () => {
      expect.assertions(1)
      const createResult = { success: true, id: '1234' }
      jest.spyOn(sfService, 'create').mockResolvedValue([createResult])

      const auth = jest
        .spyOn(facService, 'createOrMapAuth')
        .mockResolvedValue({})

      await facService.create(createData)

      expect(auth).toHaveBeenCalledWith(createResult.id, createData)
    })
  })

  describe('mapContact', () => {
    const data: MapBody = {
      AccountId: 'Some Account Id',
      Email: 'Some Email',
    }

    it('retrieves the Contact with the given id using sfService', async () => {
      expect.assertions(1)
      const retrieve = jest.spyOn(sfService, 'retrieve').mockResolvedValue([
        {
          Id: 'some id',
        },
      ])
      jest.spyOn(sfService, 'update').mockResolvedValue({})
      jest.spyOn(facService, 'createOrMapAuth').mockResolvedValue({})

      await facService.mapContact('some id', data)

      expect(retrieve).toHaveBeenCalledWith({
        object: 'Contact',
        ids: ['some id'],
      })
    })

    it('updates the retrieved contact with the magic string', async () => {
      expect.assertions(2)
      const retrieveResult = {
        Id: 'some id',
      }
      jest.spyOn(sfService, 'retrieve').mockResolvedValue([retrieveResult])
      const update = jest.spyOn(sfService, 'update').mockResolvedValue({})
      jest.spyOn(facService, 'createOrMapAuth').mockResolvedValue({})

      await facService.mapContact('some id', data)

      expect(update).toHaveBeenCalledTimes(1)
      expect(update.mock.calls[0][0]).toMatchObject({
        object: 'Contact',
        records: [{ ...retrieveResult, RecordTypeId: '012A0000000zpqrIAA' }],
      })
    })

    it('calls createOrMapAuth', async () => {
      expect.assertions(1)
      const retrieveResult = {
        Id: 'some id',
      }
      jest.spyOn(sfService, 'retrieve').mockResolvedValue([retrieveResult])
      jest.spyOn(sfService, 'update').mockResolvedValue({})
      const map = jest
        .spyOn(facService, 'createOrMapAuth')
        .mockResolvedValue({})

      await facService.mapContact('some id', data)

      expect(map).toHaveBeenCalledWith('some id', data)
    })
  })

  describe('createOrMapAuth', () => {
    const data: MapBody = {
      AccountId: 'Some Account Id',
      Email: 'joe.bob@example.com',
    }

    const createSpys = (
      user: { id: number } | null = { id: 0 },
      role?: A.Role,
    ) => {
      const getRole = jest.spyOn(authService, 'getRole').mockResolvedValue(role)

      const getUser = jest
        .spyOn(authService, 'getUser')
        .mockResolvedValue(user ? user : undefined)

      const addRoleToUser = jest
        .spyOn(authService, 'addRoleToUser')
        .mockResolvedValue(true)

      const grantPermissionToUser = jest
        .spyOn(authService, 'grantPermissionToUser')
        .mockResolvedValue({})

      const mapCurrentAuth = jest
        .spyOn(facService, 'mapCurrentAuth')
        .mockResolvedValue({ id: (user && user.id) || 0 })

      const createNewAuth = jest
        .spyOn(facService, 'createNewAuth')
        .mockResolvedValue({ id: (user && user.id) || 0, jwt: 'some jwt' })

      return {
        getRole,
        getUser,
        addRoleToUser,
        grantPermissionToUser,
        mapCurrentAuth,
        createNewAuth,
      }
    }

    it('checks if a current auth user with the provided email exists', async () => {
      expect.assertions(1)
      const { getUser } = createSpys()

      await facService.createOrMapAuth('Some Contact Id', data)

      expect(getUser).toHaveBeenCalledWith(`user.email='${data.Email}'`)
    })

    it('calls mapCurrentAuth if an auth user exists', async () => {
      expect.assertions(1)
      const { mapCurrentAuth } = createSpys()

      await facService.createOrMapAuth('Some Contact Id', data)

      expect(mapCurrentAuth).toHaveBeenCalled()
    })

    it('calls createNewAuth if the auth user does not exist', async () => {
      expect.assertions(1)
      const { createNewAuth } = createSpys(null)

      await facService.createOrMapAuth('Some Contact Id', {
        ...data,
        password: 'test123',
      })

      expect(createNewAuth).toHaveBeenCalledWith(
        data.Email,
        'test123',
        'Some Contact Id',
      )
    })

    it('adds the facilitator role to the user if the passed data does not have a role', async () => {
      expect.assertions(1)
      const { addRoleToUser } = createSpys()

      await facService.createOrMapAuth('Some Contact Id', data)

      expect(addRoleToUser).toHaveBeenCalledWith({
        userEmail: data.Email,
        roleId: EnsureRoleServiceMock.facilitatorId,
      })
    })

    it('verifies that the given role exists and adds the given role to the user if the passed data has a role', async () => {
      expect.assertions(2)
      const role = {
        id: 3,
        name: 'Some Role',
      }

      const { addRoleToUser, getRole } = createSpys(undefined, role)

      await facService.createOrMapAuth('Some Contact Id', {
        ...data,
        role,
      })

      expect(getRole).toHaveBeenCalledWith(`role.name='${role.name}'`)
      expect(addRoleToUser).toHaveBeenCalledWith({
        userEmail: data.Email,
        roleId: role.id,
      })
    })

    it('grants permissions to the user', async () => {
      expect.assertions(2)

      const { grantPermissionToUser } = createSpys()

      await facService.createOrMapAuth('Some Contact Id', data)

      expect(grantPermissionToUser).toHaveBeenCalledTimes(2)
      expect(grantPermissionToUser.mock.calls).toEqual([
        [affiliateResource(data.AccountId), 1, 0],
        [workshopResource(data.AccountId), 2, 0],
      ])
    })

    it('returns the extId, and the auth users id', async () => {
      expect.assertions(1)
      createSpys()

      const result = await facService.createOrMapAuth('ID', data)

      expect(result).toEqual({ extId: 'ID', userId: 0 })
    })

    it('returns the a if the auth user is newly created', async () => {
      expect.assertions(1)
      createSpys(null)

      const result = await facService.createOrMapAuth('ID', data)

      expect(result).toEqual({ extId: 'ID', userId: 0, jwt: 'some jwt' })
    })
  })

  describe('createNewAuth', () => {
    const email = 'email@example.com'
    const password = 'passwer123'
    const extId = 'some id'

    it('creates the user using the provided data and logs in', async () => {
      expect.assertions(2)
      const createUser = jest
        .spyOn(authService, 'createUser')
        .mockResolvedValue({ id: 0 })
      const login = jest
        .spyOn(authService, 'login')
        .mockResolvedValue('some token')

      await facService.createNewAuth(email, password, extId)

      expect(createUser).toHaveBeenCalledWith({
        email,
        password,
        services: 'affiliate-portal',
        extId,
      })
      expect(login).toHaveBeenCalledWith({ email, password })
    })

    it('returns the user id and the jwt token', () => {
      jest.spyOn(authService, 'createUser').mockResolvedValue({ id: 0 })
      jest.spyOn(authService, 'login').mockResolvedValue('some token')

      return expect(
        facService.createNewAuth(email, password, extId),
      ).resolves.toEqual({
        jwt: 'some token',
        id: 0,
      })
    })
  })

  describe('mapCurrentAuth', () => {
    const user = {
      id: 0,
      services: 'test-portal',
    }

    it('updates the user, setting extId and ensuring affiliate-portal is in user.services', async () => {
      const update = jest.spyOn(authService, 'updateUser').mockResolvedValue({})

      await facService.mapCurrentAuth(user, 'some id')

      expect(update).toHaveBeenCalledWith({
        ...user,
        extId: 'some id',
        services: 'test-portal,affiliate-portal',
      })
    })

    it('returns the users id', () => {
      jest.spyOn(authService, 'updateUser').mockResolvedValue(true)

      return expect(
        facService.mapCurrentAuth(user, 'some id'),
      ).resolves.toEqual({ id: user.id })
    })
  })

  describe('update', () => {
    const createSpys = (
      contact: { AccountId: string; Email: string },
      role = { id: 1 },
    ) => ({
      getRole: jest.spyOn(authService, 'getRole').mockResolvedValue(role),
      changeRole: jest.spyOn(facService, 'changeRole').mockResolvedValue(true),
      retrieve: jest.spyOn(sfService, 'retrieve').mockResolvedValue([contact]),
      update: jest
        .spyOn(sfService, 'update')
        .mockResolvedValue([{ success: true, id: 'some id' }]),
      updateAuth: jest.spyOn(facService, 'updateAuth').mockResolvedValue(true),
      revokePermissionFromUser: jest
        .spyOn(authService, 'revokePermissionFromUser')
        .mockResolvedValue({}),
      grantPermissionToUser: jest
        .spyOn(authService, 'grantPermissionToUser')
        .mockResolvedValue({}),
    })

    const prevUser = {
      AccountId: 'Some Id',
      Email: 'some@example.com',
    }

    const data = {
      Email: prevUser.Email,
      Id: 'some id',
      id: 0,
      AccountId: prevUser.AccountId,
    }

    it('updates the role if user.role exists', async () => {
      expect.assertions(2)
      const role = { id: 1, name: 'hi' }
      const { getRole, changeRole } = createSpys(prevUser, role)

      await facService.update({
        ...data,
        role,
      })

      expect(getRole).toHaveBeenCalledWith(`role.name='hi'`)
      expect(changeRole).toHaveBeenCalledWith(data.Id, 1)
    })

    it('updates the contact record in salesforce', async () => {
      expect.assertions(1)
      const { update } = createSpys(prevUser)
      await facService.update(data)
      expect(update).toHaveBeenCalledWith({
        object: 'Contact',
        records: [omit(data, 'password', 'id', 'role')],
      })
    })

    it('updates the auth user if the email or password changed', async () => {
      expect.assertions(3)
      const { updateAuth } = createSpys(prevUser)
      const new1 = { ...data, Email: 'different@example.com' }
      await facService.update(new1)
      expect(updateAuth).toHaveBeenLastCalledWith(new1, 'some id')

      const new2 = { ...data, password: 'different@example.com' }
      await facService.update(new2)
      expect(updateAuth).toHaveBeenLastCalledWith(new2, 'some id')

      expect(updateAuth).toHaveBeenCalledTimes(2)
    })

    it('updates auth permissions if the AccountId changed', async () => {
      expect.assertions(4)
      const { revokePermissionFromUser, grantPermissionToUser } = createSpys(
        prevUser,
      )
      const newData = { ...data, AccountId: 'alksdfj' }
      await facService.update(newData)

      expect(revokePermissionFromUser).toHaveBeenCalledTimes(2)
      expect(grantPermissionToUser).toHaveBeenCalledTimes(2)
      expect(revokePermissionFromUser.mock.calls).toEqual([
        [affiliateResource(prevUser.AccountId), 1, data.id],
        [workshopResource(prevUser.AccountId), 2, data.id],
      ])
      expect(grantPermissionToUser.mock.calls).toEqual([
        [affiliateResource(newData.AccountId), 1, data.id],
        [workshopResource(newData.AccountId), 2, data.id],
      ])
    })
  })

  describe('updateAuth', () => {
    it('updates the user with the new data', async () => {
      expect.assertions(2)
      const update = jest
        .spyOn(authService, 'updateUser')
        .mockResolvedValue(true)

      await facService.updateAuth({ Email: 'blah@example.com' }, 'some id')

      expect(update).toHaveBeenLastCalledWith({
        email: 'blah@example.com',
        extId: 'some id',
      })

      await facService.updateAuth({ password: 'blah@example.com' }, 'some id')

      expect(update).toHaveBeenLastCalledWith({
        password: 'blah@example.com',
        extId: 'some id',
      })
    })
  })

  describe('delete', () => {
    it('deletes the sf Contact using sfservice', async () => {
      expect.assertions(1)
      const del = jest
        .spyOn(sfService, 'delete')
        .mockResolvedValue([{ success: true, id: 'blah' }])

      await facService.delete('asdf')

      expect(del).toHaveBeenCalledWith({
        object: 'Contact',
        ids: ['asdf'],
      })
    })
  })

  describe('deleteAuth', () => {
    it('deletes the auth user using authService', async () => {
      expect.assertions(1)
      const deleteUser = jest
        .spyOn(authService, 'deleteUser')
        .mockResolvedValue(true)

      await facService.deleteAuth('test')

      expect(deleteUser).toHaveBeenCalledWith({ extId: 'test' })
    })
  })

  describe('unmapAuth', () => {
    it('removes the affiliate-portal service from the user with the given extId', async () => {
      expect.assertions(2)
      const user = {
        services: 'affiliate-portal,something-else',
      }

      const getUser = jest.spyOn(authService, 'getUser').mockResolvedValue(user)

      const updateUser = jest
        .spyOn(authService, 'updateUser')
        .mockResolvedValue(true)

      await facService.unmapAuth('some id')

      expect(getUser).toHaveBeenCalledWith(`user.extId='some id'`)
      expect(updateUser).toHaveBeenCalledWith({
        services: 'af-p-disabled,something-else',
        extId: 'some id',
      })
    })
  })

  describe('changeRole', () => {
    const user = {
      id: 1,
      email: 'hi@example.com',
      roles: [
        {
          id: 0,
          service: 'affiliate-portal',
        },
        {
          id: 3,
          service: 'affiliate-portal',
        },
      ],
    }

    const createSpys = () => {
      const getUser = jest.spyOn(authService, 'getUser').mockResolvedValue(user)

      const addRoleToUser = jest
        .spyOn(authService, 'addRoleToUser')
        .mockResolvedValue(true)

      const removeRoleFromUser = jest
        .spyOn(authService, 'removeRoleFromUser')
        .mockResolvedValue(true)

      return { getUser, addRoleToUser, removeRoleFromUser }
    }

    it('checks that the user exists', async () => {
      const { getUser } = createSpys()

      await facService.changeRole('some id', 1)

      expect(getUser).toHaveBeenCalledWith(`user.extId='some id'`)
    })

    it('removes any existing affiliate-portal roles', async () => {
      const afproles = user.roles.filter(r => r.service === 'affiliate-portal')
      expect.assertions(afproles.length + 1)
      const { removeRoleFromUser } = createSpys()

      await facService.changeRole('some id', 1)

      expect(removeRoleFromUser).toHaveBeenCalledTimes(afproles.length)
      afproles.forEach(r =>
        expect(removeRoleFromUser).toHaveBeenCalledWith({
          userEmail: user.email,
          roleId: r.id,
        }),
      )
    })

    it('adds the new role to the user', async () => {
      const { addRoleToUser } = createSpys()

      await facService.changeRole('some id', 1)

      expect(addRoleToUser).toHaveBeenCalledWith({
        userEmail: user.email,
        roleId: 1,
      })
    })

    it('does not add the role if it already exists on the user', async () => {
      const { addRoleToUser } = createSpys()

      await facService.changeRole('some id', 3)

      expect(addRoleToUser).not.toHaveBeenCalled()
    })
  })

  describe('generateReset', () => {
    it('generates a reset token using authService', async () => {
      const generateReset = jest
        .spyOn(authService, 'generateResetToken')
        .mockResolvedValue('some token')

      const r = await facService.generateReset('some@example.com')

      expect(r).toEqual('some token')
      expect(generateReset).toHaveBeenCalledWith('some@example.com')
    })
  })

  describe('resetPassword', () => {
    it('resets a password using authService', async () => {
      const resetPassword = jest
        .spyOn(authService, 'resetPassword')
        .mockResolvedValue('some token')

      const r = await facService.resetPassword('some@example.com', 'pw')

      expect(r).toEqual('some token')
      expect(resetPassword).toHaveBeenCalledWith('some@example.com', 'pw')
    })
  })
})
