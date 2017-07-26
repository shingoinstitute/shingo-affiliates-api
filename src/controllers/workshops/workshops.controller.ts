import {
    Controller,
    Get, Post, Put, Delete,
    HttpStatus, Request, Response, Next,
    Param, Query, Headers, Body, Session
} from '@nestjs/common';
import { WorkshopsService, Workshop } from '../../components';
import { BaseController } from '../base.controller';

import { checkRequired } from '../../validators/objKeyValidator';

/**
 * @desc Controller of the REST API logic for Workshops
 * 
 * @export
 * @class WorkshopsController
 * @extends {BaseController}
 */
@Controller('workshops')
export class WorkshopsController extends BaseController {

    constructor(private workshopsService: WorkshopsService) { super(); };

    /**
     * @desc <h5>GET: /workshops</h5> Calls {@link WorkshopsService#getAll} to get an array of Workshops
     * 
     * @param {Session} session - Session contains the current user. The function uses the permissions on this object to query Salesforce for the workshops.
     * @param {any} isPublicQ - Query parameter <code>'isPublic'</code>; Expected values <code>[ 'true', 'false' ]</code>; Alias <code>headers['x-force-refesh']</code>; Returns public workshops
     * @param {any} isPublicH - Header <code>'x-is-public'</code>; Expected values <code>[ 'true', 'false' ]</code>; Alias <code>query['isPublic']</code>; Returns public workshops
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} Response body contains a JSON array of Workshops
     * @memberof WorkshopsController
     */
    @Get()
    public async readAll( @Response() res, @Session() session, @Query('isPublic') isPublicQ, @Headers('x-is-public') isPublicH, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        const isPublic = (isPublicQ === 'true' || isPublicH === 'true');
        const forceRefresh = refresh === 'true';
        if (!session.user && !isPublic) return this.handleError(res, 'Error in WorkshopsController.readAll()', { error: "SESSION_EXPIRED" }, HttpStatus.FORBIDDEN);

        try {
            const workshops: Workshop[] = await this.workshopsService.getAll(isPublic, forceRefresh, session.user);
            return res.status(HttpStatus.OK).json(workshops);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.readAll(): ', error);
        }

    }

    /**
     * @desc <h5>GET: /workshops/describe</h5> Calls {@link WorkshopsService#describe} to describe Workshop\__c
     * 
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} Response body is a JSON object with the describe result
     * @memberof WorkshopsController
     */
    @Get('/describe')
    public async describe( @Response() res, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {

        try {
            const describeObject = await this.workshopsService.describe(refresh === 'true');
            return res.status(HttpStatus.OK).json(describeObject);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.describe(): ', error);
        }

    }

    /**
     * @desc <h5>GET: /workshops/search</h5> Calls {@link WorkshopsService#search}. Returns an array of workshops that match search criteria
     * 
     * 
     * @param {Header} search - Header <code>'x-search'</code>. SOSL search expression (i.e. '*Discover Test*').
     * @param {Header} retrieve - Header <code>'x-retrieve'</code>. A comma seperated list of the Workshop\__c fields to retrieve (i.e. 'Id, Name, Start_Date\__c')
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} Response body is a JSON Array of workshops
     * @memberof WorkshopsController
     */
    @Get('/search')
    public async search( @Response() res, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {

        // Check for required fields
        if (!search || !retrieve) return this.handleError(res, 'Error in WorkshopsController.search(): ', { error: 'MISSING_PARAMETERS', params: (!search && !retrieve ? ['search', 'retrieve '] : !search ? ['search'] : ['retrieve']) }, HttpStatus.BAD_REQUEST);

        try {
            const workshops: Workshop[] = await this.workshopsService.search(search, retrieve, refresh === 'true');
            return res.status(HttpStatus.OK).json(workshops);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.search(): ', error);
        }

    }

    /**
     * @desc <h5>GET: /workshops/<em>:id</em></h5> Calls {@link WorkshopsService#get} to retrieve a specific workshop
     * 
     * @param {SalesforceId} id - Workshop\__c id. match <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response body is a JSON object of type {<em>returned fields</em>}
     * @memberof WorkshopsController
     */
    @Get('/:id')
    public async read( @Response() res, @Param('id') id): Promise<Response> {
        // Check the id
        if (!id.match(/a[\w\d]{14,17}/)) return this.handleError(res, 'Error in WorkshopsController.read(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const workshop: Workshop = await this.workshopsService.get(id);
            return res.status(HttpStatus.OK).json(workshop);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.read(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /workshops/<em>:id</em>/facilitators</h5> Calls {@link WorkshopsService#facilitators} to get all associated facilitators for a workshop
     * 
     * @param {SalesforceId} id - Workshop\__cid. match <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Array of Contact objects
     * @memberof WorkshopsController
     */
    @Get('/:id/facilitators')
    public async facilitators( @Response() res, @Param('id') id): Promise<Response> {

        // Check the id
        if (!id.match(/a[\w\d]{14,17}/)) this.handleError(res, 'Error in WorkshopsController.facilitators(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const facilitators = await this.workshopsService.facilitators(id);
            return res.status(HttpStatus.OK).json(facilitators);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.facilitators(): ', error);
        }

    }

    /**
     * @desc <h5>POST: /workshops</h5> Calls {@link WorkshopsService#create} to create a new workshop in Salesforce and permissions for the workshop in the Shingo Auth API
     * 
     * @param {Body} body - Required fields <code>[ "Name", "Organizing_Affiliate\__c", "Start_Date\__c", "End_Date\__c", "Host_Site\__c", "Event_Country\__c", "Event_City\__c", "facilitators" ]</code>
     * @param {Session} session - Accesses the affiliate id from the session to compare to the Organizaing_Affiliate\__c on the body
     * @returns {Promise<Response>} Response is a JSON Object from the resulting Salesforce operation
     * @memberof WorkshopsController
     */
    @Post()
    public async create( @Response() res, @Body() body, @Session() session): Promise<Response> {
        // Check required parameters
        let valid = checkRequired(body, ['Name', 'Organizing_Affiliate__c', 'Start_Date__c', 'End_Date__c', 'Host_Site__c', 'Event_Country__c', 'Event_City__c', 'facilitators']);
        if (!session.affiliate || !valid.valid) {
            if (!session.affiliate) return this.handleError(res, 'Error in WorkshopsController.create(): ', { error: 'SESSION_EXPIRED' }, HttpStatus.FORBIDDEN);
            return this.handleError(res, 'Error in WorkshopsController.create(): ', { error: 'MISSING_FIELD', fields: valid.missing }, HttpStatus.BAD_REQUEST);
        }

        // Check for valid SF ID on Organizing_Affiliate\__c
        if (!body.Organizing_Affiliate__c.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in WorkshopsController.create(): ', { error: 'INVALID_SF_ID', message: `${body.Organizing_Affiliate__c} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        // Check can create for Organizing_Affiliate\__c
        if (session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c)
            return this.handleError(res, 'Error in WorkshopsController.create(): ', { error: 'PERM_DENIDED', message: `You are not allowed to post workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}` }, HttpStatus.FORBIDDEN);

        try {
            const sfSuccess = await this.workshopsService.create(body);
            return res.status(HttpStatus.CREATED).json(sfSuccess);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.create(): ', error);
        }
    }

    /**
     * @desc <h5>PUT: /workshops/<em>:id</em></h5> Calls {@link WorkshopsService#update} to update a workshop's fields. This function also updates facilitator associations and permissions
     * 
     * @param {Body} body - Required fields <code>[ "Id", "Organizing_Affiliate\__c" ]</code>
     * @param {Session} session - Accesses the affiliate id from the session to compare to the Organizaing_Affiliate\__c on the body
     * @param {SalesforceId} id - Workshop\__c id. match <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Object from the resulting Salesforce operation
     * @memberof WorkshopsController
     */
    @Put('/:id')
    public async update( @Response() res, @Param('id') id, @Body() body, @Session() session): Promise<Response> {
        // Check required parameters
        let required = checkRequired(body, ['Id', 'Organizing_Affiliate__c']);
        if (!session.affiliate || !required.valid) {
            if (!session.affiliate) return this.handleError(res, 'Error in WorkshopsController.update(): ', { error: 'SESSION_EXPIRED' }, HttpStatus.FORBIDDEN);
            return this.handleError(res, 'Error in WorkshopsController.update(): ', { error: 'MISSING_FIELD', fields: required.missing }, HttpStatus.BAD_REQUEST);
        }

        // Check the id
        const pattern = /[\w\d]{15,17}/;
        if (!pattern.test(id) || !pattern.test(body.Id) || id !== body.Id || !pattern.test(body.Organizing_Affiliate__c)) {
            return this.handleError(res, 'Error in WorkshopsController.update(): ', { error: 'INVALID_SF_ID', message: `${body.Organizing_Affiliate__c} or ${id} or ${body.Id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);
        }

        // Check can update for Organizing_Affiliate\__c
        if (session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c) {
            return this.handleError(res, 'Error in WorkshopsController.update(): ', { error: 'PERM_DENIDED', message: `You are not allowed to update workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}` }, HttpStatus.FORBIDDEN);
        }

        try {
            const result = await this.workshopsService.update(body);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.update(): ', error);
        }
    }

    /**
     * @desc <h5>DELETE: /workshops/<em>:id</eM></h5> Calls {@link WorkshopsService#delete} to delete the workshop given by <em>:id</em>
     * 
     * @param {SalesforceId} id - Workshop\__c id. match <code>/a[\w\d]{14,17}/</code>
     * @returns {Promise<Response>} Response is a JSON Object from the resulting Salesforce operation
     * @memberof WorkshopsController
     */
    @Delete('/:id')
    public async delete( @Response() res, @Param('id') id): Promise<Response> {
        // Check the id
        const pattern = /a[\w\d]{14,17}/;
        if (!pattern.test(id)) return this.handleError(res, 'Error in WorkshopsController.delete(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const result = await this.workshopsService.delete(id);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in WorkshopsController.delete(): ', error);
        }
    }

}