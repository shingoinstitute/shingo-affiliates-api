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
} from '../../util'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient } from '@shingo/auth-api-client'
import { LoggerInstance } from 'winston'
// tslint:disable-next-line:no-implicit-dependencies
import { QueryResult } from 'jsforce'
import { AuthUser } from '../../guards/auth.guard'
import { flatten, ArrayValue } from '../../util/fp'
import { Contact } from '../../sf-interfaces/Contact.interface'
import { Account } from '../../sf-interfaces/Account.interface'
import { WorkshopFacilitatorAssociation__c } from '../../sf-interfaces/WorkshopFacilitatorAssociation__c.interface'
import { Awaited } from '../../util/fp/types'
import { Attachment } from '../../sf-interfaces/Attachment.interface'

type SFQuery = Arguments<SalesforceClient['query']>[0]

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
      async () => {
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

  private async getPrivateWorkshops<BaseQueryData extends Partial<Workshop__c>>(
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

  private queryForWorkshops<T extends Partial<Workshop__c>>(
    ids: ReadonlyArray<string>,
    query: SFQuery,
  ) {
    const newQuery = {
      ...query,
      clauses: `Id IN (${ids.join()}) ORDER BY Start_Date__c`,
    }
    return this.sfService.query<T>(newQuery).then(r => r.records)
  }

  /**
   * Get a specific workshop by Salesforce ID. Retrieves all fields of the Workshop__c object.
   *
   * @param id - A Salesforce ID corresponding to a Workshop\__c record
   */
  get(id: string): Promise<Workshop__c | undefined> {
    // Create the data parameter for the RPC call

    return tryCache(this.cache, id, async () => {
      const workshop:
        | null
        | Workshop__c & {
            facilitators?: Array<
              ArrayValue<
                Awaited<ReturnType<WorkshopsService['facilitators']>>
              >['Instructor__r']
            >
            files?: Array<Partial<Attachment>>
          } = await this.sfService
        .retrieve<Workshop__c>({
          object: 'Workshop__c',
          ids: [id],
        })
        .then(retrieveResult)

      if (workshop === null) return undefined

      workshop.facilitators = (await this.facilitators(id)).map(
        f => f.Instructor__r,
      )

      if (workshop.Course_Manager__c) {
        workshop.Course_Manager__r = await this.sfService
          .retrieve<Contact>({
            object: 'Contact',
            ids: [workshop.Course_Manager__c],
          })
          .then(retrieveResult)
      }

      if (workshop.Organizing_Affiliate__c) {
        workshop.Organizing_Affiliate__r = (await this.sfService
          .retrieve<Account>({
            object: 'Account',
            ids: [workshop.Organizing_Affiliate__c],
          })
          .then(retrieveResult)) as Account
      }

      workshop.files = (await this.getFiles(workshop.Id!)) || []

      return workshop
    })
  }

  private getFiles(id: string) {
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
  async describe(refresh = false) {
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
  async search(search: string, retrieve: string[], refresh = false) {
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Workshop__c(${retrieve.join(',')})`,
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
   * Queried fields are as follows:
   * ```
   * [
   *  "Instructor__r.FirstName",
   *  "Instructor__r.LastName",
   *  "Instructor__r.Email",
   *  "Instructor__r.Title"
   * ]
   * ```
   *
   * @param id - A Salesforce ID corresponding to a Workshop__c record
   */
  async facilitators(id: string) {
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

      const facilitators: Array<
        QueryData & { id?: number }
      > = await this.sfService
        .query<QueryData>(query)
        .then(r => r.records || [])
      const ids = facilitators.map(fac => `'${fac.Id}'`)
      const auths = await this.authService.getUsers(
        `user.extId IN (${ids.join()})`,
      )

      for (const fac of facilitators) {
        const auth = auths.find(a => a.extId === fac.Id)
        if (auth) fac.id = auth.id
      }

      return facilitators
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
      records: [
        { contents: JSON.stringify(_.omit(workshop, ['facilitators'])) },
      ],
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
    workshop: RequireKeys<Partial<Workshop__c>, 'Id'> & {
      facilitators: Array<{ Id: string }>
    },
  ) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [
        { contents: JSON.stringify(_.omit(workshop, ['facilitators'])) },
      ],
    }

    const result = (await this.sfService.update(data))[0]

    const currFacilitators = await this.facilitators(workshop.Id)
    const removeFacilitators = _.differenceWith(
      currFacilitators,
      workshop.facilitators || [],
      (val, other) => other && val.Instructor__r.Id === other.Id,
    )
    workshop.facilitators = _.differenceWith(
      workshop.facilitators,
      currFacilitators,
      (val, other) => other && val.Id === other.Instructor__r.Id,
    )

    await this.grantPermissions(workshop as any)
    await this.removePermissions(workshop, removeFacilitators)

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
      contents: JSON.stringify({
        ParentId: id,
        Name: `${fileId}-${fileName}`,
        Body: file,
        ContentType: contentType,
      }),
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

    const result = (await this.sfService.delete(data))[0]

    for (const level of [0, 1, 2] as [0, 1, 2]) {
      this.authService.deletePermission(`/workshops/${id}`, level)
    }

    this.cache.invalidate(id)
    this.cache.invalidate(`${id}_facilitators`)
    this.cache.invalidate('WorkshopsService.getAll')
    this.cache.invalidate('WorkshopsService.getAll_public')

    return result
  }

  async cancel(id: string, reason: string) {
    const updateData = {
      object: 'Workshop__c',
      records: [
        { contents: JSON.stringify({ Id: id, Status__c: 'Cancelled' }) },
      ],
    }

    await this.sfService.update(updateData)

    const noteData = {
      object: 'Note',
      records: [
        {
          contents: JSON.stringify({
            Title: 'Reasons for Cancelling',
            Body: reason,
            ParentId: id,
          }),
        },
      ],
    }

    const note = (await this.sfService.create(noteData))[0]

    this.cache.invalidate(id)
    this.cache.invalidate('WorkshopsService.getAll')
    this.cache.invalidate('WorkshopsService.getAll_public')

    return note
  }

  /**
   * Helper method to grant permissions to the appropraite roles and users in the Auth API.
   *
   * @param workshop Workshop
   */
  private async grantPermissions(
    workshop: RequireKeys<
      Partial<Workshop__c>,
      'Id' | 'Organizing_Affiliate__c'
    > & { facilitators: Array<{ Id: string; id: number }> },
  ) {
    const roles = await this.authService.getRoles(
      `role.name=\'Affiliate Manager\' OR role.name='Course Manager -- ${
        workshop.Organizing_Affiliate__c
      }'`,
    )

    const resource = `/workshops/${workshop.Id}`

    await Promise.all(
      roles.map(role =>
        this.authService.grantPermissionToRole(resource, 2, role.id!),
      ),
    )
    await Promise.all(
      workshop.facilitators.map(facilitator => {
        const data = {
          object: 'WorkshopFacilitatorAssociation__c',
          records: [
            {
              Workshop__c: workshop.Id,
              Instructor__c: facilitator.Id,
            },
          ],
        }
        return this.sfService
          .create(data)
          .then(() =>
            this.authService.grantPermissionToUser(resource, 2, facilitator.id),
          )
      }),
    )
  }

  /**
   * Helper method to remove permissions from deleted facilitators
   *
   * @param workshop - Requires [ 'Id' ]
   * @param remove List of facilitators to remove
   */
  private async removePermissions(
    workshop: RequireKeys<Partial<Workshop__c>, 'Id'>,
    remove: ReadonlyArray<{ Id: string; Instructor__r: { Id: string } }>,
  ) {
    const resource = `/workshops/${workshop.Id}`

    const ids = remove.map(facilitator => facilitator.Id)

    await this.sfService.delete({
      object: 'WorkshopFacilitatorAssociation__c',
      ids,
    })

    const instructors = remove.map(
      facilitator => `'${facilitator.Instructor__r.Id}'`,
    )
    if (instructors.length === 0) return
    const users = await this.authService.getUsers(
      `user.extId IN (${instructors.join()})`,
    )
    await Promise.all(
      users.map(user =>
        this.authService.revokePermissionFromUser(resource, 2, user.id!),
      ),
    )
  }
}
