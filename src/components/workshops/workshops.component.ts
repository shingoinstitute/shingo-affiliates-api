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
  createQuery,
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
import { PromiseValue, Omit } from '../../util/types'
import { Attachment } from '../../sf-interfaces/Attachment.interface'

type UnPromise<T extends Promise<any>> = T extends Promise<infer R> ? R : never

type SFQuery = Arguments<SalesforceClient['query']>[0]
type Facilitator = ArrayValue<
  PromiseValue<ReturnType<WorkshopsService['facilitators']>>
>
export const workshopRecordResource = (id: string) => `/workshops/${id}`

export const prepareWorkshopForSalesforce = (
  workshop: Partial<Workshop__c>,
) => {
  if (workshop.Organizing_Affiliate__r && !workshop.Organizing_Affiliate__c) {
    workshop.Organizing_Affiliate__c = workshop.Organizing_Affiliate__r.Id
  }
  if (workshop.Course_Manager__r && !workshop.Course_Manager__c) {
    workshop.Course_Manager__c = workshop.Course_Manager__r.Id
  }
  return _.omit(
    workshop,
    'Organizing_Affiliate__r',
    'Course_Manager__r',
    'facilitators',
    'files',
  )
}

const lit = <T extends string | number | boolean>(a: T) => a

const instructorFields = [
  lit('Id'),
  lit('FirstName'),
  lit('LastName'),
  lit('Email'),
  lit('Photograph__c'),
  lit('LastModifiedDate'),
  lit('Name'),
  lit('AccountId'),
  lit('Title'),
]

type InstructorFields = ArrayValue<typeof instructorFields>
type InstructorFieldsData = Pick<Contact, InstructorFields>

const workshopPublicQuery = createQuery<Workshop__c>('Workshop__c')(
  [
    'Id',
    'Name',
    'Start_Date__c',
    'End_Date__c',
    'Start_Time__c',
    'End_Time__c',
    'Local_Start_Time__c',
    'Local_End_Time__c',
    'Timezone__c',
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
    'LastModifiedDate',
  ],
  `Public__c=true AND Status__c='Verified' ORDER BY Start_Date__c`,
)

type WorkshopPublicQueryFields = ArrayValue<
  (typeof workshopPublicQuery)['fields']
>
type WorkshopPublicQueryData = Pick<Workshop__c, WorkshopPublicQueryFields>

const doWorkshopPublicQuery = (client: SalesforceClient) =>
  client
    .query<WorkshopPublicQueryData>(workshopPublicQuery)
    .then(r => r.records)

const queryForWorkshops = <T extends Partial<Workshop__c> = never>(
  ids: ReadonlyArray<string>,
  query: SFQuery,
) => {
  const newQuery = {
    ...query,
    clauses: `Id IN (${ids.map(i => `'${i}'`).join()}) ORDER BY Start_Date__c`,
  }
  return (sfService: SalesforceClient) =>
    sfService.query<T>(newQuery).then(r => r.records)
}

const queryFlipped = (sfService: SalesforceClient) => <
  T extends Partial<Workshop__c> = never
>(
  ids: ReadonlyArray<string>,
  query: SFQuery,
): Promise<T[]> => queryForWorkshops(ids, query)(sfService)

type GetPrivateWorkshopsData = WorkshopPublicQueryData & {
  Instructors__r: Array<{ Instructor__r: InstructorFieldsData }>
}

const getPrivateWorkshops = (user: AuthUser) => {
  // tslint:disable-next-line:interface-over-type-literal
  type SubSelectResult = {
    Instructors__r?: QueryResult<{ Instructor__r: InstructorFieldsData }>
  }

  const subSelectFields = instructorFields
    .map(v => `Instructor__r.${v}`)
    .concat('Id')

  const query = {
    ...workshopPublicQuery,
    fields: [
      ...workshopPublicQuery.fields,
      `(SELECT ${subSelectFields.join()} FROM Instructors__r)`,
    ],
  }

  const ids = getWorkshopIds(user)
  if (ids.length === 0)
    return () => Promise.resolve([]) as Promise<GetPrivateWorkshopsData[]>

  return async (
    sfService: SalesforceClient,
  ): Promise<GetPrivateWorkshopsData[]> => {
    const workshopQuery = queryFlipped(sfService)

    const workshops = flatten(
      await Promise.all(
        // our api has max of 200 records it can query at a time I guess?
        chunk(ids, 200).map(chunkedIds =>
          workshopQuery<WorkshopPublicQueryData & SubSelectResult>(
            chunkedIds,
            query,
          ),
        ),
      ),
    )

    // unwrap the child-select QueryResult
    return workshops.map(r => ({
      ...r,
      Instructors__r: (r.Instructors__r && r.Instructors__r.records) || [],
    }))
  }
}

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
    return user
      ? getPrivateWorkshops(user)(this.sfService).then(ws =>
          ws.map(w => ({
            ...w,
            facilitators: w.Instructors__r.map(i => i.Instructor__r),
          })),
        )
      : doWorkshopPublicQuery(this.sfService)
  }

  /**
   * Get a specific workshop by Salesforce ID. Retrieves all fields of the Workshop__c object.
   *
   * @param id - A Salesforce ID corresponding to a Workshop__c record
   */
  async get(id: string) {
    // tslint:disable:interface-over-type-literal
    type Additional = {
      facilitators: Array<Facilitator['Instructor__r']>
      files: Array<Partial<Attachment>>
    }
    type FacResult = {
      Instructors__r: UnPromise<ReturnType<WorkshopsService['facilitators']>>
    }

    type Result = Overwrite<Workshop__c & Additional, FacResult> | null

    const workshop: Result = ((await this.sfService
      .retrieve<Workshop__c>({
        object: 'Workshop__c',
        ids: [id],
      })
      .then(retrieveResult)) as unknown) as Result
    // result isn't actually correct - we will construct it properly

    if (workshop === null) return undefined

    // tslint:disable:variable-name
    const [
      facilitators,
      Course_Manager__r,
      Organizing_Affiliate__r,
      files,
    ] = await Promise.all(
      tuple(
        this.facilitators(id),
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

    workshop.Instructors__r = facilitators
    workshop.facilitators = facilitators.map(r => r.Instructor__r)
    workshop.Course_Manager__r = Course_Manager__r
    // describe result for Workshop__c says this relation must always exist
    workshop.Organizing_Affiliate__r = Organizing_Affiliate__r as Account
    workshop.files = files

    return workshop
  }

  getFiles(id: string) {
    const query = createQuery<Attachment>('Attachment')(
      ['Name', 'ParentId', 'ContentType', 'BodyLength', 'LastModifiedDate'],
      `ParentId='${id}'`,
    )

    type QueryData = Pick<Attachment, ArrayValue<(typeof query)['fields']>>
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
  async facilitators(id: string) {
    type QueryData = Pick<WorkshopFacilitatorAssociation__c, 'Id'> & {
      Instructor__r: Pick<Contact, (typeof instructorFields)[number]>
    }

    const query = {
      fields: ['Id', ...instructorFields.map(v => `Instructor__r.${v}`)],
      table: 'WorkshopFacilitatorAssociation__c',
      clauses: `Workshop__c='${id}'`,
    }

    const facAssociation: Array<
      QueryData & { authId?: number; auth?: authservices.User }
    > = await this.sfService.query<QueryData>(query).then(r => r.records || [])
    const ids = facAssociation.map(fac => `'${fac.Instructor__r.Id}'`)
    const auths = await this.getAuthForFac(...ids)

    // tslint:disable-next-line:variable-name
    for (const [Id, auth] of auths) {
      const fac = facAssociation.find(fac => Id === fac.Instructor__r.Id)
      if (fac && auth) {
        fac.authId = auth.id
        fac.auth = auth
      }
    }

    return facAssociation
  }

  /**
   * given salesforce ids, returns an array of (id, associated auth user)
   * @param ids a list of salesforce ids
   */
  private async getAuthForFac<Ids extends string[]>(...ids: Ids) {
    const auths = await this.authService.getUsers(
      `user.extId IN (${ids.join()})`,
    )

    return ids.map(id => {
      const auth = auths.find(a => a.extId === id)
      return [id, auth]
    }) as { [k in keyof Ids]: [Ids[k], ArrayValue<typeof auths> | undefined] }
  }

  /**
   * Creates a new workshop in Salesforce and creates permissions for the workshop in the Shingo Auth API.
   *
   * @param workshop The workshop to be created
   */
  // tslint:disable-next-line:max-line-length
  async create(
    workshop: RequireKeys<
      Omit<
        Partial<Workshop__c>,
        'Organizing_Affiliate__r' | 'Course_Manager__r'
      >,
      | 'Name'
      | 'Start_Date__c'
      | 'End_Date__c'
      | 'Organizing_Affiliate__c'
      | 'Course_Manager__c'
    > & {
      facilitators: Array<RequireKeys<Partial<Facilitator>, 'Id'>>
    },
  ) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [prepareWorkshopForSalesforce(workshop)],
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
      Omit<
        Partial<Workshop__c>,
        'Organizing_Affiliate__r' | 'Course_Manager__r'
      >,
      'Id' | 'Organizing_Affiliate__c'
    > & {
      facilitators?: Array<RequireKeys<Partial<Facilitator>, 'Id'>>
    },
  ) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [prepareWorkshopForSalesforce(workshop)],
    }

    const result = (await this.sfService.update(data))[0]

    // TODO: instead of guessing based on the state of the new object,
    // have the request shape be something like
    // { id: string, workshop: Partial<Workshop__c>, actions: [ { kind: REMOVE_FACS, ids: string[] }, { kind: ADD_FACS, ids: string[] } ] }
    // we send the workshop object directly to salesforce, since it handles diffing and merging
    // we have to deal with an array and intent with the facilitators key, since it is additional information
    // not present on the salesforce object - so we recieve actions instead
    // which clearly spell out the intended result
    if (workshop.facilitators) {
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
        workshop.facilitators || [],
        currFacilitators,
        (val, other) => other && val.Id === other.Instructor__r.Id,
      )

      await Promise.all([
        this.grantPermissions({
          ...workshop,
          facilitators: newFacilitators,
        }),
        this.removePermissions(workshop.Id, removeFacilitators),
      ])
    }

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
    > & {
      facilitators: Array<RequireKeys<Partial<Facilitator>, 'Id'>>
    },
  ) {
    const resource = workshopRecordResource(workshop.Id)

    const [records, grantPs] = multimap(
      workshop.facilitators,
      facilitator => ({
        Workshop__c: workshop.Id,
        Instructor__c: facilitator.Id,
      }),
      facilitator =>
        this.getAuthForFac(facilitator.Id).then<
          | PromiseValue<ReturnType<AuthClient['grantPermissionToUser']>>
          | undefined
        >(
          ([[, auth]]) =>
            auth &&
            this.authService.grantPermissionToUser(resource, 2, auth.id!),
        ),
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
