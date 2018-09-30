import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient, authservices } from '@shingo/auth-api-client'
import { Test } from '@nestjs/testing'
import {
  AffiliatesService,
  workshopResource,
  affiliateResource,
} from './affiliates.component'
import { CacheService } from '../cache/cache.component'
import { CacheServiceMock } from '../cache/cache.component.mock'
import { mockLogger } from '../../factories/logger.mock'
import {
  mockQuery,
  mockRetrieve,
  mockDescribe,
  mockSearch,
  mockCreate,
  mockUpdate,
} from '../mock/sfclient.mock'
import {
  mockGetRoles,
  mockCreateRole,
  mockGrantPermissionToRole,
  mockCreatePermission,
  AuthState,
  mockDeletePermission,
} from '../mock/authclient.mock'
import { omit } from 'lodash'
// tslint:disable-next-line:no-implicit-dependencies
import { SuccessResult } from 'jsforce'
import { Arguments } from '../../util'
import { cartesian } from '../../util/fp'

describe('AffiliatesService', () => {
  let sfService: SalesforceClient
  let authService: AuthClient
  let affiliatesService: AffiliatesService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AffiliatesService],
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
      .overrideProvider(CacheService)
      .useClass(CacheServiceMock)
      .overrideProvider('LoggerService')
      .useValue(mockLogger)
      .compile()

    authService = module.get<AuthClient>(AuthClient)
    sfService = module.get<SalesforceClient>(SalesforceClient)
    affiliatesService = module.get<AffiliatesService>(AffiliatesService)
  })

  const accounts = [
    {
      Id: 'A000000000',
      Name: 'Account 0',
      Summary__c: 'Some Summary',
      Logo__c: 'https://path.to.logo.jpg',
      Website: 'https://path.to.website',
      Languages__c: 'English',
      RecordType: {
        DeveloperName: 'Licensed_Affiliate',
      },
    },
    {
      Id: 'A000000001',
      Name: 'Account 1',
      Summary__c: 'Some Summary',
      Logo__c: 'https://path.to.logo.jpg',
      Website: 'https://path.to.website',
      Languages__c: 'English',
      RecordType: {
        DeveloperName: 'Licensed_Affiliate',
      },
    },
    {
      Id: 'A000000002',
      Name: 'Account 2',
      Summary__c: 'Some Summary',
      Logo__c: 'https://path.to.logo.jpg',
      Website: 'https://path.to.website',
      Languages__c: 'English',
      RecordType: {
        DeveloperName: 'Account',
      },
    },
  ]

  const roles: Array<Required<authservices.Role>> = [
    {
      id: 0,
      name: 'Course Manager -- A000000001',
      permissions: [],
      users: [],
      service: 'affiliate-portal',
      _TagEmpty: false,
    },
    {
      id: 2,
      name: 'Course Manager -- A012300001',
      permissions: [],
      users: [],
      service: 'affiliate-portal',
      _TagEmpty: false,
    },
  ]

  const initialState = (): AuthState => ({
    Role: [],
    Permission: [],
    User: [],
  })

  describe('getAll', () => {
    it("gets all Accounts where DeveloperName is 'Licensed_Affiliate' and filters to those who have a Course Manager role", () => {
      const licensed = accounts.filter(
        a =>
          a.RecordType && a.RecordType.DeveloperName === 'Licensed_Affiliate',
      )

      jest
        .spyOn(sfService, 'query')
        .mockImplementation(mockQuery({ Account: licensed }))

      jest
        .spyOn(authService, 'getRoles')
        .mockImplementation(
          mockGetRoles({ "role.name LIKE 'Course Manager -- %'": roles }),
        )

      return expect(affiliatesService.getAll()).resolves.toEqual([
        omit(accounts[1], 'RecordType'),
      ])
    })
  })

  describe('get', () => {
    it('retrieves an Account with the passed id using sfService', () => {
      jest
        .spyOn(sfService, 'retrieve')
        .mockImplementation(mockRetrieve({ Account: accounts }))

      return expect(affiliatesService.get('A000000000')).resolves.toEqual(
        accounts[0],
      )
    })
  })

  describe('describe', () => {
    it('describes the Account object using sfService', () => {
      jest
        .spyOn(sfService, 'describe')
        .mockImplementation(mockDescribe({ Account: 'DescribeResult' }))

      return expect(affiliatesService.describe()).resolves.toEqual(
        'DescribeResult',
      )
    })
  })

  describe('search', () => {
    it('Searches the given SOSL query on Account objects, filtering results to those that are Licensed Affiliates', () => {
      const search = 'Some SOSL Search'
      const searchKey = `{${search}}`
      const retrieve = ['doesnt', 'really', 'matter']

      jest.spyOn(sfService, 'search').mockImplementation(
        mockSearch({
          [searchKey]: {
            Account: accounts,
          },
        }),
      )

      return expect(
        affiliatesService.search(search, retrieve),
      ).resolves.toEqual([accounts[0], accounts[1]])
    })
  })

  describe('searchCM', () => {
    it('Searches the given SOSL query on Contact objects, filtering to those with AccountId equaling given id', () => {
      const search = 'Some SOSL Search'
      const searchKey = `{${search}}`
      const retrieve = ['doesnt', 'really', 'matter']

      const contacts = [
        {
          Id: 'A10000000',
          AccountId: 'A00000000',
        },
        {
          Id: 'A10000001',
          AccountId: 'A00000000',
        },
        {
          Id: 'A10000002',
          AccountId: 'A00000001',
        },
      ]

      jest.spyOn(sfService, 'search').mockImplementation(
        mockSearch({
          [searchKey]: {
            Contact: contacts,
          },
        }),
      )

      return expect(
        affiliatesService.searchCM('A00000000', search, retrieve),
      ).resolves.toEqual([contacts[0], contacts[1]])
    })
  })

  describe('create', () => {
    it('creates a new account object and sets record type to Licensed_Affiliate using AffiliatesService.map', () => {
      expect.assertions(3)

      const success: SuccessResult[] = [
        {
          id: 'A000000001',
          success: true,
        },
      ]

      const mapSpy = jest.spyOn(affiliatesService, 'map').mockResolvedValue({})
      jest.spyOn(sfService, 'create').mockImplementation(mockCreate(success))

      return expect(affiliatesService.create({ Name: 'hi' }))
        .resolves.toEqual(success[0])
        .then(() =>
          Promise.all([
            expect(mapSpy).toHaveBeenCalledWith(success[0].id),
            expect(mapSpy).toHaveBeenCalledTimes(1),
          ]),
        )
    })
  })

  describe('map', () => {
    const createSpys = (
      authState: AuthState,
      sfState: Arguments<typeof mockUpdate>[0] = { Account: [] },
    ) => {
      const createRole = jest
        .spyOn(authService, 'createRole')
        .mockImplementation(mockCreateRole(authState))
      const grantPermissionToRole = jest
        .spyOn(authService, 'grantPermissionToRole')
        .mockImplementation(mockGrantPermissionToRole(authState))
      const createPermission = jest
        .spyOn(authService, 'createPermission')
        .mockImplementation(mockCreatePermission(authState))
      const update = jest
        .spyOn(sfService, 'update')
        .mockImplementation(mockUpdate(sfState))

      return { createRole, grantPermissionToRole, createPermission, update }
    }

    const id = 'A00000000'
    const wResource = workshopResource(id)
    const aResource = affiliateResource(id)
    // tslint:disable-next-line:variable-name
    const RecordTypeId = '012A0000000zpraIAA'

    it('creates a Course Manager role for the given id', async () => {
      expect.assertions(2)
      const { createRole } = createSpys(initialState())
      await affiliatesService.map(id)

      expect(createRole).toHaveBeenCalledTimes(1)
      expect(createRole).toHaveBeenCalledWith({
        name: `Course Manager -- ${id}`,
        service: 'affiliate-portal',
      })
    })

    it('grants workshop write permission and affiliate read permission to the course manager role', async () => {
      expect.assertions(2)
      const state = initialState()
      const { grantPermissionToRole } = createSpys(state)

      await affiliatesService.map(id)

      expect(grantPermissionToRole).toHaveBeenCalledWith(
        wResource,
        2,
        state.Role[0].id,
      )
      expect(grantPermissionToRole).toHaveBeenCalledWith(
        aResource,
        1,
        state.Role[0].id, // should always be 0 bc state is empty initially
      )
    })

    it('creates an affiliate and workshop permission with the given id for the remaining access levels', async () => {
      expect.assertions(4)
      const { createPermission } = createSpys(initialState())

      await affiliatesService.map(id)

      expect(createPermission).toHaveBeenCalledWith({
        resource: wResource,
        level: 0,
      })
      expect(createPermission).toHaveBeenCalledWith({
        resource: aResource,
        level: 0,
      })

      expect(createPermission).toHaveBeenCalledWith({
        resource: wResource,
        level: 1,
      })
      expect(createPermission).toHaveBeenCalledWith({
        resource: aResource,
        level: 2,
      })
    })

    it('uses sfService to update record with given id and associate a RecordType', async () => {
      expect.assertions(1)
      const { update } = createSpys(initialState(), { Account: [{ Id: id }] })

      await affiliatesService.map(id)

      expect(update).toHaveBeenCalledWith({
        object: 'Account',
        records: [{ Id: id, RecordTypeId }],
      })
    })

    // it('Does way too much for a single method')
  })

  describe('update', () => {
    it('updates the Account object using sfService.update', async () => {
      expect.assertions(1)

      const update = jest
        .spyOn(sfService, 'update')
        .mockResolvedValue([{ success: true, id: 'someid' }])

      const updateData: Arguments<AffiliatesService['update']>[0] = {
        Id: 'someid',
        Name: 'some name',
      }

      await affiliatesService.update(updateData)

      expect(update).toHaveBeenCalledWith({
        object: 'Account',
        records: [updateData],
      })
    })
  })

  describe('delete', () => {
    const createSpys = () => {
      jest.spyOn(affiliatesService, 'get').mockResolvedValue(accounts[0])

      const query = jest
        .spyOn(sfService, 'query')
        .mockImplementation(mockQuery({ Contact: [accounts[0]] }))

      const deletePermission = jest
        .spyOn(authService, 'deletePermission')
        .mockResolvedValue(true)

      const getRole = jest
        .spyOn(authService, 'getRole')
        .mockResolvedValue({ id: 0 })

      const deleteRole = jest
        .spyOn(authService, 'deleteRole')
        .mockResolvedValue(true)

      const deleteUser = jest
        .spyOn(authService, 'deleteUser')
        .mockResolvedValue(true)

      const update = jest
        .spyOn(affiliatesService, 'update')
        .mockResolvedValue({ success: true, id: accounts[0].Id })

      return {
        deletePermission,
        getRole,
        deleteRole,
        deleteUser,
        update,
        query,
      }
    }

    it('deletes the permissions for the given affiliate', async () => {
      expect.assertions(6)
      const id = accounts[0].Id
      const { deletePermission } = createSpys()

      jest
        .spyOn(affiliatesService, 'update')
        .mockResolvedValue({ success: true, id })

      await affiliatesService.delete(id)

      const toDelete = [
        ...cartesian([0, 1, 2], [workshopResource(id), affiliateResource(id)]),
      ]

      toDelete.forEach(([level, resource]) => {
        expect(deletePermission).toHaveBeenCalledWith(resource, level)
      })
    })

    it('deletes the course manager role for the given affiliate', async () => {
      expect.assertions(2)
      const { getRole, deleteRole } = createSpys()

      const id = accounts[0].Id

      await affiliatesService.delete(id)

      expect(getRole).toHaveBeenCalledWith(
        `role.name='Course Manager -- ${id}'`,
      )
      expect(deleteRole).toHaveBeenCalled()
    })

    it('deletes the associated facilitator logins for the given affiliate', async () => {
      const { query, deleteUser } = createSpys()

      const id = accounts[0].Id

      await affiliatesService.delete(id)

      expect(query).toHaveBeenCalledWith({
        fields: ['Id'],
        table: 'Contact',
        clauses: `Facilitator_For__c='${id}' AND RecordType.DeveloperName='Affiliate_Instructor'`,
      })

      expect(deleteUser).toHaveBeenCalled()
    })
  })
})
