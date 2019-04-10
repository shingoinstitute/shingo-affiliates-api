import { Injectable } from '@nestjs/common'
import { AuthService, CacheService } from '../'
import {
  SalesforceService as NewSalesforceService,
  QueryRequest,
} from '../salesforce/new-salesforce.component'
import { Workshop } from './workshop'
import _, { chunk } from 'lodash'
import {
  SFQueryResult,
  tryCache,
  tuple1,
  RequireKeys,
  Omit,
  PromiseValue,
  ArrayValue,
  Mutable,
  tuple,
  multimap,
  Overwrite,
} from '../../util'
import {
  SFInterfaces,
  Workshop__c,
  Contact,
  Attachment,
  Account,
} from '../../sf-interfaces'
import { SuccessResult } from 'jsforce'
import { SFQ } from '../../util/salesforce'

export { Workshop }

type Facilitator = ArrayValue<
  PromiseValue<ReturnType<WorkshopsService['facilitators']>>
>
export const workshopRecordResource = (id: string) => `/workshops/${id}`

const publicQuery = new SFQ('Workshop__c')
  .select(
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
    'Case_Study__c'
  )
  .where("Public__c=true AND Status__c='Verified'")
  .orderBy(['Start_Date__c'])

type PublicQueryResult = typeof publicQuery['_R']

const instructorFields = tuple1<keyof SFInterfaces['Contact']>()(
  'Id',
  'FirstName',
  'LastName',
  'Email',
  'Photograph__c',
  'LastModifiedDate',
  'Name',
  'AccountId',
  'Title'
)

/**
 * @desc Parse out the workshops that a user has permissions for
 *
 * @param {any} user - Requires <code>user.permissions[]</code> and <code>user.roles[].permissions[]</code>
 * @returns {string[]}
 * @memberof UserService
 */
const getWorkshopIds = user => {
  type Permission = { resource: string }
  return [
    ...new Set(
      ([...user.permissions, ...user.role.permissions] as Permission[]).reduce(
        (ids, p) => {
          if (p.resource.includes('/workshops/'))
            ids.push(`'${p.resource.replace('/workshops/', '')}'`)
          return ids
        },
        [] as string[]
      )
    ),
  ]
}

/**
 * @desc A service to provide functions for working with Workshops
 *
 * @export
 * @class WorkshopsService
 */
@Injectable()
export class WorkshopsService {
  queryFn: <T>(x: string) => Promise<T[]>

  constructor(
    private newSfService: NewSalesforceService,
    private authService: AuthService = new AuthService(),
    private cache: CacheService = new CacheService()
  ) {
    this.queryFn = this.newSfService.query.bind(this.newSfService)
  }

  /**
   *  @desc Get all workshops that the current session's user has permissions for (or all publicly listed workshps). The function assembles a list of workshop ids form the users permissions to query Salesforce. The queried fields from Salesforce are as follows:<br><br>
   *  <code>[<br>
   *      &emsp;"Id",<br>
   *      &emsp;"Name",<br>
   *      &emsp;"Start_Date\__c",<br>
   *      &emsp;"End_Date\__c",<br>
   *      &emsp;"Course_Manager\__c",<br>
   *      &emsp;"Billing_Contact\__c",<br>
   *      &emsp;"Event_City\__c",<br>
   *      &emsp;"Event_Country\__c",<br>
   *      &emsp;"Organizing_Affiliate\__c",<br>
   *      &emsp;"Public\__c",<br>
   *      &emsp;"Registration_Website\__c",<br>
   *      &emsp;"Status\__c",<br>
   *      &emsp;"Host_Site\__c",<br>
   *      &emsp;"Workshop_Type\__c",<br>
   *      &emsp;"Language\__c"<br>
   *  ]</code><br><br>
   * The query is ordered by <em>'Start_Date\__c'</em>.
   *
   * @param {boolean} [isPublic=false] - Get Only public workshops (skips permission check)
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @param {any} [user] - The user to filter permissions for (<code>isPublic === false</code>); user needs permissions[] and roles[].permissions[]
   * @memberof WorkshopsService
   */
  getAll(isPublic: boolean = false, refresh: boolean = false, user?) {
    return isPublic
      ? tryCache(
          this.cache,
          'WorkshopsService.getAll_public',
          () => publicQuery.query(this.queryFn),
          refresh
        )
      : tryCache(
          this.cache,
          'WorkshopsService.getAll',
          () => this.getPrivate(user!),
          refresh
        )
  }

  private async getPrivate(user) {
    const subSelectFields = instructorFields
      .map(v => `Instructor__r.${v}`)
      .concat('Id')
    // TODO: properly support child queries in SFQ
    const query: QueryRequest = {
      table: publicQuery.table,
      fields: [
        ...publicQuery.fields,
        `(SELECT ${subSelectFields.join()} FROM Instructors__r)`,
      ],
      clauses: publicQuery.clauses.where,
    }

    type SubSelectResult = {
      Instructors__r?: Array<{
        Instructor__r: SFQueryResult<{
          table: 'Contact'
          fields: typeof instructorFields
        }>
      }>
    }

    const ids = getWorkshopIds(user)
    if (ids.length === 0) return []

    const workshops = ([] as Array<PublicQueryResult & SubSelectResult>).concat(
      ...(await Promise.all(
        chunk(ids, 200).map(chunked => {
          query.clauses = `Id IN (${chunked.join()}) ORDER BY Start_Date__c`
          return this.newSfService.query<PublicQueryResult & SubSelectResult>(
            query
          )
        })
      ))
    )

    return workshops.map(workshop => {
      const facilitators = (workshop.Instructors__r || []).map(
        i => i.Instructor__r
      )
      ;(workshop as typeof workshop & {
        facilitators: typeof facilitators
      }).facilitators = facilitators
      return workshop as typeof workshop & { facilitators: typeof facilitators }
    })
  }

  /**
   * @desc Get a specific workshop by Salesforce ID. Retrieves all fields of the Workshop\__c object. Specifically:<br><br>
   * <code>[<br>
   *   &emsp;"Id",<br>
   *   &emsp;"IsDeleted" ,<br>
   *   &emsp;"Name",<br>
   *   &emsp;"CreatedDate",<br>
   *   &emsp;"CreatedById",<br>
   *   &emsp;"LastModifiedDate",<br>
   *   &emsp;"LastModifiedById",<br>
   *   &emsp;"SystemModstamp",<br>
   *   &emsp;"LastViewedDate",<br>
   *   &emsp;"LastReferencedDate",<br>
   *   &emsp;"Billing_Contact\__c",<br>
   *   &emsp;"Course_Manager\__c",<br>
   *   &emsp;"End_Date\__c",<br>
   *   &emsp;"Event_City\__c",<br>
   *   &emsp;"Event_Country\__c",<br>
   *   &emsp;"Organizing_Affiliate\__c",<br>
   *   &emsp;"Public\__c",<br>
   *   &emsp;"Registration_Website\__c",<br>
   *   &emsp;"Start_Date\__c",<br>
   *   &emsp;"Status\__c",<br>
   *   &emsp;"Workshop_Type\__c",<br>
   *   &emsp;"Host_Site\__c",<br>
   *   &emsp;"Language\__c",<br>
   * ]</code>
   *
   * @param {string} id - A Salesforce ID corresponding to a Workshop\__c record
   * @memberof WorkshopsService
   */
  get(id: string, refresh = false) {
    // Create the data parameter for the RPC call
    return tryCache(
      this.cache,
      id,
      async () => {
        type Additional = {
          facilitators: Array<Facilitator['Instructor__r']>
          files: Array<Partial<Attachment>>
        }
        type FacResult = {
          Instructors__r: PromiseValue<
            ReturnType<WorkshopsService['facilitators']>
          >
        }

        type Result = Overwrite<Workshop__c & Additional, FacResult> | undefined

        const [workshop] = (await this.newSfService.retrieve<Workshop__c>({
          object: 'Workshop__c',
          ids: [id],
        })) as [Result]

        if (!workshop) return

        workshop.facilitators = ((await this.facilitators(id)) || []).map(
          f => f.Instructor__r
        )

        if (workshop.Course_Manager__c) {
          workshop.Course_Manager__r = (await this.newSfService.retrieve<
            Contact
          >({
            object: 'Contact',
            ids: [workshop.Course_Manager__c],
          }))[0]
        }

        if (workshop.Organizing_Affiliate__c) {
          workshop.Organizing_Affiliate__r = (await this.newSfService.retrieve<
            Account
          >({
            object: 'Account',
            ids: [workshop.Organizing_Affiliate__c],
          }))[0]
        }

        workshop.files = (await this.getFiles(workshop.Id)) || []

        return workshop
      },
      refresh
    )
  }

  private getFiles(id: string) {
    const query = new SFQ('Attachment')
      .select('Name', 'ParentId', 'ContentType', 'BodyLength')
      .where(`ParentId='${id}'`)
    return query.query(this.queryFn)
  }

  /**
   * @desc Uses the Salesforce REST API to describe the Workshop\__c object. See the Salesforce documentation for more about 'describe'.
   *
   * @param {boolean} [refresh=false] - Force the refresh of the cache
   * @returns {Promise<any>}
   * @memberof WorkshopsService
   */
  describe(refresh: boolean = false) {
    // Set the key for the cache
    const key = 'describeWorkshops'
    return tryCache(
      this.cache,
      key,
      () => this.newSfService.describe('Workshop__c'),
      refresh
    )
  }

  /**
   * @desc Executes a SOSL query to search for text on workshop records in Salesforce. Example response body:<br><br>
   * <code>[<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "a1Sg0000001jXbgEAE",<br>
   *          &emsp;&emsp;"Name": "Test Workshop 10 (Updated)",<br>
   *          &emsp;&emsp;"Start_Date\__c": "2017-07-12"<br>
   *      &emsp;},<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "a1Sg0000001jXWgEAM",<br>
   *          &emsp;&emsp;"Name": "Test Workshop 9 (Updated)",<br>
   *          &emsp;&emsp;"Start_Date\__c": "2017-07-11"<br>
   *      &emsp;},<br>
   *      &emsp;{<br>
   *          &emsp;&emsp;"Id": "a1Sg0000001jXWbEAM",<br>
   *          &emsp;&emsp;"Name": "Test Workshop 8",<br>
   *          &emsp;&emsp;"Start_Date\__c": "2017-07-11"<br>
   *      &emsp;}<br>
   *  ]</code>
   *
   * @param {Header} search - SOSL search expression (i.e. '*Discover Test*')
   * @param {Header} retrieve - A comma seperated list of the Workshop\__c fields to retrieve (i.e. 'Id, Name, Start_Date\__c')
   * @param {Header} [refresh='false'] - Used to force the refresh of the cache
   * @returns {Promise<Workshop[]>}
   * @memberof WorkshopsService
   */
  search(search: string, retrieve: string, refresh: boolean = false) {
    // Generate the data parameter for the RPC call
    const data = {
      search: `{${search}}`,
      retrieve: `Workshop__c(${retrieve})`,
    }

    // If no cached result, use the shingo-sf-api to get result
    return tryCache(
      this.cache,
      data,
      async () =>
        (await this.newSfService.search<Partial<Workshop__c>>(data))
          .searchRecords,
      refresh
    )
  }

  /**
   * @desc Get the associated instructors for the workshop with id given in the param <em>:id</em>. Queried fields are as follows:<br><br>
   * <code>[<br>
   *  &emsp;"Instructor\__r.FirstName",<br>
   *  &emsp;"Instructor\__r.LastName",<br>
   *  &emsp;"Instructor\__r.Email",<br>
   *  &emsp;"Instructor\__r.Title"<br>
   * ]</code>
   *
   * @param {string} id - A Salesforce ID corresponding to a Workshop\__c record
   * @memberof WorkshopsService
   */
  facilitators(id: string, refresh = false) {
    return tryCache(
      this.cache,
      id + '_facilitators',
      async () => {
        const query2 = new SFQ('WorkshopFacilitatorAssociation__c')
          .select('Id')
          .parent('Instructor__r')
          .select('Id', 'FirstName', 'LastName', 'AccountId', 'Email', 'Title')
          .done()
          .where(`Workshop__c='${id}'`)

        const facilitators = (await query2.query(this.queryFn)) || []
        if (!facilitators.length) return facilitators
        const ids = facilitators.map(fac => `'${fac.Id}'`)
        const auths = (await this.authService.getUsers(
          `user.extId IN (${ids.join()})`
        )).users
        return facilitators.map(fac => {
          let auth = auths.find(auth => auth.extId === fac.Id)
          return auth ? { ...fac, id: auth.id } : fac
        })
      },
      refresh
    )
  }

  /**
   * given salesforce ids, returns an array of (id, associated auth user)
   * @param ids a list of salesforce ids
   */
  private async getAuthForFac<Ids extends string[]>(...ids: Ids) {
    const auths = await this.authService.getUsers(
      `user.extId IN (${ids.join()})`
    )

    return ids.map(id => {
      const auth = auths.find(a => a.extId === id)
      return [id, auth]
    }) as { [k in keyof Ids]: [Ids[k], ArrayValue<typeof auths> | undefined] }
  }

  /**
   * @desc Creates a new workshop in Salesforce and creates permissions for the workshop in the Shingo Auth API. Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"id": SalesforceId,<br>
   *      &emsp;"success": boolean,<br>
   *      &emsp;"errors": []<br>
   *  }</code>
   *
   * @param {Workshop} workshop - The workshop to be created. Requires <code>[ 'Name', 'Start_Date\__c', 'End_Date\__c', 'Organizing_Affiliate\__c' ]
   * @returns {Promise<any>}
   * @memberof WorkshopsService
   */
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
    }
  ) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [_.omit(workshop, ['facilitators'])],
    }

    const result = (await this.newSfService.create(data))[0]
    ;(workshop as Mutable<typeof workshop>).Id = result.id
    // assertion is fine since we explicitly set the value above
    await this.grantPermissions(workshop as typeof workshop & { Id: string })

    this.cache.invalidate('WorkshopsService.getAll')

    return result
  }

  /**
   * @desc Updates a workshop's fields. This function also will get the instructor associations with the given workshop to update associations and permissions. Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"id": SalesforceId,<br>
   *      &emsp;"success": boolean,<br>
   *      &emsp;"errors": []<br>
   *  }</code>
   *
   * @param {Workshop} workshop
   * @returns {Promise<any>}
   * @memberof WorkshopsService
   */
  public async update(
    workshop: RequireKeys<
      Omit<
        Partial<Workshop__c>,
        'Organizing_Affiliate__r' | 'Course_Manager__r'
      >,
      'Id' | 'Organizing_Affiliate__c'
    > & {
      facilitators?: Array<RequireKeys<Partial<Facilitator>, 'Id'>>
    }
  ) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [_.omit(workshop, ['facilitators'])],
    }

    const [result] = await this.newSfService.update(data)

    // TODO: instead of guessing based on the state of the new object,
    // have the request shape be something like
    // { id: string, workshop: Partial<Workshop__c>, actions: [ { kind: REMOVE_FACS, ids: string[] }, { kind: ADD_FACS, ids: string[] } ] }
    // we send the workshop object directly to salesforce, since it handles diffing and merging
    // we have to deal with an array and intent with the facilitators key, since it is additional information
    // not present on the salesforce object - so we recieve actions instead
    // which clearly spell out the intended result
    if (workshop.facilitators) {
      const currFacilitators = await this.facilitators(workshop.Id)
      const removeFacilitators = _.differenceWith(
        currFacilitators,
        workshop.facilitators,
        // FIXME: not sure about this comparison, other.Id may just refer to the join object and not an actual facilitator
        (val, other) => other && val.Instructor__r.Id === other.Id
      )

      const newFacilitators = _.differenceWith(
        workshop.facilitators,
        currFacilitators,
        (val, other) => other && val.Id === other.Instructor__r.Id
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
   * @param {SalesforceId} id - Id of the record to attach file to
   * @param {string} fileName - The name of the file
   *
   * @param {string[]} files - The files to attach (base 64)
   * @returns {Promise<SFSuccessObject[]>}
   * @memberof WorkshopsService
   */
  async upload(
    id: string,
    fileName: string,
    files: string[],
    contentType = 'text/csv'
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

    const result = await this.newSfService.create(data)

    this.cache.invalidate(id)
    return result
  }

  /**
   * @desc Deletes the workshop given by <em>:id</em> in Salesforce and removes the permission in the Auth API. Returns the following:<br><br>
   * <code>{<br>
   *      &emsp;"id": SalesforceId,<br>
   *      &emsp;"success": boolean,<br>
   *      &emsp;"errors": []<br>
   *  }</code>
   *
   * @param {string} id
   * @returns {Promise<any>}
   * @memberof WorkshopsService
   */
  public async delete(id: string): Promise<any> {
    // Create the data parameter for the RPC call
    const data = {
      object: 'Workshop__c',
      ids: [id],
    }

    const resource = workshopRecordResource(id)

    const permPs = ([0, 1, 2] as const).map(level =>
      this.authService.deletePermission(resource, level)
    )

    const [result] = await this.newSfService.delete(data)
    await Promise.all(permPs)

    this.cache.invalidate(id)
    this.cache.invalidate(`${id}_facilitators`)
    this.cache.invalidate('WorkshopsService.getAll')
    this.cache.invalidate('WorkshopsService.getAll_public')

    return result
  }

  async cancel(id: string, reason: string) {
    const updateData = {
      object: 'Workshop__c',
      records: [{ Id: id, Status__c: 'Cancelled' }],
    }
    const noteData = {
      object: 'Note',
      records: [
        { Title: 'Reasons for Cancelling', Body: reason, ParentId: id },
      ],
    }
    const [, note] = await Promise.all([
      this.newSfService.update(updateData),
      this.newSfService.create(noteData),
    ])

    this.cache.invalidate(id)
    this.cache.invalidate('WorkshopsService.getAll')
    this.cache.invalidate('WorkshopsService.getAll_public')

    return note[0]
  }

  /**
   * @desc Helper method to grant permissions to the appropraite roles and users in the Auth API.
   *
   * @private
   * @param {Workshop} workshop - Requires [ 'Id', 'facilitators' ]
   * @memberof WorkshopsService
   */
  private async grantPermissions(
    workshop: RequireKeys<
      Partial<Workshop__c>,
      'Id' | 'Organizing_Affiliate__c'
    > & {
      facilitators: Array<RequireKeys<Partial<Facilitator>, 'Id'>>
    }
  ) {
    const resource = workshopRecordResource(workshop.Id)

    const roles = (await this.authService.getRoles(
      `role.name=\'Affiliate Manager\' OR role.name='Course Manager -- ${
        workshop.Organizing_Affiliate__c
      }'`
    )).roles

    for (const role of roles) {
      // FIXME: bad practice to await when you don't use the return value
      // causes unecessary blocking
      await this.authService.grantPermissionToRole(resource, 2, role.id)
    }

    for (const facilitator of workshop.facilitators) {
      const data = {
        object: 'WorkshopFacilitatorAssociation__c',
        records: [{ Workshop__c: workshop.Id, Instructor__c: facilitator.Id }],
      }
      // FIXME: bad practice to await when you don't use the return value
      // causes unecessary blocking
      await this.newSfService.create(data)
      const [[, auth]] = await this.getAuthForFac(facilitator.Id)
      if (auth) {
        await this.authService.grantPermissionToUser(
          resource,
          2,
          (auth as any).id
        )
      }
    }
  }

  /**
   * @desc Helper method to remove permissions from deleted facilitators
   *
   * @private
   * @param {Workshop} workshop - Requires [ 'Id', 'facilitators' ]
   * @param {any[]} remove - Requires [ 'Id', 'Email' ]
   * @returns {Promise<void>}
   * @memberof WorkshopsService
   */
  private async removePermissions(
    workshopId: string,
    remove: Array<{ Id: string; Instructor__r: { Id: string } }>
  ) {
    const resource = workshopRecordResource(workshopId)
    if (remove.length === 0) return tuple([] as SuccessResult[])

    const [ids, instructors] = multimap(
      remove,
      fac => fac.Id,
      fac => `'${fac.Instructor__r.Id}'`
    )

    const deletePs = this.newSfService.delete({
      object: 'WorkshopFacilitatorAssociation__c',
      ids,
    })

    if (!instructors.length) return Promise.all(tuple(deletePs, []))

    const users = await this.authService.getUsers(
      `user.extId IN (${instructors.join()})`
    )
    for (const user in users) {
      await this.authService.revokePermissionFromUser(resource, 2, user['id'])
    }

    return Promise.all(
      tuple(
        deletePs,
        ...users.map((user: { id: number }) =>
          this.authService.revokePermissionFromUser(resource, 2, user.id)
        )
      )
    )
  }
}
