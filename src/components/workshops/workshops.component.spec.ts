import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient } from '@shingo/auth-api-client'
import { WorkshopsService, workshopRecordResource } from './workshops.component'
import { Test } from '@nestjs/testing'
import { CacheService } from '../cache/cache.component'
import { CacheServiceMock } from '../cache/cache.component.mock'
import { AuthUser } from '../../guards/auth.guard'
import { Workshop__c } from '../../sf-interfaces/Workshop__c.interface'
import { omit } from 'lodash'

describe('FacilitatorsService', () => {
  let sfService: SalesforceClient
  let authService: AuthClient
  let wsService: WorkshopsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [WorkshopsService],
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
      .compile()

    authService = module.get<AuthClient>(AuthClient)
    sfService = module.get<SalesforceClient>(SalesforceClient)
    wsService = module.get<WorkshopsService>(WorkshopsService)
  })

  describe('getAll', () => {
    const workshops = [
      {
        Id: 'Hi',
      },
    ]
    const createSpys = (
      records = workshops,
      subrecords: Array<{ Instructors__r: Array<{ Instructor__r: any }> }> = [],
    ) => {
      const query = jest
        .spyOn(sfService, 'query')
        .mockResolvedValue({ records })

      const privateResults = records.map((r, i) => ({
        ...r,
        ...(subrecords[i] || { Instructors__r: [] }),
      }))

      const getPrivateWorkshops = jest
        .spyOn(wsService, 'getPrivateWorkshops')
        .mockResolvedValue(privateResults)

      return { query, getPrivateWorkshops }
    }

    it('queries Workshop__c records using sfService if a user is not passed', async () => {
      expect.assertions(3)
      const { getPrivateWorkshops, query } = createSpys()
      await wsService.getAll()
      expect(getPrivateWorkshops).not.toBeCalled()
      expect(query).toHaveBeenCalledTimes(1)
      expect(query.mock.calls[0][0]).toMatchObject({
        fields: [
          'Id',
          'Name',
          'Start_Date__c',
          'End_Date__c',
          'Course_Manager__c',
          'Billing_Contact__c',
          'Event_City__c',
          'Event_Country__c',
          'Organizing_Affiliate__c',
          'Public__c',
          'Registration_Website__c',
          'Status__c',
          'Host_Site__c',
          'Workshop_Type__c',
          'Language__c',
        ],
        table: 'Workshop__c',
      })
    })

    it('returns the result of the sfService call if a user is not passed', () => {
      createSpys()
      return expect(wsService.getAll()).resolves.toEqual(workshops)
    })

    it('uses getPrivateWorkshops to query private Workshop__c records if a user is passed', async () => {
      expect.assertions(3)
      const { getPrivateWorkshops, query } = createSpys()
      await wsService.getAll(false, { userrrr: 'hey' } as any)
      expect(query).not.toBeCalled()
      expect(getPrivateWorkshops).toHaveBeenCalledTimes(1)
      expect(getPrivateWorkshops.mock.calls[0]).toMatchObject([
        {
          fields: [
            'Id',
            'Name',
            'Start_Date__c',
            'End_Date__c',
            'Course_Manager__c',
            'Billing_Contact__c',
            'Event_City__c',
            'Event_Country__c',
            'Organizing_Affiliate__c',
            'Public__c',
            'Registration_Website__c',
            'Status__c',
            'Host_Site__c',
            'Workshop_Type__c',
            'Language__c',
          ],
          table: 'Workshop__c',
        },
        { userrrr: 'hey' },
      ])
    })

    it("returns the result of the getPrivateWorkshops call with an added 'facilitators' field if a user is passed", () => {
      const extra = [{ Instructors__r: [{ Instructor__r: { hi: 'there' } }] }]
      createSpys(workshops, extra)
      return expect(wsService.getAll(false, {} as any)).resolves.toEqual([
        {
          ...workshops[0],
          ...extra[0],
          facilitators: extra[0].Instructors__r.map(i => i.Instructor__r),
        },
      ])
    })
  })

  describe('getPrivateWorkshops', () => {
    const ids = ['id0', 'id1', 'id2', 'id3']
    const user = {
      // test that getWorkshopIds merges permissions from roles and user permissions
      roles: [
        {
          service: 'affiliate-portal',
          permissions: [
            // test that getWorkshopIds doesn't return ids not matching /workshops/:id
            { resource: '/asdfasdf/123dsd' },
            { resource: `/workshops/${ids[0]}` },
          ],
        },
        {
          // test that getWorkshopIds filters to only affiliate-portal roles
          service: 'something-else',
          permissions: [
            { resource: '/asdfasdf/123dsd' },
            { resource: `/workshops/asdfa` },
          ],
        },
        {
          service: 'affiliate-portal',
          permissions: [
            { resource: `/workshops/${ids[1]}` },
            { resource: `/workshops/${ids[2]}` },
          ],
        },
      ],
      permissions: [
        {
          resource: `/workshops/${ids[3]}`,
        },
        // test that getWorkshopIds doesn't return duplicates
        { resource: `/workshops/${ids[0]}` },
        { resource: '/asdfas/dasd.dsdad' },
      ],
    }

    const queryForResult = [
      {
        hello: 'there',
        Instructors__r: { records: [{ something: 'here' }] },
      },
      {
        general: 'kenobi',
      },
    ]

    it('calls queryForWorkshops with an updated query', async () => {
      const queryForWorkshops = jest
        .spyOn(wsService, 'queryForWorkshops')
        .mockResolvedValue(queryForResult)

      const baseQuery = {
        fields: ['A'],
        table: 'Workshop__c',
      }

      await wsService.getPrivateWorkshops(baseQuery, user as AuthUser)

      expect(queryForWorkshops.mock.calls[0][1]).toMatchObject({
        ...baseQuery,
        fields: [
          ...baseQuery.fields,
          `(SELECT Instructor__r.Id,Instructor__r.FirstName,Instructor__r.LastName,Instructor__r.Email,Instructor__r.Photograph__c FROM Instructors__r)`,
        ],
      })
    })

    it('calls queryForWorkshops with workshop ids that the user has permission for', async () => {
      const queryForWorkshops = jest
        .spyOn(wsService, 'queryForWorkshops')
        .mockResolvedValue(queryForResult)

      const baseQuery = {
        fields: ['A'],
        table: 'Workshop__c',
      }

      await wsService.getPrivateWorkshops(baseQuery, user as AuthUser)

      expect(queryForWorkshops.mock.calls[0][0]).toEqual(
        expect.arrayContaining(ids),
      )
    })

    it('returns the result of the queries with the sub-query QueryResult unwrapped', () => {
      jest
        .spyOn(wsService, 'queryForWorkshops')
        .mockResolvedValue(queryForResult)

      const baseQuery = {
        fields: ['A'],
        table: 'Workshop__c',
      }

      return expect(
        wsService.getPrivateWorkshops(baseQuery, user as AuthUser),
      ).resolves.toEqual(
        queryForResult.map(q => ({
          ...q,
          Instructors__r: (q.Instructors__r && q.Instructors__r.records) || [],
        })),
      )
    })
  })

  describe('queryForWorkshops', () => {
    it('queries using sfService limiting to the given ids', async () => {
      expect.assertions(2)
      const data = [{ hi: true }]
      const query = jest
        .spyOn(sfService, 'query')
        .mockResolvedValue({ records: data })
      const ids = ['1', '2', '3']
      const req = {
        fields: ['A', 'B', 'C'],
        table: 'Contacts',
      }
      const result = await wsService.queryForWorkshops(ids, req)
      expect(query).toBeCalledWith({
        ...req,
        clauses: `Id IN (${ids
          .map(i => `'${i}'`)
          .join()}) ORDER BY Start_Date__c`,
      })
      expect(result).toEqual(data)
    })
  })

  describe('get', () => {
    const retrieveContact = { is: 'contact', for: 'Course_Manager__r' }
    const retrieveAccount = { is: 'account', for: 'Organizing_Affiliate__r' }

    const createSpys = (
      workshop: null | Pick<
        Workshop__c,
        'Id' | 'Organizing_Affiliate__c' | 'Course_Manager__c'
      >,
      facData: Array<{ Instructor__r: any }> = [],
      files: any[] = [],
    ) => {
      const facilitators = jest
        .spyOn(wsService, 'facilitators')
        .mockResolvedValue(facData)

      let retrieve = jest
        .spyOn(sfService, 'retrieve')
        .mockResolvedValue({})
        .mockResolvedValueOnce([workshop])

      if (workshop && workshop.Course_Manager__c) {
        retrieve = retrieve.mockResolvedValueOnce([retrieveContact])
      }
      retrieve = retrieve.mockResolvedValueOnce([retrieveAccount])

      const getFiles = jest
        .spyOn(wsService, 'getFiles')
        .mockResolvedValue(files)

      return { retrieve, facilitators, getFiles }
    }

    it('calls retrieve using sfService for the given Workshop__c id', async () => {
      expect.assertions(1)
      const { retrieve } = createSpys(null)

      await wsService.get('Some Workshop Id')

      expect(retrieve).toHaveBeenCalledWith({
        object: 'Workshop__c',
        ids: ['Some Workshop Id'],
      })
    })

    it('returns undefined if the retrieve result is null', () => {
      createSpys(null)
      return expect(wsService.get('Some Workshop Id')).resolves.toBeUndefined()
    })

    it('calls WorkshopService.facilitators to add the facilitators field to the retrieve result', async () => {
      const workshop = {
        Id: 'Hi',
        Organizing_Affiliate__c: 'There',
      }
      const { facilitators } = createSpys(workshop)

      await wsService.get('Hi')

      expect(facilitators).toHaveBeenCalledWith('Hi')
    })

    it('gets the Course_Manager__r relation if the workshop has Course_Manager__c', async () => {
      expect.assertions(2)
      const workshop = {
        Id: 'Hi',
        Organizing_Affiliate__c: 'There',
        Course_Manager__c: 'General',
      }
      const { retrieve } = createSpys(workshop)

      await wsService.get('Hi')

      expect(retrieve).toHaveBeenCalledWith({
        object: 'Contact',
        ids: [workshop.Course_Manager__c],
      })
      expect(retrieve).toHaveBeenCalledTimes(3)
    })

    it("doesn't get the Course_Manager__r relation if the workshop doesn't have Course_Manager__c", async () => {
      expect.assertions(1)
      const workshop = {
        Id: 'Hi',
        Organizing_Affiliate__c: 'There',
      }
      const { retrieve } = createSpys(workshop)

      await wsService.get('Hi')

      expect(retrieve).toHaveBeenCalledTimes(2)
    })

    it('gets the Organizing_Affiliate__r relation', async () => {
      expect.assertions(2)
      const workshop = {
        Id: 'Hi',
        Organizing_Affiliate__c: 'There',
      }
      const { retrieve } = createSpys(workshop)

      await wsService.get('Hi')

      expect(retrieve).toHaveBeenCalledTimes(2)
      expect(retrieve).toHaveBeenCalledWith({
        object: 'Account',
        ids: [workshop.Organizing_Affiliate__c],
      })
    })

    it('adds files to the retrieve result using WorkshopService.getFiles', async () => {
      expect.assertions(1)
      const workshop = {
        Id: 'Hi',
        Organizing_Affiliate__c: 'There',
      }
      const { getFiles } = createSpys(workshop)

      await wsService.get('Hi')

      expect(getFiles).toHaveBeenCalledWith(workshop.Id)
    })

    it('returns the final combined result', async () => {
      const workshop = {
        Id: 'Hi',
        Organizing_Affiliate__c: 'There',
        Course_Manager__c: 'There',
      }
      const files = [{ some: 'file' }]
      const facData = [{ Instructor__r: { some: 'instructor' } }]
      createSpys(workshop, facData, files)

      const result = await wsService.get('Hi')

      expect(result).toEqual({
        ...workshop,
        Organizing_Affiliate__r: retrieveAccount,
        Course_Manager__r: retrieveContact,
        files,
        facilitators: facData.map(f => f.Instructor__r),
      })
    })
  })

  describe('getFiles', () => {
    it('queries salesforce for the Attachment object and returns the records', async () => {
      const data = { records: [{ data: 'here' }] }
      const query = jest.spyOn(sfService, 'query').mockResolvedValue(data)

      const id = 'Id'
      const result = await wsService.getFiles(id)

      expect(query).toHaveBeenCalledWith({
        fields: ['Name', 'ParentId', 'ContentType', 'BodyLength'],
        table: 'Attachment',
        clauses: `ParentId='${id}'`,
      })

      expect(result).toEqual(data.records)
    })
  })

  describe('describe', () => {
    it('describes the Workshop__c object', async () => {
      const describe = jest
        .spyOn(sfService, 'describe')
        .mockResolvedValue('hasdf')
      const res = await wsService.describe()
      expect(describe).toHaveBeenCalledWith('Workshop__c')
      expect(res).toEqual('hasdf')
    })
  })

  describe('search', () => {
    it('searches on Workshop__c using sfService', async () => {
      const search = jest
        .spyOn(sfService, 'search')
        .mockResolvedValue({ searchRecords: ['asdf'] })
      const fields = ['asdf']
      const searchStr = '*hi*'

      const result = await wsService.search(searchStr, fields)
      expect(search).toHaveBeenCalledWith({
        search: `{${searchStr}}`,
        retrieve: `Workshop__c(${fields.join()})`,
      })
      expect(result).toEqual(['asdf'])
    })
  })

  describe('facilitators', () => {
    const createSpys = (
      queryRecords: Array<{ Instructor__r: { Id: string } }> = [],
      users: Array<{ extId: string; id: number }> = [],
    ) => {
      const query = jest
        .spyOn(sfService, 'query')
        .mockResolvedValue({ records: queryRecords })

      const getUsers = jest
        .spyOn(authService, 'getUsers')
        .mockResolvedValue(users)

      return { query, getUsers }
    }

    it('queries using sfService for WorkshopFacilitatorAssociations with a workshop matching the passed id', async () => {
      expect.assertions(1)
      const { query } = createSpys()
      const id = 'SOKdmfaldm'

      await wsService.facilitators(id)

      expect(query).toHaveBeenCalledWith({
        fields: [
          'Id',
          'Instructor__r.Id',
          'Instructor__r.FirstName',
          'Instructor__r.LastName',
          'Instructor__r.Name',
          'Instructor__r.AccountId',
          'Instructor__r.Email',
          'Instructor__r.Title',
        ],
        table: 'WorkshopFacilitatorAssociation__c',
        clauses: `Workshop__c='${id}'`,
      })
    })

    it('uses authService to find associated auth accounts for every facilitator', async () => {
      expect.assertions(1)
      const assocRecords = [
        { Instructor__r: { Id: 'hi' } },
        { Instructor__r: { Id: 'there' } },
      ]
      const { getUsers } = createSpys(assocRecords)
      const id = 'SOKdmfaldm'

      await wsService.facilitators(id)

      const ids = assocRecords.map(r => `'${r.Instructor__r.Id}'`)
      expect(getUsers).toHaveBeenCalledWith(`user.extId IN (${ids.join()})`)
    })

    it('returns the query result with associated auth accounts added to the record', async () => {
      expect.assertions(1)
      const assocRecord = { Instructor__r: { Id: 'hi' } }
      const auth = { extId: 'hi', id: 1 }
      createSpys([assocRecord], [auth])
      const id = 'SOKdmfaldm'

      const result = await wsService.facilitators(id)

      expect(result).toEqual([
        {
          ...assocRecord,
          id: auth.id,
          auth,
        },
      ])
    })
  })

  describe('create', () => {
    const createSpys = () => ({
      create: jest
        .spyOn(sfService, 'create')
        .mockResolvedValue([{ success: true, id: 'CREATE_ID' }]),
      grantPermissions: jest
        .spyOn(wsService, 'grantPermissions')
        .mockResolvedValue('asdfasdfasdf'),
    })

    it('creates a Workshop__c object using sfService', async () => {
      expect.assertions(1)
      const { create } = createSpys()

      const workshop = {
        Name: 'hi',
        Start_Date__c: 'Now',
        End_Date__c: 'Then',
        Organizing_Affiliate__c: 'Some Id',
        Course_Manager__c: 'Some Other Id',
        facilitators: [{ Id: 'Some Another Id', id: 1 }],
      }

      await wsService.create(workshop)

      expect(create).toHaveBeenCalledWith({
        object: 'Workshop__c',
        records: [omit(workshop, 'facilitators')],
      })
    })

    it('calls WorkshopService.grantPermissions to grant permissions to the new workshop', async () => {
      expect.assertions(1)
      const { grantPermissions } = createSpys()

      const workshop = {
        Name: 'hi',
        Start_Date__c: 'Now',
        End_Date__c: 'Then',
        Organizing_Affiliate__c: 'Some Id',
        Course_Manager__c: 'Some Other Id',
        facilitators: [{ Id: 'Some Another Id', id: 1 }],
      }

      await wsService.create(workshop)

      expect(grantPermissions).toHaveBeenCalledWith({
        ...workshop,
        Id: 'CREATE_ID',
      })
    })

    it('returns the result of sfService.create', () => {
      createSpys()

      const workshop = {
        Name: 'hi',
        Start_Date__c: 'Now',
        End_Date__c: 'Then',
        Organizing_Affiliate__c: 'Some Id',
        Course_Manager__c: 'Some Other Id',
        facilitators: [{ Id: 'Some Another Id', id: 1 }],
      }

      return expect(wsService.create(workshop)).resolves.toEqual({
        success: true,
        id: 'CREATE_ID',
      })
    })
  })

  describe('update', () => {
    const currentFacilitators = [
      { Id: 'AssocId1', Instructor__r: { Id: 'FacId1' } },
      { Id: 'AssocId2', Instructor__r: { Id: 'FacId2' } },
    ]
    const updateResult = { success: true, id: 'UPDATE_ID' }
    const createSpys = (facs = currentFacilitators) => {
      const update = jest
        .spyOn(sfService, 'update')
        .mockResolvedValue([updateResult])

      const facilitators = jest
        .spyOn(wsService, 'facilitators')
        .mockResolvedValue(facs)

      const grantPermissions = jest
        .spyOn(wsService, 'grantPermissions')
        .mockResolvedValue({})

      const removePermissions = jest
        .spyOn(wsService, 'removePermissions')
        .mockResolvedValue({})

      return { update, facilitators, grantPermissions, removePermissions }
    }

    it('updates the workshop using sfService', async () => {
      expect.assertions(1)
      const { update } = createSpys()
      const workshop = {
        Id: 'SomeId',
        Organizing_Affiliate__c: 'SomeOrgId',
        facilitators: [],
      }

      await wsService.update(workshop)

      expect(update).toHaveBeenCalledWith({
        object: 'Workshop__c',
        records: [omit(workshop, 'facilitators')],
      })
    })

    it('gets the current facilitators for the workshop', async () => {
      expect.assertions(1)
      const { facilitators } = createSpys()

      const workshop = {
        Id: 'SomeId',
        Organizing_Affiliate__c: 'SomeOrgId',
        facilitators: [],
      }

      await wsService.update(workshop)

      expect(facilitators).toHaveBeenCalledWith(workshop.Id)
    })

    it('removes permissions for existing facilitators not specified in the update data', async () => {
      expect.assertions(2)
      const { removePermissions } = createSpys()
      const workshop = {
        Id: 'SomeId',
        Organizing_Affiliate__c: 'SomeOrgId',
        facilitators: [],
      }

      await wsService.update(workshop)

      expect(removePermissions).toHaveBeenCalledWith(
        workshop.Id,
        currentFacilitators,
      )

      const workshop2 = {
        Id: 'SomeId',
        Organizing_Affiliate__c: 'SomeOrgId',
        facilitators: [{ Id: currentFacilitators[0].Instructor__r.Id, id: 0 }],
      }

      await wsService.update(workshop2)

      expect(removePermissions).toHaveBeenCalledWith(workshop2.Id, [
        currentFacilitators[1],
      ])
    })

    it('grants permissions for non-existing facilitators specified in the update data', async () => {
      expect.assertions(1)
      const { grantPermissions } = createSpys()

      const workshop = {
        Id: 'SomeId',
        Organizing_Affiliate__c: 'SomeOrgId',
        facilitators: [
          { Id: 'A new Id here', id: 0 },
          { Id: currentFacilitators[0].Instructor__r.Id, id: 1 },
        ],
      }

      await wsService.update(workshop)

      expect(grantPermissions).toHaveBeenCalledWith({
        ...workshop,
        facilitators: [workshop.facilitators[0]],
      })
    })

    it('returns the result of sfService.update', () => {
      createSpys()
      const workshop = {
        Id: 'SomeId',
        Organizing_Affiliate__c: 'SomeOrgId',
        facilitators: [],
      }

      return expect(wsService.update(workshop)).resolves.toEqual(updateResult)
    })
  })

  describe('upload', () => {
    it('creates a new Attachment object with the files using sfService and returns the result', async () => {
      expect.assertions(2)
      const createResult = [{ success: true, id: 'asdfa' }]
      const create = jest
        .spyOn(sfService, 'create')
        .mockResolvedValue(createResult)

      const id = 'ParentId'
      const fileName = 'fileName'
      const files = ['file1', 'file1']
      const contentType = 'text/plain'
      const res = await wsService.upload(id, fileName, files, contentType)

      expect(create).toHaveBeenCalledWith({
        object: 'Attachment',
        records: [
          {
            ParentId: id,
            Name: `0-${fileName}`,
            Body: files[0],
            ContentType: contentType,
          },
          {
            ParentId: id,
            Name: `1-${fileName}`,
            Body: files[1],
            ContentType: contentType,
          },
        ],
      })

      expect(res).toEqual(createResult)
    })
  })

  describe('delete', () => {
    const createSpys = () => ({
      delete_: jest
        .spyOn(sfService, 'delete')
        .mockResolvedValue([{ success: true, id: 'DELETE_ID' }]),
      deletePermission: jest
        .spyOn(authService, 'deletePermission')
        .mockResolvedValue({}),
    })

    it('deletes the workshop with the given id using sfService', async () => {
      expect.assertions(1)
      const { delete_ } = createSpys()

      await wsService.delete('someid')
      expect(delete_).toHaveBeenCalledWith({
        object: 'Workshop__c',
        ids: ['someid'],
      })
    })

    it('deletes all permissions for the workshopRecordResource with the given id', async () => {
      expect.assertions(4)
      const { deletePermission } = createSpys()
      const id = 'someid'
      await wsService.delete(id)

      const resource = workshopRecordResource(id)
      expect(deletePermission).toHaveBeenCalledTimes(3)
      expect(deletePermission).toHaveBeenCalledWith(resource, 0)
      expect(deletePermission).toHaveBeenCalledWith(resource, 1)
      expect(deletePermission).toHaveBeenCalledWith(resource, 2)
    })

    it('returns the result of the sfService.delete call', () => {
      createSpys()
      return expect(wsService.delete('someid')).resolves.toEqual({
        success: true,
        id: 'DELETE_ID',
      })
    })
  })

  describe('cancel', () => {
    const createSpys = () => ({
      update: jest.spyOn(sfService, 'update').mockResolvedValue({}),
      create: jest
        .spyOn(sfService, 'create')
        .mockResolvedValue([{ id: 'CREATE_ID', success: true }]),
    })

    it('sets the status to Cancelled for the workshop with the given id', async () => {
      expect.assertions(1)
      const { update } = createSpys()
      await wsService.cancel('someid', 'the reason')
      expect(update).toHaveBeenCalledWith({
        object: 'Workshop__c',
        records: [{ Id: 'someid', Status__c: 'Cancelled' }],
      })
    })

    it('creates a Reasons for Cancelling note with the given reason as the body', async () => {
      expect.assertions(1)
      const { create } = createSpys()

      await wsService.cancel('someid', 'the reason')
      expect(create).toHaveBeenCalledWith({
        object: 'Note',
        records: [
          {
            Title: 'Reasons for Cancelling',
            Body: 'the reason',
            ParentId: 'someid',
          },
        ],
      })
    })

    it('returns the result of creating the note', () => {
      createSpys()
      return expect(wsService.cancel('someid', 'the reason')).resolves.toEqual({
        id: 'CREATE_ID',
        success: true,
      })
    })
  })

  describe('grantPermissions', () => {
    const createResult = [{ success: true, id: 'AssocId' }]
    const grantUserResult = { to: 'user' }
    const grantRoleResult = { to: 'role' }
    const createSpys = (roles: Array<{ id: number }> = []) => ({
      create: jest.spyOn(sfService, 'create').mockResolvedValue(createResult),
      grantPermissionToUser: jest
        .spyOn(authService, 'grantPermissionToUser')
        .mockResolvedValue(grantUserResult),
      getRoles: jest.spyOn(authService, 'getRoles').mockResolvedValue(roles),
      grantPermissionToRole: jest
        .spyOn(authService, 'grantPermissionToRole')
        .mockResolvedValue(grantRoleResult),
    })
    const workshop = {
      Id: 'OrgId',
      Organizing_Affiliate__c: 'OrgId',
      facilitators: [{ Id: 'fac1', id: 0 }, { Id: 'fac2', id: 1 }],
    }
    it('creates a WorkshopFacilitatorAssociation__c object using sfService for every given facilitator', async () => {
      expect.assertions(2)
      const { create } = createSpys()
      await wsService.grantPermissions(workshop)

      expect(create).toHaveBeenCalledTimes(1)
      expect(create).toHaveBeenCalledWith({
        object: 'WorkshopFacilitatorAssociation__c',
        records: [
          {
            Workshop__c: workshop.Id,
            Instructor__c: workshop.facilitators[0].Id,
          },
          {
            Workshop__c: workshop.Id,
            Instructor__c: workshop.facilitators[1].Id,
          },
        ],
      })
    })

    it('grants write permission to every given facilitator for the given workshop resource', async () => {
      expect.assertions(3)
      const { grantPermissionToUser } = createSpys()

      await wsService.grantPermissions(workshop)

      const resource = workshopRecordResource(workshop.Id)
      expect(grantPermissionToUser).toHaveBeenCalledTimes(2)
      expect(grantPermissionToUser).toHaveBeenCalledWith(
        resource,
        2,
        workshop.facilitators[0].id,
      )
      expect(grantPermissionToUser).toHaveBeenCalledWith(
        resource,
        2,
        workshop.facilitators[1].id,
      )
    })

    it('grants permission for the workshopResource to the Affiliate Manager and Course Manager roles', async () => {
      expect.assertions(4)
      const roles = [{ id: 0 }, { id: 1 }]
      const { getRoles, grantPermissionToRole } = createSpys(roles)

      const resource = workshopRecordResource(workshop.Id)
      await wsService.grantPermissions(workshop)

      expect(getRoles).toHaveBeenCalledWith(
        `role.name='Affiliate Manager' OR role.name='Course Manager -- ${
          workshop.Organizing_Affiliate__c
        }'`,
      )
      expect(grantPermissionToRole).toHaveBeenCalledTimes(2)
      expect(grantPermissionToRole).toHaveBeenCalledWith(
        resource,
        2,
        roles[0].id,
      )
      expect(grantPermissionToRole).toHaveBeenCalledWith(
        resource,
        2,
        roles[1].id,
      )
    })

    it('returns an array containing the results of all the api calls', () => {
      createSpys([{ id: 0 }])

      return expect(wsService.grantPermissions(workshop)).resolves.toEqual([
        // looped over the two passed facilitators
        // we create all of the records in one request
        createResult,
        grantUserResult,
        grantUserResult,
        // looped over the single role
        grantRoleResult,
      ])
    })
  })

  describe('removePermissions', () => {
    const deleteResult = [{ success: true, id: 'DELETE_ID' }]
    const revokeResult = { for: 'revoke' }
    const authUsers = [{ id: 0 }]
    const createSpys = (users: Array<{ id: number }> = []) => ({
      delete_: jest.spyOn(sfService, 'delete').mockResolvedValue(deleteResult),
      revokePermissionFromUser: jest
        .spyOn(authService, 'revokePermissionFromUser')
        .mockResolvedValue(revokeResult),
      getUsers: jest.spyOn(authService, 'getUsers').mockResolvedValue(users),
    })

    it('deletes the WorkshopFacilitatorAssociation__c object for the given ids using sfService', async () => {
      expect.assertions(1)
      const { delete_ } = createSpys()

      const id = 'someid'
      const remove = [{ Id: 'AssocId', Instructor__r: { Id: 'FacId' } }]
      await wsService.removePermissions(id, remove)

      expect(delete_).toHaveBeenCalledWith({
        object: 'WorkshopFacilitatorAssociation__c',
        ids: [remove[0].Id],
      })
    })

    it('revokes permissions from the associated users', async () => {
      expect.assertions(2)
      const { getUsers, revokePermissionFromUser } = createSpys(authUsers)

      const id = 'someid'
      const remove = [{ Id: 'AssocId', Instructor__r: { Id: 'FacId' } }]
      await wsService.removePermissions(id, remove)

      const resource = workshopRecordResource(id)
      expect(getUsers).toHaveBeenCalledWith(
        `user.extId IN ('${remove[0].Instructor__r.Id}')`,
      )
      expect(revokePermissionFromUser).toHaveBeenCalledWith(
        resource,
        2,
        authUsers[0].id,
      )
    })

    it('makes no calls if remove is an empty array', async () => {
      expect.assertions(3)
      const { getUsers, revokePermissionFromUser, delete_ } = createSpys(
        authUsers,
      )
      await wsService.removePermissions('someid', [])

      expect(getUsers).toHaveBeenCalledTimes(0)
      expect(revokePermissionFromUser).toHaveBeenCalledTimes(0)
      expect(delete_).toHaveBeenCalledTimes(0)
    })

    it('returns an array of the results of calling sfService.delete and authservice.revokePermissionFromUser', () => {
      createSpys(authUsers)

      const id = 'someid'
      const remove = [{ Id: 'AssocId', Instructor__r: { Id: 'FacId' } }]
      return expect(wsService.removePermissions(id, remove)).resolves.toEqual([
        deleteResult,
        revokeResult,
      ])
    })
  })
})
