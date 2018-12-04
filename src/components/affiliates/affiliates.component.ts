import { Component, Inject } from '@nestjs/common';
import { SalesforceService, AuthService, CacheService, SFQueryObject, SFSuccessObject } from '../';
import { Affiliate } from './affiliate';
import * as _ from 'lodash';

export { Affiliate };

/**
 * @desc A service to provide functions for working with Affiliates
 * 
 * @export
 * @class AffiliatesService
 */
@Component()
export class AffiliatesService {

    constructor( @Inject('SalesforceService') private sfService: SalesforceService = new SalesforceService(),
        @Inject('AuthService') private authService: AuthService = new AuthService(),
        @Inject('CacheService') private cache: CacheService = new CacheService(),
    ) {}

    /**
     * @desc Get all AFfiliates (minus McKinsey if <code>isPublic</code>). Queries the following fields:<br><br>
     * <code>[<br>
     *  &emsp;"Id",<br>
     *  &emsp;"Name",<br>
     *  &emsp;"Summary__c",<br>
     *  &emsp;"Logo__c",<br>
     *  &emsp;"Page_Path__c",<br>
     *  &emsp;"Website",<br>
     *  &emsp;"Languages__c"<br>
     * ]</code>
     * 
     * @param {boolean} [isPublic=false] - Filter out private Affiliates
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @returns {Promise<Affiliate[]>} 
     * @memberof AffiliatesService
     */
    public async getAll(isPublic: boolean = false, refresh: boolean = false): Promise<Affiliate[]> {
        let key = 'AffiliatesService.getAll';
        const query: SFQueryObject = {
            action: "SELECT",
            fields: [
                "Id",
                "Name",
                "Summary__c",
                "Logo__c",
                "Page_Path__c",
                "Website",
                "Languages__c"
            ],
            table: "Account",
            clauses: "RecordType.DeveloperName='Licensed_Affiliate'"
        }

        if (isPublic) {
            key += '_public';
            query.clauses += " AND (NOT Name LIKE 'McKinsey%')";
        }

        let affiliates = [];
        if (!this.cache.isCached(key) || refresh) {
            affiliates = (await this.sfService.query(query)).records as Affiliate[];

            this.cache.cache(key, affiliates);
        } else {
            affiliates = this.cache.getCache(key);
        }

        if (isPublic) {
            return affiliates;
        }

        const roles = (await this.authService.getRoles(`role.name LIKE 'Course Manager -- %'`)).roles;

        affiliates = affiliates.filter(aff => roles.findIndex(role => role.name === `Course Manager -- ${aff.Id}`) !== -1);

        return affiliates;
    }

    /**
     * @desc Get the facilitator with the id passed at the parameter :id. The following fields are returned:<br><br>
     * <code>[<br>
     * TODO: Add fields that are returned<br>
     * ]</code>
     * 
     * @param {string} id - Salesforce ID for an Account
     * @returns {Promise<Affiliate>} 
     * @memberof AffiliatesService
     */
    public async get(id: string): Promise<Affiliate> {
        if (!this.cache.isCached(id)) {
            const affiliate = (await this.sfService.retrieve({ object: 'Account', ids: [id] }))[0];
            return affiliate;
        } else {
            return this.cache.getCache(id);
        }
    }

    /**
     * @desc Uses the Salesforce REST API to describe the Account object. See the Salesforce documentation for more about 'describe'
     * 
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @returns {Promise<any>} 
     * @memberof AffiliatesService
     */
    public async describe(refresh: boolean = false): Promise<any> {
        // Set the key for the cache
        const key = 'describeAccounts'

        // If no cached result, use the shingo-sf-api to get the result
        if (!this.cache.isCached(key) || refresh) {
            const describeObject = await this.sfService.describe('Account');

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
     * @desc Executes a SOSL query to search for text on Accounts of record type Licensed Affiliate. Example response body:<br><br>
     * <code>[<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "003g000001VvwEZAAZ",<br>
     *          &emsp;&emsp;"Name": "Test One",<br>
     *      &emsp;},<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "003g000001VvwEZABA",<br>
     *          &emsp;&emsp;"Name": "Test Two",<br>
     *      &emsp;},<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "003g000001VvwEZABB",<br>
     *          &emsp;&emsp;"Name": "Test Three",<br>
     *      &emsp;},<br>
     *  ]</code>
     * 
     * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Test*').
     * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Account fields to retrieve (i.e. 'Id, Name')
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @returns {Promise<Affiliate[]>} 
     * @memberof AffiliatesService
     */
    public async search(search: string, retrieve: string, refresh: boolean = false): Promise<Affiliate[]> {
        if (!retrieve.includes('RecordType.DeveloperName')) retrieve += ', RecordType.DeveloperName';
        // Generate the data parameter for the RPC call
        const data = {
            search: `{${search}}`,
            retrieve: `Account(${retrieve})`
        }

        // If no cached result, use the shingo-sf-api to get result
        if (!this.cache.isCached(data) || refresh) {
            let affiliates: Affiliate[] = (await this.sfService.search(data)).searchRecords as Affiliate[] || [];
            affiliates = affiliates.filter(aff => { return aff.RecordType && aff.RecordType.DeveloperName === 'Licensed_Affiliate'; });

            // Cache results
            this.cache.cache(data, affiliates);

            return affiliates;
        }
        // else return the cached result
        else {
            return this.cache.getCache(data);
        }
    }

    /**
     * @desc Executes a SOSL query to search for Contacts that match the given AccountId, and returns a list of Contacts that can be used as Course Managers.
     * @param {string} id - A Salesforce AccountId.
     * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Test*').
     * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Account fields to retrieve (i.e. 'Id, Name')
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     */
    public async searchCM(id: string, search: string, retrieve: string, refresh: boolean = false): Promise<any[]> {
        if (!retrieve.includes('AccountId')) retrieve += ', AccountId';
        const data = {
            search: `{${search}}`,
            retrieve: `Contact(${retrieve})`
        }

        if (!this.cache.isCached(data) || refresh) {
            let cms = (await this.sfService.search(data)).searchRecords || [];
            cms = cms.filter(cm => { return cm.AccountId === id; });

            this.cache.cache(data, cms);
            return cms;
        }
        else {
            return this.cache.getCache(data);
        }
    }

    /**
     * @desc Creates a new Account of record type 'Licensed Affiliate' in Salesforce and corresponding permissions and roles. Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * @param {Affiliate} affiliate - Affiliate to create
     * @returns {Promise<any>} 
     * @memberof AffiliatesService
     */
    public async create(affiliate: Affiliate): Promise<any> {
        // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Account',
            records: [{ contents: JSON.stringify(affiliate) }]
        }

        const result: SFSuccessObject = (await this.sfService.create(data))[0];
        await this.map({ Id: result.id } as Affiliate);

        this.cache.invalidate('AffiliatesService.getAll');

        return result;
    }

    /**
     * @desc Create the corresponding permissions and roles for the Affiliate in the Shingo Auth API.
     * 
     * @param {string} id - Affiliate's Account Id
     * @returns {Promise<any>} 
     * @memberof AffiliatesService
     */
    public async map(affiliate: Affiliate): Promise<any> {
        const cm = await this.authService.createRole({ name: `Course Manager -- ${affiliate.Id}`, service: 'affiliate-portal' });
        for (const level of [0, 1, 2]) {
            const workshopPerm = await this.authService.createPermission({ resource: `workshops -- ${affiliate.Id}`, level });
            await this.authService.grantPermissionToRole(workshopPerm.resource, 2, cm.id);

            const affiliatePerm = await this.authService.createPermission({ resource: `affiliate -- ${affiliate.Id}`, level });
            await this.authService.grantPermissionToRole(affiliatePerm.resource, 1, cm.id);
        }

        affiliate.RecordTypeId = '012A0000000zpraIAA';

        await this.sfService.update({ object: 'Account', records: [{ contents: JSON.stringify(affiliate) }] });

        this.cache.invalidate('AffiliatesService.getAll');

        return ;
    }

    /**
     * @desc Updates an Affiliate's fields: Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * @param {Affiliate} affiliate - Affiliate's fields to update
     * @returns {Promise<SFSuccessObject>} 
     * @memberof AffiliatesService
     */
    public async update(affiliate: Affiliate): Promise<SFSuccessObject> {
        // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Account',
            records: [{ contents: JSON.stringify(affiliate) }]
        }

        const result: SFSuccessObject = (await this.sfService.update(data))[0];

        this.cache.invalidate(affiliate.Id);
        this.cache.invalidate('AffiliatesService.getAll');

        return result;
    }

    /**
     * @desc Removes all permissions, roles, and user logins associated with the Affiliate. Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * @param {string} id - Salesforce Id of the Account to "delete"
     * @returns {Promise<any>} 
     * @memberof AffiliatesService
     */
    public async delete(id: string): Promise<SFSuccessObject> {
        const result: Affiliate = await this.get(id);
        result.RecordTypeId = '012A0000000zprfIAA';

        await this.deletePermissions(result.Id);

        await this.deleteRoles(result.Id);

        await this.deleteFacilitators(result.Id);

        const update: SFSuccessObject = await this.update(_.pick(result, ['Id', 'RecordTypeId']));


        this.cache.invalidate(id);
        this.cache.invalidate('AffiliatesService.getAll');
        this.cache.invalidate('AffiliatesService.getAll_public');

        return update;
    }

    /**
     * @desc Delete the associated permissions of an Affiliate from the Auth API. Namely 'workshops -- ID' and 'affiliate -- ID'
     * 
     * @private
     * @param {SalesforceId} id - The Affilaite's Salesforce Id
     * @returns {Promise<void>}
     * @memberof AffiliatesService
     */
    private async deletePermissions(id: string): Promise<void> {
        for (const level of [0, 1, 2]) {
            await this.authService.deletePermission(`workshops -- ${id}`, level as 0 | 1 | 2);
            await this.authService.deletePermission(`affiliate -- ${id}`, level as 0 | 1 | 2);
        }

        return ;
    }

    /**
     * @desc Delete the Affiliate specific roles from the Auth API. Namely, 'Course Manager -- ID'
     * 
     * @private
     * @param {SalesforceId} id - The Affiliate's Salesforce Id
     * @returns {Promise<void>} 
     * @memberof AffiliatesService
     */
    private async deleteRoles(id: string): Promise<void> {
        const cm = await this.authService.getRole(`role.name='Course Manager -- ${id}'`);
        await this.authService.deleteRole(cm);

        return ;
    }

    /**
     * @desc Delete the Affiliate's Facilitators logins from the Auth API.
     * 
     * @private
     * @param {SalseforceId} id - The Affiliate's SalesforceId
     * @returns {Promise<void>} 
     * @memberof AffiliatesService
     */
    private async deleteFacilitators(id: string): Promise<void> {
        const query: SFQueryObject = {
            action: "SELECT",
            fields: ["Id"],
            table: "Contact",
            clauses: `Facilitator_For__c='${id}' AND RecordType.DeveloperName='Affiliate_Instructor'`
        }
        const facilitators = (await this.sfService.query(query)).records as any[] || [];
        for (const facilitator of facilitators) {
            await this.authService.deleteUser({ extId: facilitator.Id });
        }

        return ;
    }
}