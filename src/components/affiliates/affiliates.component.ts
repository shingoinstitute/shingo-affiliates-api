import { Component, Inject } from '@nestjs/common';
import { SalesforceService, AuthService, CacheService, SFQueryObject, SFSuccessObject, LoggerService } from '../';
import { Affiliate } from './affiliate';

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
        @Inject('LoggerService') private log: LoggerService = new LoggerService()) { }

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
            clauses: "RecordType.Name='Licensed Affiliate'"
        }

        if (!isPublic) query.clauses += " AND (NOT Name LIKE 'McKinsey%')";

        if (!this.cache.isCached(query) || refresh) {
            let affiliates = (await this.sfService.query(query)).records as Affiliate[];

            const affiliatePermissions = (await this.authService.getRoles(`role.name LIKE 'affiliate -- %'`)).roles;

            const ids = new Set(affiliatePermissions.map(p => p.split('affiliate -- ')[0]));

            affiliates = affiliates.filter(aff => ids.has(aff.Id));

            if (isPublic) this.cache.cache(query, affiliates);

            return Promise.resolve(affiliates);
        } else {
            return Promise.resolve(this.cache.getCache(query));
        }
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
        const affiliate = (await this.sfService.retrieve({ object: 'Account', ids: [id] }))[0];
        return Promise.resolve(affiliate);
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

            return Promise.resolve(describeObject);
        }
        // else return the cachedResult
        else {
            return Promise.resolve(this.cache.getCache(key));
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
        if (!retrieve.includes('RecordType.Name')) retrieve += ', RecordType.Name';
        // Generate the data parameter for the RPC call
        const data = {
            search: `{${search}}`,
            retrieve: `Account(${retrieve})`
        }

        // If no cached result, use the shingo-sf-api to get result
        if (!this.cache.isCached(data) || refresh) {
            let affiliates: Affiliate[] = (await this.sfService.search(data)).searchRecords as Affiliate[] || [];
            affiliates = affiliates.filter(aff => { return aff.RecordType.Name === 'Licensed Affiliate'; });

            // Cache results
            this.cache.cache(data, affiliates);

            return Promise.resolve(affiliates);
        }
        // else return the cached result
        else {
            return Promise.resolve(this.cache.getCache(data));
        }
    }

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
            return Promise.resolve(cms);
        }
        else {
            return Promise.resolve(this.cache.getCache(data));
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
        affiliate.RecordTypeId = '012A0000000zpraIAA'
        // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Account',
            records: [{ contents: JSON.stringify(affiliate) }]
        }

        const result: SFSuccessObject = (await this.sfService.create(data))[0];
        await this.map(result.id);

        return Promise.resolve(result);
    }

    /**
     * @desc Create the corresponding permissions and roles for the Affiliate in the Shingo Auth API.
     * 
     * @param {string} id - Affiliate's Account Id
     * @returns {Promise<any>} 
     * @memberof AffiliatesService
     */
    public async map(id: string): Promise<any> {
        const cm = await this.authService.createRole({ name: `Course Manager -- ${id}`, service: 'affiliate-portal' });
        for (const level of [0, 1, 2]) {
            const workshopPerm = await this.authService.createPermission({ resource: `workshops -- ${id}`, level });
            await this.authService.grantPermissionToRole(workshopPerm.resource, 2, cm.id);

            const affiliatePerm = await this.authService.createPermission({ resource: `affiliate -- ${id}`, level });
            await this.authService.grantPermissionToRole(affiliatePerm.resource, 1, cm.id);
        }

        return Promise.resolve();
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
        return Promise.resolve(result);
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

        const update: SFSuccessObject = await this.update(result);

        return Promise.resolve(update);
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

        return Promise.resolve();
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

        return Promise.resolve();
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
            clauses: `Facilitator_For__c='${id}' AND RecordType.Name='Affiliate Instructor'`
        }
        const facilitators = (await this.sfService.query(query)).records as any[] || [];
        for (const facilitator of facilitators) {
            await this.authService.deleteUser({ extId: facilitator.Id });
        }

        return Promise.resolve();
    }
}