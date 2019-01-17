import { Component, Inject } from '@nestjs/common';
import {
    SalesforceService, AuthService, CacheService,
    SFQueryObject, SFQueryResponse, SFSuccessObject, gRPCError,
} from '../';
import { Workshop } from './workshop'
import { _, chunk } from 'lodash';

export { Workshop }

/**
 * @desc A service to provide functions for working with Workshops
 * 
 * @export
 * @class WorkshopsService
 */
@Component()
export class WorkshopsService {

    constructor( @Inject('SalesforceService') private sfService: SalesforceService = new SalesforceService(),
        @Inject('AuthService') private authService: AuthService = new AuthService(),
        @Inject('CacheService') private cache: CacheService = new CacheService()) {}

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
     * @returns {Promise<Workshop[]>} 
     * @memberof WorkshopsService
     */
    public async getAll(isPublic: boolean = false, refresh: boolean = false, user?): Promise<Workshop[]> {
        let key = 'WorkshopsService.getAll';
        const query: SFQueryObject = {
            action: 'SELECT',
            fields: [
                "Id",
                "Name",
                "Start_Date__c",
                "End_Date__c",
                "Start_Time__c",
                "End_Time__c",
                "Local_Start_Time__c",
                "Local_End_Time__c",
                "Timezone__c",
                "Course_Manager__c",
                "Billing_Contact__c",
                "Event_City__c",
                "Event_Country__c",
                "Organizing_Affiliate__c",
                "Public__c",
                "Registration_Website__c",
                "Status__c",
                "Host_Site__c",
                "Workshop_Type__c",
                "Language__c",
                "Case_Study__c"
            ],
            table: "Workshop__c",
            clauses: "Public__c=true AND Status__c='Verified' ORDER BY Start_Date__c"
        }

        if (isPublic) {
            key += '_public';
        }

        if (!this.cache.isCached(key) || refresh) {
            let workshops: Workshop[] = [];
            if (!isPublic) {
                query.fields.push('(SELECT Instructor__r.Id, Instructor__r.FirstName, Instructor__r.LastName, Instructor__r.Email, Instructor__r.Photograph__c FROM Instructors__r)')
                let ids = this.getWorkshopIds(user);
                if (ids.length === 0) return [];
                for (let chuncked_ids of chunk(ids, 200)) {
                    workshops = workshops.concat(await this.queryForWorkshops(chuncked_ids, query));
                }
            } else {
                workshops = (await this.sfService.query(query)).records as Workshop[] || [];
            }

            for (const workshop of workshops) {
                if (workshop.Instructors__r && workshop.Instructors__r.records instanceof Array)
                    workshop.facilitators = workshop.Instructors__r.records.map(i => i.Instructor__r);
            }

            if (workshops.length) {
                this.cache.cache(key, workshops);
            }

            return workshops;
        } else {
            return this.cache.getCache(key);
        }
    }

    /**
     * @desc Parse out the workshops that a user has permissions for
     * 
     * @param {any} user - Requires <code>user.permissions[]</code> and <code>user.roles[].permissions[]</code>
     * @returns {string[]} 
     * @memberof UserService
     */
    public getWorkshopIds(user): string[] {
        let ids = [];
        user.permissions.forEach(p => {
            if (p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
        });
        user.role.permissions.forEach(p => {
            if (p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
        });

        return [...new Set(ids)]; // Only return unique ids
    }

    private async queryForWorkshops(ids, query): Promise<Workshop[]> {
        query.clauses = `Id IN (${ids.join()}) ORDER BY Start_Date__c`
        return (await this.sfService.query(query)).records as Workshop[];
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
     * @returns {Promise<Workshop>} 
     * @memberof WorkshopsService
     */
    public async get(id: string, refresh = false): Promise<Workshop> {
        // Create the data parameter for the RPC call

        if (!this.cache.isCached(id) || refresh) {
            let workshop: Workshop = (await this.sfService.retrieve({ object: 'Workshop__c', ids: [id] }))[0] as Workshop;
            if (!workshop) return
            workshop.facilitators = (await this.facilitators(id)).map(f => f['Instructor__r']) || [];

            if (workshop.Course_Manager__c) workshop.Course_Manager__r = (await this.sfService.retrieve({ object: 'Contact', ids: [workshop.Course_Manager__c] }))[0];
            if (workshop.Organizing_Affiliate__c) workshop.Organizing_Affiliate__r = (await this.sfService.retrieve({ object: 'Account', ids: [workshop.Organizing_Affiliate__c] }))[0];

            workshop.files = await this.getFiles(workshop.Id) || [];

            this.cache.cache(id, workshop);

            return workshop;
        } else {
            return this.cache.getCache(id);
        }
    }

    private async getFiles(id: string): Promise<any[]> {
        const query: SFQueryObject = {
            action: 'SELECT',
            fields: [
                'Name',
                'ParentId',
                'ContentType',
                'BodyLength'
            ],
            table: 'Attachment',
            clauses: `ParentId='${id}'`
        }

        const files = (await this.sfService.query(query)).records;
        return files;
    }

    /**
     * @desc Uses the Salesforce REST API to describe the Workshop\__c object. See the Salesforce documentation for more about 'describe'.
     * 
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @returns {Promise<any>} 
     * @memberof WorkshopsService
     */
    public async describe(refresh: boolean = false): Promise<any> {
        // Set the key for the cache
        const key = 'describeWorkshops'

        // If no cached result, use the shingo-sf-api to get the result
        if (!this.cache.isCached(key) || refresh) {
            const describeObject = await this.sfService.describe('Workshop__c');
            if (!describeObject) return

            // Cache describe
            this.cache.cache(key, describeObject);

            return describeObject;
        }
        // else return the cachedResult
        else {
            return this.cache.getCache(key);
        }
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
    public async search(search: string, retrieve: string, refresh: boolean = false): Promise<Workshop[]> {
        // Generate the data parameter for the RPC call
        const data = {
            search: `{${search}}`,
            retrieve: `Workshop__c(${retrieve})`
        }

        // If no cached result, use the shingo-sf-api to get result
        if (!this.cache.isCached(data) || refresh) {
            const workshops: Workshop[] = (await this.sfService.search(data)).searchRecords as Workshop[] || [];

            // Cache results
            if (workshops.length)
                this.cache.cache(data, workshops);

            return workshops;
        }
        // else return the cached result
        else {
            return this.cache.getCache(data);
        }
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
     * @returns {Promise<object[]>} 
     * @memberof WorkshopsService
     */
    public async facilitators(id: string, refresh = false): Promise<object[]> {
        if (!this.cache.isCached(id + '_facilitators') || refresh) {
            let query: SFQueryObject = {
                action: "SELECT",
                fields: [
                    "Id",
                    "Instructor__r.Id",
                    "Instructor__r.FirstName",
                    "Instructor__r.LastName",
                    "Instructor__r.Name",
                    "Instructor__r.AccountId",
                    "Instructor__r.Email",
                    "Instructor__r.Title"
                ],
                table: "WorkshopFacilitatorAssociation__c",
                clauses: `Workshop__c='${id}'`
            }

            const facilitators: any[] = (await this.sfService.query(query)).records || [];
            if (!facilitators.length) return facilitators
            const ids = facilitators.map(fac => `'${fac.Id}'`)
            const auths = (await this.authService.getUsers(`user.extId IN (${ids.join()})`)).users;
            for (let fac of facilitators) {
                let auth = auths.filter(auth => auth.extId === fac.Id)[0];
                if (auth) fac.id = auth.id;
            }

            this.cache.cache(id + '_facilitators', facilitators);

            return facilitators;
        } else {
            return this.cache.getCache(id + '_facilitators');
        }
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
    public async create(workshop: Workshop): Promise<any> {
        // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Workshop__c',
            records: [{ contents: JSON.stringify(_.omit(workshop, ['facilitators'])) }]
        }

        const result: SFSuccessObject = (await this.sfService.create(data))[0];
        workshop.Id = result.id;

        await this.grantPermissions(workshop);

        this.cache.invalidate('WorkshopsService.getAll');

        return result;
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
    public async update(workshop: Workshop): Promise<any> {
        // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Workshop__c',
            records: [{ contents: JSON.stringify(_.omit(workshop, ['facilitators'])) }]
        }
        const result: SFSuccessObject = (await this.sfService.update(data))[0];

        const currFacilitators = await this.facilitators(workshop.Id);
        const removeFacilitators = _.differenceWith(currFacilitators, workshop.facilitators, (val, other) => { return other && val.Instructor__r.Id === other.Id });
        workshop.facilitators = _.differenceWith(workshop.facilitators, currFacilitators, (val, other) => { return other && val.Id === other.Instructor__r.Id });

        await this.grantPermissions(workshop);
        await this.removePermissions(workshop, removeFacilitators);

        this.cache.invalidate(workshop.Id);
        this.cache.invalidate(`${workshop.Id}_facilitators`);
        this.cache.invalidate('WorkshopsService.getAll');

        return result;
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
    public async upload(id: string, fileName: string, files: string[], contentType: string = 'text/csv'): Promise<SFSuccessObject[]> {

        const records = [];
        let fileId = 0;
        for (const file of files) {
            records.push({ contents: JSON.stringify({ ParentId: id, Name: `${fileId++}-${fileName}`, Body: file, ContentType: contentType }) });
        }

        const data = {
            object: 'Attachment',
            records
        }

        const result: SFSuccessObject[] = await this.sfService.create(data);

        this.cache.invalidate(id);
        return result;
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
            ids: [id]
        }
        const result: SFSuccessObject = (await this.sfService.delete(data))[0];
        for (const level of [0, 1, 2])
            await this.authService.deletePermission(`/workshops/${id}`, level as 0 | 1 | 2);

        this.cache.invalidate(id);
        this.cache.invalidate(`${id}_facilitators`);
        this.cache.invalidate('WorkshopsService.getAll');
        this.cache.invalidate('WorkshopsService.getAll_public');

        return result;
    }

    public async cancel(id: string, reason: string): Promise<any> {
        const updateData = {
            object: 'Workshop__c',
            records: [{ contents: JSON.stringify({ Id: id, Status__c: 'Cancelled' }) }]
        }
        const update: SFSuccessObject = (await this.sfService.update(updateData))[0];

        const noteData = {
            object: 'Note',
            records: [{ contents: JSON.stringify({ Title: 'Reasons for Cancelling', Body: reason, ParentId: id }) }]
        }
        const note: SFSuccessObject = (await this.sfService.create(noteData))[0];

        this.cache.invalidate(id);
        this.cache.invalidate('WorkshopsService.getAll');
        this.cache.invalidate('WorkshopsService.getAll_public');

        return note;
    }

    /**
     * @desc Helper method to grant permissions to the appropraite roles and users in the Auth API.
     * 
     * @private
     * @param {Workshop} workshop - Requires [ 'Id', 'facilitators' ]
     * @returns {Promise<void>} 
     * @memberof WorkshopsService
     */
    private async grantPermissions(workshop: Workshop): Promise<void> {
        const roles = (await this.authService.getRoles(`role.name=\'Affiliate Manager\' OR role.name='Course Manager -- ${workshop.Organizing_Affiliate__c}'`)).roles;

        const resource = `/workshops/${workshop.Id}`;
        for (const role of roles) {
            await this.authService.grantPermissionToRole(resource, 2, role.id);
        }

        for (const facilitator of workshop.facilitators) {
            const data = {
                object: 'WorkshopFacilitatorAssociation__c',
                records: [{ contents: JSON.stringify({ Workshop__c: workshop.Id, Instructor__c: facilitator['Id'] }) }]
            }
            await this.sfService.create(data);
            await this.authService.grantPermissionToUser(resource, 2, facilitator['id']);
        }

        return ;
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
    private async removePermissions(workshop: Workshop, remove: any[]): Promise<void> {
        const resource = `/workshops/${workshop.Id}`;

        const ids = remove.map(facilitator => { return facilitator.Id });

        await this.sfService.delete({ object: 'WorkshopFacilitatorAssociation__c', ids });

        const instructors = remove.map(facilitator => { return `'${facilitator.Instructor__r.Id}'` });
        if (!instructors.length) return ;
        const users = await this.authService.getUsers(`user.extId IN (${instructors.join()})`);
        for (const user in users) {
            await this.authService.revokePermissionFromUser(resource, 2, user['id']);
        }

        return ;
    }

}