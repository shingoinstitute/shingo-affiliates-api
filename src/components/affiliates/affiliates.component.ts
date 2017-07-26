import { Component } from '@nestjs/common';
import { SalesforceService, AuthService, CacheService, SFQueryObject, SFSuccessObject } from '../';
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

    private sfService: SalesforceService;
    private authService: AuthService;
    private cache: CacheService;

    constructor() {
        this.sfService = new SalesforceService();
        this.authService = new AuthService();
        this.cache = new CacheService();
    };

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
            const affiliates = (await this.sfService.query(query)).records as Affiliate[];

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
            let affiliates: Affiliate[] = (await this.sfService.search(data)).searchRecords as Affiliate[];
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
     * @returns {Promise<any>} 
     * @memberof AffiliatesService
     */
    public async update(affiliate: Affiliate): Promise<any> {
        // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Account',
            records: [{ contents: JSON.stringify(affiliate) }]
        }

        const result: SFSuccessObject = (await this.sfService.update(data))[0];
        return Promise.resolve(result);
    }

    /**
     * @desc Deletes an Affiliate. Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * @param {string} id - Salesforce Id of the Account to delete
     * @returns {Promise<any>} 
     * @memberof AffiliatesService
     */
    public async delete(id: string): Promise<any> {
        // Create the data parameter for the RPC call
        const data = {
            object: 'Account',
            ids: [id]
        }
        const result: SFSuccessObject = (await this.sfService.delete(data))[0];
        for (const level of [0, 1, 2]) {
            await this.authService.deletePermission(`workshops -- ${id}`, level as 0 | 1 | 2);
            await this.authService.deletePermission(`affiliate -- ${id}`, level as 0 | 1 | 2);
        }

        const cm = await this.authService.getRole(`role.name='Course Manager -- ${id}'`);
        await this.authService.deleteRole(cm);

        return Promise.resolve(result);
    }
}