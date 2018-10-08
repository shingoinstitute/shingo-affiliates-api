import { Inject, Injectable } from '@nestjs/common'
import { CacheService } from '../'
import { Workshop__c } from '../../sf-interfaces/Workshop__c.interface'
import _, { chunk } from 'lodash'
import {
  RequireKeys,
  getWorkshopIds,
  Arguments,
  retrieveResult,
  tryCache,
  Overwrite,
  ArrayValue,
} from '../../util'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient, authservices } from '@shingo/auth-api-client'
import { LoggerInstance } from 'winston'
// tslint:disable-next-line:no-implicit-dependencies
import { QueryResult, SuccessResult } from 'jsforce'
import { AuthUser } from '../../guards/auth.guard'
import { flatten, multimap, tuple } from '../../util/fp'
import { Contact } from '../../sf-interfaces/Contact.interface'
import { Account } from '../../sf-interfaces/Account.interface'
import { WorkshopFacilitatorAssociation__c } from '../../sf-interfaces/WorkshopFacilitatorAssociation__c.interface'
import { Awaited } from '../../util/types'
import { Attachment } from '../../sf-interfaces/Attachment.interface'

type SFQuery = Arguments<SalesforceClient['query']>[0]
export const workshopRecordResource = (id: string) => `/workshops/${id}`

/**
 * @desc A service to provide functions for working with Workshops
 *
 * @export
 * @class WorkshopsService
 */
@Injectable()
export class WorkshopsService {
  constructor(
    private sfService: SalesforceClient,
    private authService: AuthClient,
    private cache: CacheService,
    @Inject('LoggerService') private log: LoggerInstance,
  ) {}

  /**
   * Get all workshops that the current session's user has permissions for (or all publicly listed workshps).
   *
   * The function assembles a list of workshop ids form the users permissions to query Salesforce.
   *
   * @param refresh Force the refresh of the cache
   * @param user Indicates that isPublic === false. The user to filter permissions for
   * user needs permissions[] and roles[].permissions[]
   */
  getAll(refresh = false, user?: AuthUser) {
    const keyBase = 'WorkshopsService.getAll'
    const key = user ? keyBase + '_public' : keyBase

    type QueryData = Pick<
      Workshop__c,
      | 'Id'
      | 'Name'
      | 'Start_Date__c'
      | 'End_Date__c'
      | 'Course_Manager__c'
      | 'Billing_Contact__c'
      | 'Event_City__c'
      | 'Event_Country__c'
      | 'Organizing_Affiliate__c'
      | 'Public__c'
      | 'Registration_Website__c'
      | 'Status__c'
      | 'Host_Site__c'
      | 'Workshop_Type__c'
      | 'Language__c'
    >

    const query = {
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
      clauses: `Public__c=true AND Status__c='Verified' ORDER BY Start_Date__c`,
    }

    return tryCache(
      this.cache,
      key,
      () => {
        if (user) {
          return this.getPrivateWorkshops<QueryData>(query, user).then(ws =>
            ws.map(w => ({
              ...w,
              facilitators: w.Instructors__r.map(i => i.Instructor__r),
            })),
          )
        }

        return this.sfService.query<QueryData>(query).then(r => r.records)
      },
      refresh,
    )
  }

  async getPrivateWorkshops<BaseQueryData extends Partial<Workshop__c>>(
    baseQuery: SFQuery,
    user: AuthUser,
  ) {
    type SubSelectFields = Pick<
      Contact,
      'Id' | 'FirstName' | 'LastName' | 'Email' | 'Photograph__c'
    >
    interface SubSelectResult {
      Instructors__r?: QueryResult<{ Instructor__r: SubSelectFields }>
    }

    const subSelectFields = [
      'Instructor__r.Id',
      'Instructor__r.FirstName',
      'Instructor__r.LastName',
      'Instructor__r.Email',
      'Instructor__r.Photograph__c',
    ]

    const query = {
      ...baseQuery,
      fields: [
        ...baseQuery.fields,
        `(SELECT ${subSelectFields.join()} FROM Instructors__r)`,
      ],
    }

    const ids = getWorkshopIds(user)
    if (ids.length === 0) return []

    const workshops = flatten(
      await Promise.all(
        // our api has max of 200 records it can query at a time I guess?
        chunk(ids, 200).map(chunkedIds =>
          this.queryForWorkshops<BaseQueryData & SubSelectResult>(
            chunkedIds,
            query,
          ),
        ),
      ),
    )

    // unwrap the child-select QueryResult
    return workshops.map(
      r =>
        // tslint:disable-next-line:no-object-literal-type-assertion
        ({
          ...(r as object),
          Instructors__r: (r.Instructors__r && r.Instructors__r.records) || [],
        } as Overwrite<
          typeof r,
          { Instructors__r: Array<{ Instructor__r: SubSelectFields }> }
        >),
    )
  }

  queryForWorkshops<T extends Partial<Workshop__c>>(
    ids: ReadonlyArray<string>,
    query: SFQuery,
  ) {
    const newQuery = {
      ...query,
      clauses: `Id IN (${ids
        .map(i => `'${i}'`)
        .join()}) ORDER BY Start_Date__c`,
    }
    return this.sfService.query<T>(newQuery).then(r => r.records)
  }

  /**
   * Get a specific workshop by Salesforce ID. Retrieves all fields of the Workshop__c object.
   *
   * @param id - A Salesforce ID corresponding to a Workshop__c record
   */
  get(id: string): Promise<Workshop__c | undefined> {
    return tryCache(this.cache, id, async () => {
      const workshop:
        | Workshop__c & {
            facilitators?: Array<
              ArrayValue<
                Awaited<ReturnType<WorkshopsService['facilitators']>>
              >['Instructor__r']
            >
            files?: Array<Partial<Attachment>>
          }
        | null = await this.sfService
        .retrieve<Workshop__c>({
          object: 'Workshop__c',
          ids: [id],
        })
        .then(retrieveResult)

      if (workshop === null) return undefined

      // tslint:disable:variable-name
      const [
        facilitators,
        Course_Manager__r,
        Organizing_Affiliate__r,
        files,
      ] = await Promise.all(
        tuple(
          this.facilitators(id).then(r => r.map(f => f.Instructor__r)),
          workshop.Course_Manager__c
            ? this.sfService
                .retrieve<Contact>({
                  object: 'Contact',
                  ids: [workshop.Course_Manager__c],
                })
                .then(retrieveResult)
            : null,
          this.sfService
            .retrieve<Account>({
              object: 'Account',
              ids: [workshop.Organizing_Affiliate__c],
            })
            .then(retrieveResult),
          this.getFiles(workshop.Id),
        ),
      )
      // tslint:enable:variable-name

      workshop.facilitators = facilitators
      workshop.Course_Manager__r = Course_Manager__r
      // describe result for Workshop__c says this relation must always exist
      workshop.Organizing_Affiliate__r = Organizing_Affiliate__r as Account
      workshop.files = files

      return workshop
    })
  }

  getFiles(id: string) {
    const query = {
      fields: ['Name', 'ParentId', 'ContentType', 'BodyLength'],
      table: 'Attachment',
      clauses: `ParentId='${id}'`,
    }

    type QueryData = Pick<
      Attachment,
      'Name' | 'ParentId' | 'ContentType' | 'BodyLength'
    >
    return this.sfService.query<QueryData>(query).then(r => r.records || [])
  }

  /**
   * Describes the Workshop__c object
   *
   * See the Salesforce documentation for more about 'describe'
   *
   * @param refresh Force the refresh of the cache
   */
  describe(refresh = false) {
    // Set the key for the cache
    const key = 'describeWorkshops'

    return tryCache(
      this.cache,
      key,
      () => this.sfService.describe('Workshop__c'),
      refresh,
    )
  }

  /**
   * Executes a SOSL query to search for text on workshop records in Salesforce.
   *
   * @param search SOSL search expression (i.e. '*Discover Test*')
   * @param retrieve A comma seperated list of the Workshop__c fields to retrieve (i.e. 'Id, Name, Start_Date__c')
   * @param refresh Used to force the refresh of the cache
   */
  search(search: string, retrieve: string[], refresh = false) {
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Workshop__c(${retrieve.join()})`,
    }

    return tryCache(
      this.cache,
      data,
      () =>
        this.sfService
          .search<Partial<Workshop__c>>(data)
          .then(s => s.searchRecords || []),
      refresh,
    )
  }

  /**
   * Get the associated instructors for the workshop with given id.
   *
   * @param id - A Salesforce ID corresponding to a Workshop__c record
   */
  facilitators(id: string) {
    const key = id + '_facilitators'
    type QueryData = Pick<WorkshopFacilitatorAssociation__c, 'Id'> & {
      Instructor__r: Pick<
        Contact,
        | 'Id'
        | 'FirstName'
        | 'LastName'
        | 'Name'
        | 'AccountId'
        | 'Email'
        | 'Title'
      >
    }

    return tryCache(this.cache, key, async () => {
      const query = {
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
      }

      const facAssociation: Array<
        QueryData & { id?: number; auth?: authservices.User }
      > = await this.sfService
        .query<QueryData>(query)
        .then(r => r.records || [])
      const ids = facAssociation.map(fac => `'${fac.Instructor__r.Id}'`)
      const auths = await this.authService.getUsers(
        `user.extId IN (${ids.join()})`,
      )

      for (const fac of facAssociation) {
        const auth = auths.find(a => a.extId === fac.Instructor__r.Id)
        if (auth) {
          fac.id = auth.id
          fac.auth = auth
        }
      }

      return facAssociation
    })
  }

  /**
   * Creates a new workshop in Salesforce and creates permissions for the workshop in the Shingo Auth API.
   *
   * @param workshop The workshop to be created
   */
  // tslint:disable-next-line:max-line-length
  async create(
    workshop: RequireKeys<
      Partial<Workshop__c>,
      | 'Name'
      | 'Start_Date__c'
      | 'End_Date__c'
      | 'Organizing_Affiliate__c'
      | 'Course_Manager__c'
    > & { facilitators: Array<{ Id: string; id: number }> },
  ) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [_.omit(workshop, ['facilitators'])],
    }

    const result = (await this.sfService.create(data))[0]

    const newWorkshop = { ...workshop, Id: result.id }
    await this.grantPermissions(newWorkshop)

    this.cache.invalidate('WorkshopsService.getAll')

    return result
  }

  /**
   * Updates a workshop's fields. Updates instructor associations and permissions.
   *
   * @param workshop The workshop
   */
  async update(
    workshop: RequireKeys<
      Partial<Workshop__c>,
      'Id' | 'Organizing_Affiliate__c'
    > & {
      facilitators: Array<{ Id: string; id: number }>
    },
  ) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [_.omit(workshop, ['facilitators'])],
    }

    const result = (await this.sfService.update(data))[0]

    const currFacilitators = await this.facilitators(workshop.Id)
    // returns facilitators that are in currFacilitators, but not in workshop.facilitators
    const removeFacilitators = _.differenceWith(
      currFacilitators,
      workshop.facilitators || [],
      // FIXME: not sure about this comparison, other.Id may just refer to the join object and not an actual facilitator
      (val, other) => other && val.Instructor__r.Id === other.Id,
    )

    // for grantPermissions, new facilitators are those that do not currently exist (not in currFacilitators)
    const newFacilitators = _.differenceWith(
      workshop.facilitators,
      currFacilitators,
      (val, other) => other && val.Id === other.Instructor__r.Id,
    )

    await Promise.all([
      this.grantPermissions({ ...workshop, facilitators: newFacilitators }),
      this.removePermissions(workshop.Id, removeFacilitators),
    ])

    this.cache.invalidate(workshop.Id!)
    this.cache.invalidate(`${workshop.Id}_facilitators`)
    this.cache.invalidate('WorkshopsService.getAll')

    return result
  }

  /**
   * @desc Upload a file(s) as an attachment to the specified record
   *
   * @param id Id of the record to attach file to
   * @param fileName The name of the file
   * @param files The files to attach (base 64)
   * @param contentType The mime type of the files
   */
  async upload(
    id: string,
    fileName: string,
    files: string[],
    contentType = 'text/csv',
  ) {
    const records = files.map((file, fileId) => ({
      ParentId: id,
      Name: `${fileId}-${fileName}`,
      Body: file,
      ContentType: contentType,
    }))

    const data = {
      object: 'Attachment',
      records,
    }

    const result = await this.sfService.create(data)

    this.cache.invalidate(id)
    return result
  }

  /**
   * Deletes the workshop given by id in Salesforce and removes the permission in the Auth API.
   *
   * @param id The workshop id
   */
  async delete(id: string) {
    // Create the data parameter for the RPC call
    const data = {
      object: 'Workshop__c',
      ids: [id],
    }

    const resource = workshopRecordResource(id)

    const permPs = ([0, 1, 2] as [0, 1, 2]).map(level =>
      this.authService.deletePermission(resource, level),
    )

    const [result] = await Promise.all(
      tuple(this.sfService.delete(data), ...permPs),
    )

    this.cache.invalidate(id)
    this.cache.invalidate(`${id}_facilitators`)
    this.cache.invalidate('WorkshopsService.getAll')
    this.cache.invalidate('WorkshopsService.getAll_public')

    return result[0]
  }

  async cancel(id: string, reason: string) {
    const updateData = {
      object: 'Workshop__c',
      records: [{ Id: id, Status__c: 'Cancelled' }],
    }

    const noteData = {
      object: 'Note',
      records: [
        {
          Title: 'Reasons for Cancelling',
          Body: reason,
          ParentId: id,
        },
      ],
    }

    const [, note] = await Promise.all([
      this.sfService.update(updateData),
      this.sfService.create(noteData),
    ])

    this.cache.invalidate(id)
    this.cache.invalidate('WorkshopsService.getAll')
    this.cache.invalidate('WorkshopsService.getAll_public')

    return note[0]
  }

  /**
   * Helper method to grant permissions to the appropraite roles and users in the Auth API.
   *
   * @param workshop Workshop
   */
  async grantPermissions(
    workshop: RequireKeys<
      Partial<Workshop__c>,
      'Id' | 'Organizing_Affiliate__c'
    > & { facilitators: Array<{ Id: string; id: number }> },
  ) {
    const resource = workshopRecordResource(workshop.Id)

    const [records, grantPs] = multimap(
      workshop.facilitators,
      facilitator => ({
        Workshop__c: workshop.Id,
        Instructor__c: facilitator.Id,
      }),
      facilitator =>
        this.authService.grantPermissionToUser(resource, 2, facilitator.id),
    )

    const createP = this.sfService.create({
      object: 'WorkshopFacilitatorAssociation__c',
      records,
    })

    const roles = await this.authService.getRoles(
      `role.name='Affiliate Manager' OR role.name='Course Manager -- ${
        workshop.Organizing_Affiliate__c
      }'`,
    )

    const rolePs = roles.map(role =>
      this.authService.grantPermissionToRole(resource, 2, role.id!),
    )

    return Promise.all([createP, ...grantPs, ...rolePs])
  }

  /**
   * Helper method to remove permissions from deleted facilitators
   *
   * @param workshop - Requires [ 'Id' ]
   * @param remove List of facilitators to remove
   */
  async removePermissions(
    workshopId: string,
    remove: Array<{ Id: string; Instructor__r: { Id: string } }>,
  ) {
    const resource = workshopRecordResource(workshopId)

    if (remove.length === 0) return tuple([] as SuccessResult[])

    const [ids, instructors] = multimap(
      remove,
      fac => fac.Id,
      fac => `'${fac.Instructor__r.Id}'`,
    )

    const deletePs = this.sfService.delete({
      object: 'WorkshopFacilitatorAssociation__c',
      ids,
    })

    const users = await this.authService.getUsers(
      `user.extId IN (${instructors.join()})`,
    )

    return Promise.all(
      tuple(
        deletePs,
        ...users.map(user =>
          this.authService.revokePermissionFromUser(resource, 2, user.id!),
        ),
      ),
    )
  }
}
