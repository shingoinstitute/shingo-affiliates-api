import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import { FacilitatorEmitter, FacilitatorAddedEvent } from '../../events';
import { SalesforceService, CacheService, AuthService } from '../../components';
import { checkRequired } from '../../validators/objKeyValidator';
import * as _ from 'lodash';

/**
 * @desc Controller of the REST API logic for Facilitators
 * 
 * @export
 * @class FacilitatorsController
 */
@Controller('facilitators')
export class FacilitatorsController {

    constructor(private sfService : SalesforceService, private authService : AuthService, private cache : CacheService) {
        this.sfClient = sfService.getClient();
        this.authClient = authService.getClient();
    };

    /**
     * @desc The RPC Client to interface with the Shingo SF Microservice
     * 
     * @private
     * @memberof FacilitatorsController
     */
    private sfClient;

    /**
     * @desc The RPC Client to interface with the Shingo Auth Microservice
     * 
     * @private
     * @memberof FacilitatorsController
     */
    private authClient;

    /**
     * @desc A helper function to return an error response to the client.
     * 
     * @private
     * @param {Response} res 
     * @param {string} message 
     * @param {*} error 
     * @param {HttpStatus} [errorCode=HttpStatus.INTERNAL_SERVER_ERROR] 
     * @returns {Promise<Response>} Response body is a JSON object with the error.
     * @memberof FacilitatorsController
     */
    private handleError(@Response() res, message : string, error : any, errorCode : HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) : Promise<Response>{
        if(error.metadata) error = this.sfService.parseRPCErrorMeta(error);

        console.error(message, error);
        return res.status(errorCode).json({ error });
    }

    /**
     * @desc <h5>GET: /facilitators</h5> -- Read all workshops for the current session's user's organization. If the current session's user is an Affiliate Manager the 'x-affilaite' header can be used to specify which Affiliate to view facilitators for ('' will query all Affiliates). The queried fields from Salesforce are as follows:<br><br>
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
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Header} [xAffiliate=''] - Header 'x-affiliate' Used by the 'Affiliate Manager' role to specify the affiliate to query facilitators for ('' queries all affiliates).
     * @param {Header} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache. Expected values are 'true' or 'false'.
     * @returns {Promise<Response>} Response body is JSON Array of objects of type <code>{<em>queried fields</em>}</code>
     * @memberof FacilitatorsController
     */
    @Get('')
    public async readAll(@Request() req, @Response() res, @Next() next, @Headers('x-affiliate') xAffiliate = '', @Headers('x-force-refresh') refresh = 'false') : Promise<Response> {
        let isAfMan = false;
        for(let role of req.session.user.roles){
            if(role.name === 'Affiliate Manager') isAfMan = true;
        }

        const affiliate = (isAfMan ? xAffiliate : req.session.affiliate);
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
        

        if(affiliate != '' && affiliate !== undefined) query.clauses += ` AND Facilitator_For__c='${affiliate}'`;
        else if(!isAfMan) return res.status(HttpStatus.BAD_REQUEST).json({error: 'MISSING_FIELDS'});

        if(!this.cache.isCached(query) || refresh === 'true'){
            return this.sfClient.query(query, (error, response) => {
                if(error) return this.handleError(res, 'Error in FacilitatorsController.readAll(): ', error);

                // Send records to caller
                let records = JSON.parse(response.contents);
                // Cache records
                this.cache.cache(query, records);

                return res.status(HttpStatus.OK).json(records);
            });
        } else {
            return res.status(HttpStatus.OK).json(this.cache.getCache(query));
        }
    }

    /**
     * @desc <h5>GET: /facilitators/describe</h5> -- Uses the Salesforce REST API to describe the Contact object. See the Salesforce documentation for more about 'describe'.
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Header} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.  Expected values are 'true' or 'false'.
     * @returns {Promise<Response>} Response body is a JSON object with the describe result
     * @memberof FacilitatorsController
     */
    @Get('/describe')
    public async describe(@Request() req, @Response() res, @Next() next, @Headers('x-force-refresh') refresh = 'false') : Promise<Response>{
        // Set the key for the cache
        const key = 'describeContacts';

        // If no cached result, use the shingo-sf-api to get the result
        if(!this.cache.isCached(key) || refresh ===  'true'){
            return this.sfClient.describe({object: 'Contact'}, (error, results) => {
                if(error) return this.handleError(res, 'Error in FacilitatorsController.describe(): ', error);

                // Send records to caller
                let records = JSON.parse(results.contents);
                
                // Cache records
                this.cache.cache(key, records);

                return res.status(HttpStatus.OK).json(records);
            });
        }
        // else return the cachedResult
        else {
            return res.status(HttpStatus.OK).json(this.cache.getCache(key));
        }
    }

    /**
     * @desc <h5>GET: /facilitators/search</h5> -- Executes a SOSL query to search for text on Contacts of record type Affiliate Instructor Salesforce. Example response body:<br><br>
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
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Test*').
     * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Contact fields to retrieve (i.e. 'Id, Name, Email')
     * @param {Header} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.  Expected values are 'true' or 'false'.
     * @returns {Promise<Response>} Response body is a JSON Array of objects of type {<em>retrieve fields</em>}
     * @memberof FacilitatorsController
     */
    @Get('/search')
    public async search(@Request() req, @Response() res, @Next() next, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false'){
        let isAfMan = false;
        for(let role of req.session.user.roles){
            if(role.name === 'Affiliate Manager') isAfMan = true;
        }
        if(!isAfMan && !req.session.affiliate) return res.status(HttpStatus.BAD_REQUEST).json({ error: 'MISSING_FIELDS' });
        
        // Check for required fields
        if(!search || !retrieve){
            return res.status(HttpStatus.BAD_REQUEST)
                .json({ error: 'MISSING_FIELDS' })
        }

        // Generate the data parameter for the RPC call
        if(!retrieve.includes('AccountId')) retrieve += ', AccountId';
        if(!retrieve.includes('RecordType.Name')) retrieve += ', RecordType.Name';
        const data = {
            search: `{${search}}`,
            retrieve: `Contact(${retrieve})`
        }

        // If no cached result, use the shingo-sf-api to get result
        if(!this.cache.isCached(data) || refresh === 'true'){
            return this.sfClient.search(data, (error, results) => {
                if(error) return this.handleError(res, 'Error in FacilitatorsController.search(): ', error);

                // Filter out non-instructors
                let records = JSON.parse(results.contents).searchRecords.filter(contact => { return contact.RecordType.Name === 'Affiliate Instructor' });
                
                // Cache records
                this.cache.cache(data, records);

                // Filter out other affiliate results if not affiliate manager
                if(!isAfMan || req.headers['x-affiliate']) records = records.filter(contact => { return contact.AccountId === (req.headers['x-affiliate'] === undefined ? req.session.affiliate : req.headers['x-affiliate'])})
                
                return res.status(HttpStatus.OK).json(records);
            });
        }
        // else return the cached result
        else {
            return res.status(HttpStatus.OK).json(this.cache.getCache(data));
        }
    }

    /**
     * @desc <h5>GET: /facilitators/<em>:id</em></h5> -- Reads the facilitator with the id passed at the parameter :id. The following fields are returned:<br><br>
     * <code>[<br>
     * TODO: Add fields that are returned<br>
     * ]</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {SalesforceId} id - Workshop\__c id. Matches <code>/[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response body is a JSON object of type {<em>returned fields</em>}
     * @memberof FacilitatorsController
     */
    @Get('/:id')
    public async read(@Request() req, @Response() res, @Next() next, @Param('id') id) : Promise<Response>{
        // Check the id
        const pattern = /[\w\d]{14,17}/;
        if(!pattern.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.`});
        }

        // Create the data parameter for the RPC call
        const data = {
            object: 'Contact',
            ids: [id]
        }

        return this.sfClient.retrieve(data, (error, results) => {
            if(error) return this.handleError(res, 'Error in FacilitatorsController.read(): ', error);

            // Send records to caller
            let record = JSON.parse(results.contents)[0];
            return res.status(HttpStatus.OK).json(record);
        });
    }

    /**
     * @desc <h5>POST: /facilitators</h5> -- Creates a new Contact of record type 'Affiliate Instructor' in Salesforce and addes a user to the Shingo Auth api. The user create for the Auth API will be assigned the role of roleId (defaults to 'Facilitator'). Returns a response like:<br><br>
     * <code>{<br> 
     *  &emsp;"jwt": string,<br>
     *  &emsp;"id:" number<br>
     * }</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Body} body - Required fields: <code>[ 'AccountId', 'FirstName', 'LastName', 'Email', 'password' ]</code><br>Optional fields: <code>[ 'roleId' ]</code>
     * @returns {Promise<Response>} Response body is a JSON object.
     * @memberof FacilitatorsController
     */
    @Post()
    public async create(@Request() req, @Response() res, @Next() next, @Body() body) : Promise<Response> {
        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(body.AccountId)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'INVALID_SF_ID', message: `${body.AccountId} is not a valid Salesforce ID.`});
        }

        let required = checkRequired(body, [ 'AccountId', 'FirstName', 'LastName', 'Email', 'password' ]);
        if(!required.valid) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error:"MISSING_FIELDS", fields: required.missing });
        }

        const roleId = (body.roleId ? body.roleId : global['facilitatorId']);

        let contact = _.omit(body, [ "password", "roleId" ]);

        contact.RecordTypeId = '012A0000000zpqrIAA';
        const data = {
            object: 'Contact',
            records: [ { contents: JSON.stringify(contact)}]
        }
        return this.sfClient.create(data, (error, result) => {
            if(error) return this.handleError(res, 'Error in FacilitatorsController.create(): ', error);

            const record = JSON.parse(result.contents)[0];

            return this.authClient.createUser({email: body.Email, password: body.password, services: 'affiliate-portal'}, (error, user) => {
                if(error) return this.handleError(res, 'Error in FacilitatorsController.create(): ~ln 234', error);

                return this.authClient.addRoleToUser({userEmail: user.email, roleId}, (error, added) => {
                    if(error) this.handleError(res, 'Error in FacilitatorsController.create(): ~ln 241', error);
                    
                    if(!added.response) return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({error: 'ROLE_NOT_ADDED'});

                    return res.status(HttpStatus.CREATED).json({ jwt: user.jwt, id: user.id });
                });
            });
        });
    }

    // @Put('/:id')
    // public async update(@Request() req, @Response() res, @Next() next, @Body() body, @Param('id') id){
    //     const pattern = /[\w\d]{15,17}/;
    //     if(!pattern.test(body.AccountId)) {
    //         return res.status(HttpStatus.BAD_REQUEST)
    //             .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`})
    //     } else if(!pattern.test(id) || !pattern.test(body.Id) || id !== body.Id) {
    //         return res.status(HttpStatus.BAD_REQUEST)
    //             .json({error: `Invalid Salesforce Id: ${id}`})            
    //     }

    //     if(!body.AccountId || !body.FirstName || !body.LastName || !body.Email || !body.password) {
    //         let fields = new Array<String>();
    //         if(!body.AccountId) fields.push("AccountId");
    //         if(!body.FirstName) fields.push("FirstName");
    //         if(!body.LastName) fields.push("LastName");
    //         if(!body.Email) fields.push("Email");
    //         if(!body.password) fields.push("password");
    //         return res.status(HttpStatus.BAD_REQUEST).json({ error:"MISSING_FIELDS", fields });
    //     }

    //     let contact = _.omit(body, [ "password" ]);

    //     const data = {
    //         object: 'Contact',
    //         records: [ { contents: JSON.stringify(contact)}]
    //     }
    //     sfClient.update(data, (error, result) => {
    //         if(error){
    //             console.error('Error in FacilitatorsController.create(): ', error)
    //             return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
    //                 .json({ error: JSON.parse(error.metadata.get('error-bin').toString()) });
    //         }

    //         const record = JSON.parse(result.contents)[0];
    //     })
    // }

    // @Delete('/:id')
    // public async delete(@Request() req, @Response() res, @Next() next, @Param('id') id) {
    //     const pattern = /[\w\d]{15,17}/;
    //     if(!pattern.test(body.AccountId)) {
    //         return res.status(HttpStatus.BAD_REQUEST)
    //         .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`})
    //     }

    //     // Create the data parameter for the RPC call
    //     const data = {
    //         object: 'Contact',
    //         ids: [id]
    //     }
    //     sfClient.delete(data, (error, response) => {
    //         if(error){
    //             console.error('Error in FacilitatorsController.delete(): ', error)
    //             return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
    //                 .json({ 
    //                     error: JSON.parse(error.metadata.get('error-bin').toString())
    //                 });
    //         }

    //         authClient.deleteUserByEmail({username: })

    //         const record = JSON.parse(response.contents)[0];
    //         FacilitatorEmitter.emitter.emit('deleted', new FacilitatorDeletedEvent(record.id));
    //         return res.status(HttpStatus.OK).json(record);
    //     })
    // }
}