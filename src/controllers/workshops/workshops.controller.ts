import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import { WorkshopEmitter, WorkshopAddedEvent, WorkshopDeletedEvent, WorkshopUpdatedEvent } from '../../events';
import { SalesforceService, CacheService } from '../../components';
import * as NodeCache from 'node-cache';
import * as hash from 'object-hash';
import * as grpc from 'grpc';
import * as path from 'path';

import { checkRequired } from '../../validators/objKeyValidator';

/**
 * @desc Controller of the REST API logic for Workshops
 * 
 * @export
 * @class WorkshopsController
 */
@Controller('workshops')
export class WorkshopsController {

    constructor(private sfService : SalesforceService, private cache : CacheService) {
        this.client = sfService.getClient();
    };

    /**
     * @desc The RPC Client to interface with the Shingo SF Microservice
     * 
     * @private
     * @memberof WorkshopsController
     */
    private client;

    /**
     * @desc A helper function to return an error response to the client.
     * 
     * @private
     * @param {Response} res 
     * @param {string} message 
     * @param {*} error 
     * @param {HttpStatus} [errorCode=HttpStatus.INTERNAL_SERVER_ERROR] 
     * @returns Response body is a JSON object with the error.
     * @memberof WorkshopsController
     */
    private handleError(@Response() res, message : string, error : any, errorCode : HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR){
        if(error.metadata) error = this.sfService.parseRPCErrorMeta(error);

        console.error(message, error);
        return res.status(errorCode).json({ error });
    }

    /**
     * @desc <h5>GET: /workshops</h5> -- Read all workshops that the current session's user has permissions for. The function assembles a list of workshop ids form the users permissions to query Salesforce. The response of the query is then returned to the requesting client. The queried fields from Salesforce are as follows:<br><br>
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
        session.user.permissions.forEach(p => {
            if(p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
        });
        session.user.roles.forEach(role => {
            role.permissions.forEach(p => {
                if(p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
            });
        });

        // get array of unique ids
        ids = [...new Set(ids)];

        if(ids.length === 0) return res.status(HttpStatus.OK).json({records: [], totalSize: 0, done: true});

        const ids_for_query = ids.join();

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

        return this.client.query(query, (error, response) => {
            if(error) return this.handleError(res, 'Error in WorkshopsController.readAll(): ', error);

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
                &emsp;"Host_Site\__c",<br>
                &emsp;"Start_Date\__c",<br>
                &emsp;"End_Date\__c",<br>
                &emsp;"Event_City\__c",<br>
                &emsp;"Event_Country\__c",<br>
                &emsp;"Organizing_Affiliate\__r.Id",<br>
                &emsp;"Organizing_Affiliate\__r.Name",<br>
                &emsp;"Workshop_Type\__c",<br>
                &emsp;"Registration_Website\__c"<br>
     * ]</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Header} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.  Expected values are 'true' or 'false'.
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

        if(!this.cache.isCached(query) || refresh == 'true'){
            return this.client.query(query, (error, response) => {
                if(error) return this.handleError(res, 'Error in WorkshopsController.readPublic(): ', error);

                // Send records to caller
                let records = JSON.parse(response.contents);
                // Cache records
                this.cache.cache(query, records);
                
                return res.status(HttpStatus.OK).json(records);
            });
        } else {
            return res.status(HttpStatus.OK)
                .json(this.cache.getCache(query));
        }
    }

    /**
     * @desc <h5>GET: /workshops/describe</h5> -- Uses the Salesforce REST API to describe the Workshop\__c object. See the Salesforce documentation for more about 'describe'.
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Header} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.  Expected values are 'true' or 'false'.
     * @returns {Promise<Response>} Response body is a JSON object with the describe result
     * @memberof WorkshopsController
     */
    @Get('/describe')
    public async describe(@Request() req, @Response() res, @Next() next, @Headers('x-force-refresh') refresh = 'false') : Promise<Response>{
        // Set the key for the cache
        const key = 'describeWorkshops'

        // If no cached result, use the shingo-sf-api to get the result
        if(!this.cache.isCached(key) || refresh ===  'true'){
            return this.client.describe({object: 'Workshop__c'}, (error, results) => {
                if(error) return this.handleError(res, 'Error in WorkshopsController.describe(): ', error);

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
     * @desc <h5>GET: /workshops/search</h5> -- Executes a SOSL query to search for text on workshop records in Salesforce. Example response body:<br><br>
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
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Discover Test*').
     * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Workshop\__c fields to retrieve (i.e. 'Id, Name, Start_Date\__c')
     * @param {Header} [refresh='false'] - Header 'x-force-refresh'. Used to force the refresh of the cache.  Expected values are 'true' or 'false'.
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

        // If no cached result, use the shingo-sf-api to get result
        if(!this.cache.isCached(data) || refresh === 'true'){
            return this.client.search(data, (error, results) => {
                if(error) return this.handleError(res, 'Error in WorkshopsController.search(): ', error);

                // Send records to caller
                let records = JSON.parse(results.contents).searchRecords;

                // Cache records
                this.cache.cache(data, records);

                return res.status(HttpStatus.OK).json(records);
            });
        }
        // else return the cached result
        else {
            return res.status(HttpStatus.OK).json(this.cache.getCache(data));
        }
    }

    /**
     * @desc <h5>GET: /workshops/<em>:id</em></h5> -- Reads the workshop with id passed at the parameter :id. The following fields are returned:<br><br>
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
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {SalesforceId} id - Workshop\__c id. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response body is a JSON object of type {<em>returned fields</em>}
     * @memberof WorkshopsController
     */
    @Get('/:id')
    public async read(@Request() req, @Response() res, @Next() next, @Param('id') id) : Promise<Response>{
        // Check the id
        const pattern = /a[\w\d]{14,17}/;
        if(!pattern.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.`});
        }

        // Create the data parameter for the RPC call
        const data = {
            object: 'Workshop__c',
            ids: [id]
        }

        return this.client.retrieve(data, (error, results) => {
            if(error) return this.handleError(res, 'Error in WorkshopsController.read(): ', error);

            // Send records to caller
            let record = JSON.parse(results.contents)[0];
            return res.status(HttpStatus.OK).json(record);
        });
    }

    /**
     * @desc <h5>GET: /workshops/<em>:id</em>/facilitators</h5> -- Get the associated instructors for the workshop with id given in the param <em>:id</em>. Queried fields are as follows:<br><br>
     * <code>[<br>
     *  &emsp;"Instructor\__r.FirstName",<br>
     *  &emsp;"Instructor\__r.LastName",<br>
     *  &emsp;"Instructor\__r.Email",<br>
     *  &emsp;"Instructor\__r.Title"<br>
     * ]</code>
     * 
     * @param {Request} req - Express request.
     * @param {Response} res - Express response.
     * @param {Next} next - Express next function.
     * @param {SalesforceId} id - Workshop\__cid. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Array of objects of type <code>{<em>queried fields</em>}</code>
     * @memberof WorkshopsController
     */
    @Get('/:id/facilitators')
    public async facilitators(@Request() req, @Response() res, @Next() next, @Param('id') id) : Promise<Response>{
        // Check the id
        const pattern = /a[\w\d]{14,17}/;
        if(!pattern.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.`});
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

        return this.client.query(query, (error, response) => {
            if(error) return this.handleError(res, 'Error in WorkshopsController.facilitators(): ', error);

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
     * @param {Body} body - Required fields <code>[ "Name", "Organizing_Affiliate\__c, "Start_Date\__c, "End_Date\__c ]</code>
     * @param {Session} session - Accesses the affiliate id from the session to compare to the Organizaing_Affiliate\__c on the body.
     * @returns {Promise<Response>} Response is a JSON Object
     * @memberof WorkshopsController
     */
    @Post()
    public async create(@Request() req, @Response() res, @Next() next, @Body() body, @Session() session) : Promise<Response>{
        // Check required parameters
        let valid = checkRequired(body, [ 'Name', 'Organizing_Affiliate__c', 'Start_Date__c', 'End_Date__c' ]);
        if(!session.affiliate || !valid.valid){
            if(!session.affiliate) return res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'SESSION_EXPIRED'});
            return res.status(HttpStatus.BAD_REQUEST).json({error: 'MISSING_FIELD', fields: valid.missing});
        }

        // Check for valid SF ID on Organizing_Affiliate\__c
        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(body.Organizing_Affiliate__c)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'INVALID_SF_ID', message: `${body.Organizing_Affiliate__c} is not a valid Salesforce ID.`});
        }

        // Check can create for Organizing_Affiliate\__c
        if(session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c){
            return res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'PERM_DENIDED', message: `You are not allowed to post workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`});
        }

        const facilitators = body.facilitators;
        delete body.facilitators;

         // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Workshop__c',
            records: [ { contents: JSON.stringify(body) }]
        }

        return this.client.create(data, (error, result) => {
            if(error) return this.handleError(res, 'Error in WorkshopsController.create(): ', error);

            const record = JSON.parse(result.contents)[0];
            
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
     * @param {Session} session - Accesses the affiliate id from the session to compare to the Organizaing_Affiliate\__c on the body.
     * @param {SalesforceId} id - Workshop\__c id. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Object
     * @memberof WorkshopsController
     */
    @Put('/:id')
    public async update(@Request() req, @Response() res, @Next() next, @Param('id') id, @Body() body, @Session() session) : Promise<Response>{
        // Check required parameters
        let required = checkRequired(body, [ 'Id', 'Organizing_Affiliate__c' ]);
        if(!session.affiliate || !required.valid){
            if(!session.affiliate) return res.status(HttpStatus.FORBIDDEN).json({error: 'SESSION_EXPIRED'});
            return res.status(HttpStatus.BAD_REQUEST).json({error: 'MISSING_FIELD', fields: required.missing});
        }

        // Check the id
        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(id) || !pattern.test(body.Id) || id !== body.Id || !pattern.test(body.Organizing_Affiliate__c)) {
            return res.status(HttpStatus.BAD_REQUEST)
                .json({error: 'INVALID_SF_ID', message: `${body.Organizing_Affiliate__c} or ${id} or ${body.Id} is not a valid Salesforce ID.`});
        }

        // Check can update for Organizing_Affiliate\__c
        if(session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c){
            return res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'PERM_DENIDED', message: `You are not allowed to update workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`});
        }

        // Get posted facilitators
        const newFacilitators = body.facilitators;
        delete body.facilitators;

        const query = {
            action: 'SELECT',
            fields: ['Id', 'Workshop__c', 'Instructor__c', 'Instructor__r.Email'],
            table: 'WorkshopFacilitatorAssociation__c',
            clauses: `Workshop__c='${id}'`
        }
        return this.client.query(query, (error, response) => {
            if(error) return this.handleError(res, 'Error in WorkshopsController.update(): ', error);

            const oldFacilitators = JSON.parse(response.contents).records;

            // Use the shingo-sf-api to create the new record
            const data = {
                object: 'Workshop__c',
                records: [ { contents: JSON.stringify(body) }]
            }
            return this.client.update(data, (error, response) => {
                if(error) return this.handleError(res, 'Error in WorkshopsController.update(): ', error);

                const record = JSON.parse(response.contents)[0];
                if(newFacilitators !== undefined) WorkshopEmitter.emitter.emit('updated', new WorkshopUpdatedEvent(record.id, newFacilitators, oldFacilitators));
                return res.status(HttpStatus.OK).json(record);
            });
        });        
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
     * @param {SalesforceId} id - Workshop\__c id. Matches <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Object
     * @memberof WorkshopsController
     */
    @Delete('/:id')
    public async delete(@Request() req, @Response() res, @Next() next, @Param('id') id) : Promise<Response>{
        // Check the id
        const pattern = /a[\w\d]{14,17}/;
        if(!pattern.test(id))
            return res.status(HttpStatus.BAD_REQUEST).json({error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.`});

        // Create the data parameter for the RPC call
        const data = {
            object: 'Workshop__c',
            ids: [id]
        }
        return this.client.delete(data, (error, response) => {
            if(error) return this.handleError(res, 'Error in WorkshopsController.delete(): ', error);

            const record = JSON.parse(response.contents)[0];
            WorkshopEmitter.emitter.emit('deleted', new WorkshopDeletedEvent(record.id));
            req.session.user.permissions = req.session.user.permissions.filter(permission => { return !permission.resource.includes(record.id)});

            for(let role of req.session.user.roles){
                role.permissions = role.permissions.filter(permission => { return !permission.resource.includes(record.id)});
            }
            
            return res.status(HttpStatus.OK).json(record);
        });
    }

}