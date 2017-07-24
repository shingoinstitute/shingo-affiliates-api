import { Component } from '@nestjs/common';
import {
    SalesforceService, AuthService, CacheService, User,
    SFQueryObject
} from '../';
import * as _ from 'lodash';

/**
 * @desc A service to provide functions for working with Facilitators
 * 
 * @export
 * @class FacilitatorsService
 */
@Component()
export class FacilitatorsService {

    constructor(private sfService: SalesforceService, private authService: AuthService, private cache: CacheService) { }

    public parseRPCErrorMeta = this.sfService.parseRPCErrorMeta;

    /**
     * @desc Get all facilitators for the affiliate specified. All if <code>affiliate === ''</code>. The queried fields from Salesforce are as follows:<br><br>
     * <code>[<br>
     *  &emsp;"Id",<br>
     *  &emsp;"FirstName",<br>
     *  &emsp;"LastName",<br>
     *  &emsp;"Email",<br>
     *  &emsp;"Title",<br>
     *  &emsp;"Account.Id",<br>
     *  &emsp;"Account.Name",<br>
     *  &emsp;"Facilitator_For\__r.Id",<br>
     *  &emsp;"Facilitator_For\__r.Name",<br>
     *  &emsp;"Photograph\__c",<br>
     *  &emsp;"Biography\__c"<br>
     * ]</code>
     * 
     * @param {User} user - Requires <code>user.permissions[]</code> and <code>user.roles[].permissions[]</code>
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @param {string} [affiliate] - SF Id of the affiliate to get facilitators for (or '' to get all facilitators)
     * @returns {Promise<any[]>} 
     * @memberof FacilitatorsService
     */
    public async getAll(user: User, refresh: boolean = false, affiliate?: string): Promise<any[]> {
        let isAfMan = false;
        for (let role of user.roles) {
            if (role.name === 'Affiliate Manager') isAfMan = true;
        }

        let query = {
            action: "SELECT",
            fields: [
                "Id",
                "FirstName",
                "LastName",
                "Email",
                "Title",
                "Account.Id",
                "Account.Name",
                "Facilitator_For__r.Id",
                "Facilitator_For__r.Name",
                "Photograph__c",
                "Biography__c"
            ],
            table: "Contact",
            clauses: `RecordType.Name='Affiliate Instructor'`
        }

        if (affiliate != '') query.clauses += ` AND Facilitator_For__c='${affiliate}'`;

        if (!this.cache.isCached(query) || refresh) {
            const facilitators = await this.sfService.query(query as SFQueryObject);

            this.cache.cache(query, facilitators);
            return Promise.resolve(facilitators.records);
        } else {
            return Promise.resolve(this.cache.getCache(query));
        }

    }

    /**
     * @desc Uses the Salesforce REST API to describe the Contact object. See the Salesforce documentation for more about 'describe'
     * 
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async describe(refresh: boolean = false): Promise<any> {
        const key = 'describeContacts';

        if (!this.cache.isCached(key) || refresh) {
            const describeObject = await this.sfService.describe('Contact');

            this.cache.cache(key, describeObject);

            return Promise.resolve(describeObject);
        } else {
            return Promise.resolve(this.cache.getCache(key));
        }
    }

    /**
     * @desc Executes a SOSL query to search for text on Contacts of record type Affiliate Instructor Salesforce. Example response body:<br><br>
     * <code>[<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "003g000001VvwEZAAZ",<br>
     *          &emsp;&emsp;"Name": "Test One",<br>
     *          &emsp;&emsp;"Email": "testone@example.com"<br>
     *      &emsp;},<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "003g000001VvwEZABA",<br>
     *          &emsp;&emsp;"Name": "Test Two",<br>
     *          &emsp;&emsp;"Email": "testtwo@example.com"<br>
     *      &emsp;},<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "003g000001VvwEZABB",<br>
     *          &emsp;&emsp;"Name": "Test Three",<br>
     *          &emsp;&emsp;"Email": "testthree@example.com"<br>
     *      &emsp;},<br>
     *  ]</code>
     * 
     * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Test*').
     * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Contact fields to retrieve (i.e. 'Id, Name, Email')
     * @param {string} [affiliate=''] - The SF Id to filter results for (or '' for no filter)
     * @param {boolean} [isAfMan=false] - Is request coming from an Affiliate Manager
     * @param {boolean} [refresh=false] - Force the refresh of the cache
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async search(search: string, retrieve: string, affiliate: string = '', isAfMan: boolean = false, refresh: boolean = false): Promise<any> {
        // Generate the data parameter for the RPC call
        if (!retrieve.includes('AccountId')) retrieve += ', AccountId';
        if (!retrieve.includes('RecordType.Name')) retrieve += ', RecordType.Name';
        const data = {
            search: `{${search}}`,
            retrieve: `Contact(${retrieve})`
        }

        if (!this.cache.isCached(data) || refresh) {
            const facilitators = (await this.sfService.search(data)).searchResults.filter(result => {
                if (affiliate === '') return result.RecordType.Name === 'Affiliate Instructor';
                else return result.AccountId === affiliate && result.RecordType.Name === 'Affiliate Instructor';
            });

            this.cache.cache(data, facilitators);

            return Promise.resolve(facilitators);
        } else {
            return Promise.resolve(this.cache.getCache(data));
        }
    }

    /**
     * @desc Get the facilitator with the id passed at the parameter :id. The following fields are returned:<br><br>
     * <code>[<br>
     * TODO: Add fields that are returned<br>
     * ]</code>
     * 
     * @param {string} id - Salesforce ID for a Contact
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async get(id: string): Promise<any> {
        // Create the data parameter for the RPC call
        const data = {
            object: 'Contact',
            ids: [id]
        }

        const facilitator = (await this.sfService.retrieve(data))[0];
        const user = await this.authService.getUser(`user.email=${facilitator.Email}`);
        return Promise.resolve(_.merge(facilitator, _.omit(user, ['email', 'password'])));
    }

    /**
     * @desc Creates a new Contact of record type 'Affiliate Instructor' in Salesforce and addes a user to the Shingo Auth api. The user create for the Auth API will be assigned the role of roleId (defaults to 'Facilitator'). Returns a response like:<br><br>
     * <code>{<br> 
     *  &emsp;"jwt": string,<br>
     *  &emsp;"id:" number<br>
     * }</code>
     * 
     * @param {any} user - User to create
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async create(user): Promise<any> {
        const roleId = (user.roleId ? user.roleId : global['facilitatorId']);

        let contact = _.omit(user, ["password", "roleId"]);

        // Create the contact in Salesforce
        contact.RecordTypeId = '012A0000000zpqrIAA';
        const data = {
            object: 'Contact',
            records: [{ contents: JSON.stringify(contact) }]
        }
        const record = (await this.sfService.create(data))[0];
        let auth = await this.authService.getUser(`user.email=${user.Email}`);

        if (auth === undefined) {
            auth = await this.createNewAuth(user.Email, user.password, roleId, record.id);
        }

        auth = await this.mapCurrentAuth(user.Email, roleId, record.id);
        Promise.resolve({ id: record.id, ...auth });
    }

    /**
     * @desc Uses the Shingo Auth API to create a new login
     * 
     * @param {string} email 
     * @param {string} password 
     * @param {number} roleId 
     * @param {string} extId - Salesforce Id of the associated contact
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async createNewAuth(email: string, password: string, roleId: number, extId: string): Promise<any> {
        const user = await this.authService.createUser({ email, password, services: 'affiliate-portal', extId });
        await this.authService.addRoleToUser({ userEmail: email, roleId });
        return Promise.resolve({ jwt: user.jwt, id: user.id });
    }

    /**
     * @desc Uses the Shingo Auth API to map a Salesforce contact to a current login
     * 
     * @param {string} userEmail 
     * @param {number} roleId 
     * @param {string} extId - Salesforce Id of the associated contact
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async mapCurrentAuth(userEmail: string, roleId: number, extId: string): Promise<any> {
        const user = await this.authService.getUser(`user.email=${userEmail}`);

        if (user === undefined) Promise.reject({ error: 'USER_NOT_FOUND' });

        user.extId = extId;
        user.services = (user.services === '' ? 'affiliate-portal' : user.services + ', affiliate-portal');
        await this.authService.updateUser(user);
        await this.authService.addRoleToUser({ userEmail, roleId });

        return Promise.resolve({ jwt: user.jwt, id: user.id });
    }

    /**
     * @desc Updates a facilitator's fields. Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"record": {<br>
     *      &emsp;&emsp;"id": SalesforceId,<br>
     *      &emsp;&emsp;"success": boolean,<br>
     *      &emsp;&emsp;"errors": []<br>
     *      &emsp;},<br>
     *      &emsp;"salesforce": boolean,<br>
     *      &emsp;"auth": boolean
     *  }</code> 
     * 
     * @param {any} user - The facilitator's fields to update
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async update(user): Promise<any> {
        const contact = _.omit(user, ["password"]);

        const data = {
            object: 'Contact',
            records: [{ contents: JSON.stringify(contact) }]
        }
        const record = (await this.sfService.create(data))[0];
        if (user.Email || user.Password) {
            return Promise.resolve({ salesforce: true, auth: await this.updateAuth(user, record.id), record });
        }

        return Promise.resolve({ salesforce: true, auth: false, record });
    }

    /**
     * @desc Update the associated login of a facilitator
     * 
     * @param {any} user - Facilitator's fields to update
     * @param {any} extId - Facilitator's Contact ID
     * @returns {Promise<boolean>} 
     * @memberof FacilitatorsService
     */
    public async updateAuth(user, extId): Promise<boolean> {
        const set = { extId };
        if (user.Email) set['email'] = user.Email;
        if (user.password) set['password'] = user.password;

        const updated = await this.authService.updateUser(set as User);
        return Promise.resolve((updated && updated.response));
    }

    /**
     * @desc Deletes a facilitator. Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * 
     * @param {string} id - Salesforce Id of the Contact to delete
     * @returns {Promise<any>} 
     * @memberof FacilitatorsService
     */
    public async delete(id: string): Promise<any> {
        // Create the data parameter for the RPC call
        const data = {
            object: 'Contact',
            ids: [id]
        }
        const record = (await this.sfService.delete(data))[0];
        return Promise.resolve(record);
    }

    /**
     * @desc Delete a login from the Shingo Auth API
     * 
     * @param {string} extId - Facilitator's Contact Id
     * @returns {Promise<boolean>} 
     * @memberof FacilitatorsService
     */
    public async deleteAuth(extId: string): Promise<boolean> {
        const deleted = await this.authService.deleteUser({ extId });
        return Promise.resolve(deleted && deleted.response);
    }

    /**
     * @desc Remove the Affiliate Portal as service for a login
     * 
     * @param {string} extId - Facilitator's Contact Id
     * @returns {Promise<boolean>} 
     * @memberof FacilitatorsService
     */
    public async unmapAuth(extId: string): Promise<boolean> {
        const user = await this.authService.getUser(`user.extId='${extId}'`);

        if (user === undefined) return Promise.reject({ error: 'USER_NOT_FOUND' })

        if (user.services === 'affiliate-portal') user.services = '';
        else if (user.services.includes(', affiliate-portal')) user.services = user.services.replace(', affiliate-portal', '');
        else if (user.services.includes('affiliate-portal, ')) user.services = user.services.replace('affiliate-portal', '');

        const updated = await this.authService.updateUser(user);
        return Promise.resolve(updated && updated.resolve);
    }

    /**
     * @desc Change a Facilitator's role to the role specified by <code>roleId</code>. If a role exists that belongs to the Affiliate Portal, it is removed first
     * 
     * @param {string} extId - Facilitator's Contact Id
     * @param {any} roleId - Id of the role to change to
     * @returns {Promise<boolean>} 
     * @memberof FacilitatorsService
     */
    public async changeRole(extId: string, roleId): Promise<boolean> {
        const user = await this.authService.getUser(`user.extId='${extId}'`);

        if (user === undefined) return Promise.reject({ error: 'USER_NOT_FOUND' });

        const currentRole = user.roles.filter(role => { return role.service === 'affiliate-portal'; });

        const set = { userEmail: user.email, roleId };
        if (currentRole !== undefined) {
            await this.authService.removeRoleFromUser({ userEmail: user.email, roleId: currentRole.id });
        }
        const added = await this.authService.addRoleToUser(set);
        return Promise.resolve(added && added.response);
    }
}