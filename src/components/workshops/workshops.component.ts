import { Inject, Injectable } from '@nestjs/common';
import {
    CacheService, UserService,
} from '../';
import { Workshop } from './workshop'
import _, { chunk } from 'lodash';
import { RequireKeys } from '../../util';
import { SalesforceClient, QueryRequest } from '@shingo/shingo-sf-api';
import { AuthClient } from '@shingo/shingo-auth-api';
import { LoggerInstance } from 'winston'
// tslint:disable-next-line:no-implicit-dependencies
import { DescribeSObjectResult } from 'jsforce';

export { Workshop }

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
    private userService: UserService,
    @Inject('LoggerService') private log: LoggerInstance
  ) {}

  /**
   * Get all workshops that the current session's user has permissions for (or all publicly listed workshps).
   *
   * The function assembles a list of workshop ids form the users permissions to query Salesforce.
   *
   * The queried fields from Salesforce are as follows:
   *
   * ```
   *  [
   *      "Id",
   *      "Name",
   *      "Start_Date__c",
   *      "End_Date__c",
   *      "Course_Manager__c",
   *      "Billing_Contact__c",
   *      "Event_City__c",
   *      "Event_Country__c",
   *      "Organizing_Affiliate__c",
   *      "Public__c",
   *      "Registration_Website__c",
   *      "Status__c",
   *      "Host_Site__c",
   *      "Workshop_Type__c",
   *      "Language__c"
   *  ]
   * ```
   *
   * The query is ordered by 'Start_Date__c'
   *
   * @param isPublic Get Only public workshops (skips permission check)
   * @param refresh Force the refresh of the cache
   * @param user The user to filter permissions for (isPublic === false)
   * user needs permissions[] and roles[].permissions[]
   */
  async getAll(isPublic = false, refresh = false, user?): Promise<Workshop[]> {
    const keyBase = 'WorkshopsService.getAll'
    const key = isPublic ? keyBase + '_public' : keyBase

    const query: QueryRequest = {
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

    let workshops: Workshop[] = [];
    if (!this.cache.isCached(key) || refresh) {
      if (!isPublic) {
        // tslint:disable-next-line:max-line-length
        query.fields.push('(SELECT Instructor__r.Id, Instructor__r.FirstName, Instructor__r.LastName, Instructor__r.Email, Instructor__r.Photograph__c FROM Instructors__r)')
        const ids = this.userService.getWorkshopIds(user);
        if (ids.length === 0) return []

        for (const chunkedIds of chunk(ids, 200)) {
          workshops = workshops.concat(await this.queryForWorkshops(chunkedIds, query));
        }

      } else {
        workshops = (await this.sfService.query<Workshop>(query)).records;
      }

      for (const workshop of workshops) {
        if (workshop.Instructors__r && workshop.Instructors__r.records instanceof Array) {
          workshop.facilitators = workshop.Instructors__r.records.map(i => i.Instructor__r);
        }
      }

      this.cache.cache(key, workshops);

      return workshops
    } else {
      return this.cache.getCache(key) as Workshop[]
    }
  }

  private queryForWorkshops(ids: ReadonlyArray<string>, query: Readonly<QueryRequest>): Promise<Workshop[]> {
    const newQuery = { ...query, clauses: `Id IN (${ids.join()}) ORDER BY Start_Date__c` }
    return this.sfService.query<Workshop>(newQuery).then(r => r.records)
  }

  /**
   * Get a specific workshop by Salesforce ID. Retrieves all fields of the Workshop__c object.
   * Specifically:
   *
   * ```
   * [
   *   "Id",
   *   "IsDeleted" ,
   *   "Name",
   *   "CreatedDate",
   *   "CreatedById",
   *   "LastModifiedDate",
   *   "LastModifiedById",
   *   "SystemModstamp",
   *   "LastViewedDate",
   *   "LastReferencedDate",
   *   "Billing_Contact__c",
   *   "Course_Manager__c",
   *   "End_Date__c",
   *   "Event_City__c",
   *   "Event_Country__c",
   *   "Organizing_Affiliate__c",
   *   "Public__c",
   *   "Registration_Website__c",
   *   "Start_Date__c",
   *   "Status__c",
   *   "Workshop_Type__c",
   *   "Host_Site__c",
   *   "Language__c",
   * ]
   * ```
   *
   * @param id - A Salesforce ID corresponding to a Workshop\__c record
   */
  async get(id: string): Promise<Workshop> {
    // Create the data parameter for the RPC call

    if (!this.cache.isCached(id)) {
      const workshop: Workshop = (await this.sfService.retrieve({ object: 'Workshop__c', ids: [id] }))[0] as Workshop;
      workshop.facilitators = (await this.facilitators(id)).map(f => f['Instructor__r']) || [];

      if (workshop.Course_Manager__c) {
        // tslint:disable-next-line:max-line-length
        workshop.Course_Manager__r = (await this.sfService.retrieve({ object: 'Contact', ids: [workshop.Course_Manager__c] }))[0];
      }

      if (workshop.Organizing_Affiliate__c) {
        // tslint:disable-next-line:max-line-length
        workshop.Organizing_Affiliate__r = (await this.sfService.retrieve({ object: 'Account', ids: [workshop.Organizing_Affiliate__c] }))[0];
      }

      workshop.files = await this.getFiles(workshop.Id!) || [];

      this.cache.cache(id, workshop);

      return workshop;
    } else {
      return this.cache.getCache(id) as Workshop;
    }
  }

  private getFiles(id: string) {
    const query: QueryRequest = {
      fields: [
        'Name',
        'ParentId',
        'ContentType',
        'BodyLength',
      ],
      table: 'Attachment',
      clauses: `ParentId='${id}'`,
    }

    // tslint:disable-next-line:interface-over-type-literal
    type Attachment = { Name: string, ParentId: string, ContentType: string, BodyLength: number }

    return this.sfService.query<Attachment>(query).then(r => r.records || []);
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

    // If no cached result, use the shingo-sf-api to get the result
    if (!this.cache.isCached(key) || refresh) {
      const describeObject = await this.sfService.describe('Workshop__c');

      // Cache describe
      this.cache.cache(key, describeObject);

      return describeObject
    } else {
      // else return the cachedResult
      return this.cache.getCache(key) as DescribeSObjectResult
    }
  }

  /**
   * Executes a SOSL query to search for text on workshop records in Salesforce.
   *
   * Example response body:
   *
   * ```
   * [
   *      {
   *          "Id": "a1Sg0000001jXbgEAE",
   *          "Name": "Test Workshop 10 (Updated)",
   *          "Start_Date__c": "2017-07-12"
   *      },
   *      {
   *          "Id": "a1Sg0000001jXWgEAM",
   *          "Name": "Test Workshop 9 (Updated)",
   *          "Start_Date__c": "2017-07-11"
   *      },
   *      {
   *          "Id": "a1Sg0000001jXWbEAM",
   *          "Name": "Test Workshop 8",
   *          "Start_Date__c": "2017-07-11"
   *      }
   *  ]
   * ```
   *
   * @param search SOSL search expression (i.e. '*Discover Test*')
   * @param retrieve A comma seperated list of the Workshop__c fields to retrieve (i.e. 'Id, Name, Start_Date__c')
   * @param refresh Used to force the refresh of the cache
   */
  async search(search: string, retrieve: string, refresh = false) {
    // Generate the data parameter for the RPC call
    const data = {
        search: `{${search}}`,
        retrieve: `Workshop__c(${retrieve})`,
    }

    // If no cached result, use the shingo-sf-api to get result
    if (!this.cache.isCached(data) || refresh) {
      const workshops: Workshop[] = (await this.sfService.search(data)).searchRecords as Workshop[] || [];

      // Cache results
      this.cache.cache(data, workshops);

      return workshops
    } else {
      // else return the cached result
      return this.cache.getCache(data) as Workshop[];
    }
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
    interface Returned {
      Id: string
      Instructor__r: {
        Id: string
        FirstName: string
        LastName: string
        Name: string
        AccountId: string
        Email: string
        Title: string
      }
    }

    if (!this.cache.isCached(key)) {
      const query: QueryRequest = {
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

      const facilitators = (await this.sfService.query(query)).records as Returned[] || [];
      const ids = facilitators.map(fac => `'${fac.Id}'`)
      const auths = await this.authService.getUsers(`user.extId IN (${ids.join()})`);

      for (const fac of facilitators) {
        const auth = auths.find(a => a.extId === fac.Id)
        if (auth) (fac as any).id = auth.id
      }

      this.cache.cache(id + '_facilitators', facilitators);

      return facilitators;
    } else {
      return this.cache.getCache(key) as Returned[]
    }
  }

  /**
   * Creates a new workshop in Salesforce and creates permissions for the workshop in the Shingo Auth API.
   *
   * @param workshop The workshop to be created
   */
  // tslint:disable-next-line:max-line-length
  async create(workshop: RequireKeys<Workshop, 'Name' | 'Start_Date__c' | 'End_Date__c' | 'Organizing_Affiliate__c' | 'facilitators'>) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [{ contents: JSON.stringify(_.omit(workshop, ['facilitators'])) }],
    }

    const result = (await this.sfService.create(data))[0];
    if (!result.success) throw new Error('Failed to create: ' + result.errors.join('\n'))

    const newWorkshop = { ...workshop, Id: result.id }
    await this.grantPermissions(newWorkshop);

    this.cache.invalidate('WorkshopsService.getAll');

    return result
  }

  /**
   * Updates a workshop's fields. Updates instructor associations and permissions.
   *
   * @param workshop The workshop
   */
  async update(workshop: RequireKeys<Workshop, 'Id'>) {
    // Use the shingo-sf-api to create the new record
    const data = {
      object: 'Workshop__c',
      records: [{ contents: JSON.stringify(_.omit(workshop, ['facilitators'])) }],
    }

    const result = (await this.sfService.update(data))[0];

    const currFacilitators = await this.facilitators(workshop.Id);
    const removeFacilitators = _.differenceWith(
      currFacilitators,
      workshop.facilitators || [],
      (val: any, other) => other && val.Instructor__r.Id === other.Id
    );
    workshop.facilitators = _.differenceWith(
      workshop.facilitators,
      currFacilitators,
      (val, other: any) => other && val.Id === other.Instructor__r.Id
    );

    await this.grantPermissions(workshop as any);
    await this.removePermissions(workshop, removeFacilitators);

    this.cache.invalidate(workshop.Id!);
    this.cache.invalidate(`${workshop.Id}_facilitators`);
    this.cache.invalidate('WorkshopsService.getAll');

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
  async upload(id: string, fileName: string, files: string[], contentType = 'text/csv') {

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

    const result = await this.sfService.create(data);

    this.cache.invalidate(id);
    return result;
  }

  /**
   * Deletes the workshop given by id in Salesforce and removes the permission in the Auth API.
   *
   * @param id The workshop id
   */
  async delete(id: string): Promise<any> {
    // Create the data parameter for the RPC call
    const data = {
        object: 'Workshop__c',
        ids: [id],
    }

    const result = (await this.sfService.delete(data))[0];

    for (const level of [0, 1, 2] as [0, 1, 2]) {
      this.authService.deletePermission(`/workshops/${id}`, level);
    }

    this.cache.invalidate(id);
    this.cache.invalidate(`${id}_facilitators`);
    this.cache.invalidate('WorkshopsService.getAll');
    this.cache.invalidate('WorkshopsService.getAll_public');

    return result
  }

  async cancel(id: string, reason: string): Promise<any> {
    const updateData = {
      object: 'Workshop__c',
      records: [{ contents: JSON.stringify({ Id: id, Status__c: 'Cancelled' }) }]
    }

    await this.sfService.update(updateData)

    const noteData = {
      object: 'Note',
      records: [{ contents: JSON.stringify({ Title: 'Reasons for Cancelling', Body: reason, ParentId: id }) }],
    }

    const note = (await this.sfService.create(noteData))[0];

    this.cache.invalidate(id);
    this.cache.invalidate('WorkshopsService.getAll');
    this.cache.invalidate('WorkshopsService.getAll_public');

    return note
  }

  /**
   * Helper method to grant permissions to the appropraite roles and users in the Auth API.
   *
   * @param workshop Workshop
   */
  private async grantPermissions(workshop: RequireKeys<Workshop, 'Id' | 'facilitators'>) {
    const roles = await this.authService.getRoles(
      `role.name=\'Affiliate Manager\' OR role.name='Course Manager -- ${workshop.Organizing_Affiliate__c}'`
    )

    const resource = `/workshops/${workshop.Id}`;

    await Promise.all(roles.map(role => this.authService.grantPermissionToRole(resource, 2, role.id)))
    await Promise.all(workshop.facilitators.map(facilitator => {
      const data = {
        object: 'WorkshopFacilitatorAssociation__c',
        records: [{ contents: JSON.stringify({ Workshop__c: workshop.Id, Instructor__c: facilitator.Id }) }],
      }
      return this.sfService.create(data).then(() =>
        this.authService.grantPermissionToUser(resource, 2, facilitator.id)
      )
    }))
  }

  /**
   * Helper method to remove permissions from deleted facilitators
   *
   * @param workshop - Requires [ 'Id' ]
   * @param remove List of facilitators to remove
   */
  private async removePermissions(workshop: Workshop,
                                  remove: ReadonlyArray<{ Id: string, Instructor__r: { Id: string }}>) {
    const resource = `/workshops/${workshop.Id}`;

    const ids = remove.map(facilitator => facilitator.Id);

    await this.sfService.delete({ object: 'WorkshopFacilitatorAssociation__c', ids });

    const instructors = remove.map(facilitator => `'${facilitator.Instructor__r.Id}'`);
    if (instructors.length === 0) return
    const users = await this.authService.getUsers(`user.extId IN (${instructors.join()})`);
    await Promise.all(users.map(user => this.authService.revokePermissionFromUser(resource, 2, user.id)))
  }

}
