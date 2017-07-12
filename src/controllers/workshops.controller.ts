import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import { WorkshopEmitter, WorkshopAddedEvent, WorkshopDeletedEvent, WorkshopUpdatedEvent } from '../events';
import * as NodeCache from 'node-cache';
import * as hash from 'object-hash';
import * as grpc from 'grpc';
import * as path from 'path';

const sfservices = grpc.load(path.join(__dirname, '../../proto/sf_services.proto')).sfservices;
const client = new sfservices.SalesforceMicroservices(`${process.env.SF_API}:80`, grpc.credentials.createInsecure());

const authservices = grpc.load(path.join(__dirname, '../../proto/auth_services.proto')).authservices;
const authClient = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

/**
 * @desc Used for an in-memory cache (stdTTL = 30min, check for cleanup every 15min)
 */
const cache = new NodeCache({ stdTTL: 1800, checkperiod: 900 });

/**
 * @desc Controller of the REST API logic for Workshops
 * 
 * @export
 * @class WorkshopsController
 */
@Controller('workshops')
export class WorkshopsController {

    /**
     * @desc <h5>GET: /workshops</h5> -- Read all workshops that the current session's user has permissions for. The function assembles a list of workshop ids form the users permissions to query Salesforce. The response of the query is then returned to the requesting client. The queried fields from Salesforce are as follows:<br><br>
     *  <code>[<br>
     *      &emsp;"Id",<br>
     *      &emsp;"Name",<br>
     *      &emsp;"Start_Date__c",<br>
     *      &emsp;"End_Date__c",<br>
     *      &emsp;"Course_Manager__c",<br>
     *      &emsp;"Billing_Contact__c",<br>
     *      &emsp;"Event_City__c",<br>
     *      &emsp;"Event_Country__c",<br>
     *      &emsp;"Organizing_Affiliate__c",<br>
     *      &emsp;"Public__c",<br>
     *      &emsp;"Registration_Website__c",<br>
     *      &emsp;"Status__c",<br>
     *      &emsp;"Host_Site__c",<br>
     *      &emsp;"Workshop_Type__c",<br>
     *      &emsp;"Language__c"<br>
     *  ]</code><br><br>
     * The query is ordered by <em>'Start_Date__c'</em>.
     * 
     * @param {Request} req - Express request. Should have header x-jwt that is associated with a valid user. Used in Auth middleware that protects this route.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Session} session - Session contains the current user. The function uses the permissions on this object to query Salesforce for the workshops.
     * @returns {Promise<Response>} Response body contains a JSON object of type <code>{totalSize: number, done: boolean, records: Workshop[]}</code>
     * @memberof WorkshopsController
     */
    @Get()
    public async readAll(@Request() req, @Response() res, @Next() next, @Session() session) : Promise<Response> {
        if(!session.user) return next({error: "Session Expired!"});
        let ids = [];
        console.log('User permissions: ', session.user.permissions);
        session.user.permissions.forEach(p => {
            if(p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
        });
        console.log('Roles: ', session.user.roles);
        session.user.roles.forEach(role => {
            role.permissions.forEach(p => {
                if(p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
            });
        });

        // get array of unique ids
        ids = [...new Set(ids)];

        if(ids.length === 0) return res.status(HttpStatus.OK).json({records: [], totalSize: 0, done: true});

        const ids_for_query = ids.join();

        console.log('Ids for query: ', ids_for_query);
        const query = {
            action: "SELECT",
            fields: [
                "Id",
                "Name",
                "Start_Date__c",
                "End_Date__c",
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
                "Language__c"
            ],
            table: "Workshop__c",
            clauses: `Id IN (${ids_for_query}) ORDER BY Start_Date__c`
        }

        client.query(query, (error, response) => {
            if(error){
                console.error('Error in WorkshopsController.readAll(): ', JSON.parse(error.metadata.get('error-bin').toString()))
                console.log('raw error: ', error);
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            // Send records to caller
            let records = JSON.parse(response.contents);
            return res.status(HttpStatus.OK).json(records);
        });
    }

    /**
     * @desc <h5>GET: /workshops/public</h5> -- Reads public workshops that have been verified. The queried fields from Salesforce are as follows: <br><br>
     * <code>[<br>
     *          &emsp;"Id",<br>
                &emsp;"Name",<br>
                &emsp;"Host_Site__c",<br>
                &emsp;"Start_Date__c",<br>
                &emsp;"End_Date__c",<br>
                &emsp;"Event_City__c",<br>
                &emsp;"Event_Country__c",<br>
                &emsp;"Organizing_Affiliate__r.Id",<br>
                &emsp;"Organizing_Affiliate__r.Name",<br>
                &emsp;"Workshop_Type__c",<br>
                &emsp;"Registration_Website__c"<br>
     * ]</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {string} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.
     * @returns {Promise<Response>} Response body is a JSON object of type {<em>queried fields</em>}
     * @memberof WorkshopsController
     */
    @Get('/public')
    public async readPublic(@Request() req, @Response() res, @Next() next, @Headers('x-force-refresh') refresh = 'false') : Promise<Response>{
        let query = {
            action: "SELECT",
            fields: [
                "Id",
                "Name",
                "Host_Site__c",
                "Start_Date__c",
                "End_Date__c",
                "Event_City__c",
                "Event_Country__c",
                "Organizing_Affiliate__r.Id",
                "Organizing_Affiliate__r.Name",
                "Workshop_Type__c",
                "Registration_Website__c"
            ],
            table: "Workshop__c",
            clauses: "Public__c=true AND Status__c='Verified'"
        }

        const key = hash(query);

        const cachedResult = cache.get(key);

        if(cachedResult === undefined || refresh === 'true'){
            client.query(query, (error, response) => {
                if(error){
                    console.error('Error in WorkshopsController.readPublic(): ', error)
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ 
                            error: JSON.parse(error.metadata.get('error-bin').toString())
                        });
                }
                // Send records to caller
                let records = JSON.parse(response.contents);
                res.status(HttpStatus.OK).json(records);

                // Cache records
                records.cached = new Date().toISOString();
                const success = cache.set(key, records);
                if(!success) console.error("Response could not be cached!");
            });
        } else {
            return res.status(HttpStatus.OK)
                .json(cachedResult);
        }
    }

    /**
     * @desc <h5>GET: /workshops/describe</h5> -- Uses the Salesforce REST API to describe the Workshop__c object. See the Salesforce documentation for more about 'describe'.
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {string} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.
     * @returns {Promise<Response>} Response body is a JSON object with the describe result
     * @memberof WorkshopsController
     */
    @Get('/describe')
    public async describe(@Request() req, @Response() res, @Next() next, @Headers('x-force-refresh') refresh = 'false') : Promise<Response>{
        // Set the key for the cache
        const key = 'describeWorkshops'

        // Get the cached result (if exists)
        const cachedResult = cache.get(key)

        // If no cached result, use the shingo-sf-api to get the result
        if(cachedResult === undefined || refresh ===  'true'){
            client.describe({object: 'Workshop__c'}, (error, results) => {
                if(error){
                    console.error('Error in WorkshopsController.describe(): ', error)
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ 
                            error: JSON.parse(error.metadata.get('error-bin').toString())
                        });
                }

                // Send records to caller
                let records = JSON.parse(results.contents);
                res.status(HttpStatus.OK).json(records);

                // Cache records
                records.cached = new Date().toISOString();
                const success = cache.set(key, records);
                if(!success) console.error("Response could not be cached!");
            });
        }
        // else return the cachedResult
        else {
            return res.status(HttpStatus.OK)
            .json(cachedResult)
        }
    }

    /**
     * @desc <h5>GET: /workshops/search</h5> -- Executes a SOSL query to search for text on workshop records in Salesforce. Example response body:<br><br>
     * <code>[<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "a1Sg0000001jXbgEAE",<br>
     *          &emsp;&emsp;"Name": "Test Workshop 10 (Updated)",<br>
     *          &emsp;&emsp;"Start_Date__c": "2017-07-12"<br>
     *      &emsp;},<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "a1Sg0000001jXWgEAM",<br>
     *          &emsp;&emsp;"Name": "Test Workshop 9 (Updated)",<br>
     *          &emsp;&emsp;"Start_Date__c": "2017-07-11"<br>
     *      &emsp;},<br>
     *      &emsp;{<br>
     *          &emsp;&emsp;"Id": "a1Sg0000001jXWbEAM",<br>
     *          &emsp;&emsp;"Name": "Test Workshop 8",<br>
     *          &emsp;&emsp;"Start_Date__c": "2017-07-11"<br>
     *      &emsp;}<br>
     *  ]</code>
     * 
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {string} search - Header 'x-search'. SOSL search expression (i.e. '*Discover Test*').
     * @param {string} retrieve - Header 'x-retrieve'. A comma seperated list of the Workshop__c fields to retrieve (i.e. 'Id, Name, Start_Date__c')
     * @param {string} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.
     * @returns {Promise<Response>} Response body is a JSON Array of objects of type {<em>retrieve fields</em>}
     * @memberof WorkshopsController
     */
    @Get('/search')
    public async search(@Request() req, @Response() res, @Next() next, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false') : Promise<Response>{
         // Check for required fields
        if(!search || !retrieve){
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing ' + (!search && !retrieve ? 'search and retrieve ' : !search ? 'search' : 'retrieve') + ' parameters!'})
        }

        // Generate the data parameter for the RPC call
        const data = {
            search: `{${search}}`,
            retrieve: `Workshop__c(${retrieve})`
        }

        // Create the cache key based on the hash of the data
        const key = hash(data)

        // Get the cached result (if exists)
        const cachedResult = cache.get(key)

        // If no cached result, use the shingo-sf-api to get result
        if(cachedResult === undefined || refresh === 'true'){
            client.search(data, (error, results) => {
                if(error){
                    console.error('Error in WorkshopsController.search(): ', error)
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ 
                            error: JSON.parse(error.metadata.get('error-bin').toString())
                        });
                }

                // Send records to caller
                let records = JSON.parse(results.contents).searchRecords;
                res.status(HttpStatus.OK).json(records);

                // Cache records
                records.cached = new Date().toISOString();
                const success = cache.set(key, records);
                if(!success) console.error("Response could not be cached!");
            });
        }
        // else return the cached result
        else {
            return res.status(HttpStatus.OK)
            .json(cachedResult)
        }
    }

    /**
     * @desc <h5>GET: /workshops/<em>:id</em></h5> -- Reads the workshop with id passed at the parameter :id. The follow fields are returned:<br><br>
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
     *   &emsp;"Billing_Contact__c",<br>
     *   &emsp;"Course_Manager__c",<br>
     *   &emsp;"End_Date__c",<br>
     *   &emsp;"Event_City__c",<br>
     *   &emsp;"Event_Country__c",<br>
     *   &emsp;"Organizing_Affiliate__c",<br>
     *   &emsp;"Public__c",<br>
     *   &emsp;"Registration_Website__c",<br>
     *   &emsp;"Start_Date__c",<br>
     *   &emsp;"Status__c",<br>
     *   &emsp;"Workshop_Type__c",<br>
     *   &emsp;"Host_Site__c",<br>
     *   &emsp;"Language__c",<br>
     * ]</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {SalesforceId} id - Workshop__c id. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response body is a JSON object of type {<em>returned fields</em>}
     * @memberof WorkshopsController
     */
    @Get('/:id')
    public async read(@Request() req, @Response() res, @Next() next, @Param('id') id) : Promise<Response>{
        // Check the id
        const pattern = /a[\w\d]{14,17}/;
        if(!pattern.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${id}`})
        }

        // Create the data parameter for the RPC call
        const data = {
            object: 'Workshop__c',
            ids: [id]
        }

        client.retrieve(data, (error, results) => {
            if(error){
                console.error('Error in WorkshopsController.read(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            // Send records to caller
            let record = JSON.parse(results.contents)[0];
            return res.status(HttpStatus.OK).json(record);
        });
    }

    /**
     * @desc <h5>GET: /workshops/<em>:id</em>/facilitators</h5> -- Get the associated instructors for the workshop with id given in the param <em>:id</em>. Queried fields are as follows:<br><br>
     * [<br>
     *  &emsp;"Instructor__r.FirstName",<br>
     *  &emsp;"Instructor__r.LastName",<br>
     *  &emsp;"Instructor__r.Email",<br>
     *  &emsp;"Instructor__r.Title"<br>
     * ]
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {SalesforceId} id - Workshop__c id. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Array of objects of type <code>{<em>queried fields</em>}</code>
     * @memberof WorkshopsController
     */
    @Get('/:id/facilitators')
    public async facilitators(@Request() req, @Response() res, @Next() next, @Param('id') id) : Promise<Response>{
        // Check the id
        const pattern = /a[\w\d]{14,17}/;
        if(!pattern.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${id}`})
        }

        let query = {
            action: "SELECT",
            fields: [
                "Instructor__r.FirstName",
                "Instructor__r.LastName",
                "Instructor__r.Email",
                "Instructor__r.Title"
            ],
            table: "WorkshopFacilitatorAssociation__c",
            clauses: `Workshop__c='${id}'`
        }

        client.query(query, (error, response) => {
            if(error){
                console.error('Error in WorkshopsController.facilitators(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }
            // Send records to caller
            let records = JSON.parse(response.contents);
            return res.status(HttpStatus.OK).json(records);
        });
    }

    /**
     * @desc <h5>POST: /workshops</h5> -- Creates a new workshop in Salesforce and creates permissions for the workshop in the Shingo Auth API. <b>Fires WorkshopAddedEvent</b>. Returns the following in the response body:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Body} body - Required fields <code>[ "Name", "Organizing_Affiliate__c", "Start_Date__c", "End_Date__c" ]</code>
     * @param {Session} session - Accesses the affiliate id from the session to compare to the Organizaing_Affiliate__c on the body.
     * @returns {Promise<Response>} Response is a JSON Object
     * @memberof WorkshopsController
     */
    @Post()
    public async create(@Request() req, @Response() res, @Next() next, @Body() body, @Session() session) : Promise<Response>{
        // Check required parameters
        if(!session.affiliate || !body.Name || !body.Organizing_Affiliate__c || !body.Start_Date__c || !body.End_Date__c){
            let fields = [];
            if(!body.Name) fields.push('Name');
            if(!body.Organizing_Affiliate__c) fields.push('Organizaing_Affiliate__c');
            if(!body.Start_Date__c) fields.push('Start_Date__c');
            if(!body.End_Date__c) fields.push('End_Date__c');
            if(!session.affiliate) return res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'SESSION_EXPIRED'});
            return res.status(HttpStatus.BAD_REQUEST).json({error: 'MISSING_FIELDS', fields});
        }

        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(body.Organizing_Affiliate__c)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`})
        }

        if(session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c){
            return res.status(HttpStatus.FORBIDDEN)
                    .json({error: `You are not allowed to post workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`});
        }

        const facilitators = body.facilitators;
        delete body.facilitators;

         // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Workshop__c',
            records: [ { contents: JSON.stringify(body) }]
        }

        client.create(data, (error, result) => {
            if(error){
                console.error('Error in WorkshopsController.create(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            const record = JSON.parse(result.contents)[0];

            for(let level of [0,1,2]) {
                authClient.createPermission({resource: `/workshops/${record.id}`, level }, (error, permission) => {
                    if(error) {
                        if(error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                        console.error('Error in WorkshopsController.create(): ', error);
                    } else {
                        console.log('WorkshopsController.create() created Permission: ', permission);
                    }

                });
            }
            
            WorkshopEmitter.emitter.emit('created', new WorkshopAddedEvent(record.id, body.Organizing_Affiliate__c, facilitators));

            req.session.user.permissions.push({resource: `/workshops/${record.id}`, level: 2});
            return res.status(HttpStatus.CREATED).json(record);
        });
    }

    /**
     * @desc <h5>PUT: /workshops/<em>:id</em></h5> -- Updates a workshop's fields. This function also will get the instructor associations with the given workshop to update associations and permissions. <b>Fires WorkshopUpdatedEvent</b>. Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Body} body - Required fields <code>[ "Id" ]</code>
     * @param {Session} session - Accesses the affiliate id from the session to compare to the Organizaing_Affiliate__c on the body.
     * @param {SalesforceId} id - Workshop__c id. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Object
     * @memberof WorkshopsController
     */
    @Put('/:id')
    public async update(@Request() req, @Response() res, @Next() next, @Param('id') id, @Body() body, @Session() session) : Promise<Response>{
        // Check the id
        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(id) || !pattern.test(body.Id) || id !== body.Id) {
            return res.status(HttpStatus.BAD_REQUEST)
                .json({error: 'Missing id parameter!'});
        }

        // Check required parameters
        if(!session.affiliate || !body.Organizing_Affiliate__c){
            return res.status(HttpStatus.BAD_REQUEST)
                .json({error: 'Missing Affiliate Id'});
        }

        if(!pattern.test(body.Organizing_Affiliate__c)) {
            return res.status(HttpStatus.BAD_REQUEST)
                .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`});
        }

        if(session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c){
            return res.status(HttpStatus.FORBIDDEN)
                .json({error: `You are not allowed to update workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`});
        }

        const newFacilitators = body.facilitators;
        delete body.facilitators;

        const query = {
            action: 'SELECT',
            fields: ['Id', 'Workshop__c', 'Instructor__c', 'Instructor__r.Email'],
            table: 'WorkshopFacilitatorAssociation__c',
            clauses: `Workshop__c='${id}'`
        }
        client.query(query, (error, response) => {
            if(error){
                console.error('Error in WorkshopsController.update(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            const oldFacilitators = JSON.parse(response.contents).records;

            console.log('oldFacilitators', oldFacilitators);

            // Use the shingo-sf-api to create the new record
            const data = {
                object: 'Workshop__c',
                records: [ { contents: JSON.stringify(body) }]
            }
            client.update(data, (error, response) => {
                if(error){
                    console.error('Error in WorkshopsController.update(): ', error)
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ 
                            error: JSON.parse(error.metadata.get('error-bin').toString())
                        });
                }


                const record = JSON.parse(response.contents)[0];
                WorkshopEmitter.emitter.emit('updated', new WorkshopUpdatedEvent(record.id, newFacilitators, oldFacilitators));
                res.status(HttpStatus.OK).json(record);
            });
        })

        
    }

    /**
     * @desc <h5>DELETE: /workshops/<em>:id</eM></h5> -- Deletes the workshop given by <em>:id</em>. <b>Fires WorkshopDeletedEvent</b>. Returns the following:<br><br>
     * <code>{<br>
     *      &emsp;"id": SalesforceId,<br>
     *      &emsp;"success": boolean,<br>
     *      &emsp;"errors": []<br>
     *  }</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {SalesforceId} id - Workshop__c id. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Object
     * @memberof WorkshopsController
     */
    @Delete('/:id')
    public async delete(@Request() req, @Response() res, @Next() next, @Param('id') id) : Promise<Response>{
        // Check the id
        const reg = /a[\w\d]{14,17}/;
        if(!reg.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing id parameter!'})
        }

        // Create the data parameter for the RPC call
        const data = {
            object: 'Workshop__c',
            ids: [id]
        }
        client.delete(data, (error, response) => {
            if(error){
                console.error('Error in WorkshopsController.delete(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            const record = JSON.parse(response.contents)[0];
            WorkshopEmitter.emitter.emit('deleted', new WorkshopDeletedEvent(record.id));
            req.session.user.permissions = req.session.user.permissions.filter(permission => { return !permission.resource.includes(record.id)});

            for(let role of req.session.user.roles){
                role.permissions = req.session.user.role.permissions.filter(permission => { return !permission.resource.includes(record.id)});
            }
            
            return res.status(HttpStatus.OK).json(record);
        })
    }

}