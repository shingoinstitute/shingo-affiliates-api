import { Controller, Get, Post, Put, Delete, HttpStatus, Request, Response, Next, Param, Query, Headers, Body, Session } from '@nestjs/common';
import { AffiliatesService, Affiliate, LoggerService } from '../../components';
import { BaseController } from '../base.controller';

import { checkRequired } from '../../validators/objKeyValidator';

/**
 * @desc Controller of the REST API logic for Affiliates
 * 
 * @export
 * @class AffiliatesController
 * @extends {BaseController}
 */
@Controller('affiliates')
export class AffiliatesController extends BaseController {

    constructor(private affService: AffiliatesService, logger: LoggerService) {
        super(logger);
    };

    /**
     * @desc <h5>GET: /affiliates</h5> Calls {@link AffiliatesService#getAll} to get a list of affiliates
     * 
     * @param {Query} isPublicQ - Query parameter <code>'isPublic'</code>; Expected values <code>[ 'true', 'false' ]</code>; Alias <code>headers['x-force-refesh']</code>; Returns public affiliates
     * @param {Header} isPublicH - Header <code>'x-is-public'</code>; Expected values <code>[ 'true', 'false' ]</code>; Alias <code>query['isPublic']</code>; Returns public affiliates
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Get()
    public async readAll( @Response() res, @Session() session, @Query('isPublic') isPublicQ, @Headers('x-is-public') isPublicH, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        const isPublic = (isPublicQ === 'true' || isPublicH === 'true');
        const forceRefresh = refresh === 'true';

        if (!isPublic && (!session.user || session.user.role.name !== 'Affiliate Manager')) return this.handleError(res, 'Error in AffiliatesController.readAll(): ', { error: 'NOT_AFFILIATE_MANAGER' }, HttpStatus.FORBIDDEN);

        try {
            const affiliates: Affiliate[] = await this.affService.getAll(isPublic, forceRefresh);
            return res.status(HttpStatus.OK).json(affiliates);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.readAll(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /affiliates/describe</h5> Calls {@link AffiliatesService#describe} to describe the Account Object
     * 
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Get('/describe')
    public async describe( @Response() res, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        try {
            const describeObject = await this.affService.describe(refresh === 'true');
            return res.status(HttpStatus.OK).json(describeObject);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.describe(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /affiliates/search</h5> Calls {@link AffiliatesService#search}. Returns an array of affiliates that match search criteria
     * 
     * @param {Header} search - Header <code>'x-search'</code>. SOSL search expression (i.e. '*Test*').
     * @param {Header} retrieve - Header <code>'x-retrieve'</code>. A comma seperated list of the Account fields to retrieve (i.e. 'Id, Name')
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Get('/search')
    public async search( @Response() res, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        // Check for required fields
        if (!search || !retrieve) return this.handleError(res, 'Error in AffiliatesController.search(): ', { error: 'MISSING_PARAMETERS', params: (!search && !retrieve ? ['search', 'retrieve '] : !search ? ['search'] : ['retrieve']) }, HttpStatus.BAD_REQUEST);

        try {
            const affiliates: Affiliate[] = await this.affService.search(search, retrieve, refresh === 'true');
            return res.status(HttpStatus.OK).json(affiliates);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.search(): ', error);
        }
    }

    /**
     * Search the related contacts of an Affiliate. Calls {@link AffiliatesService#searchCM} to retrieve a list of contacts
     * 
     * @param {SalesforceId} id - The Salesforce Id of the affiliate
     * @param {Header} search - Header <code>'x-search'</code>. SOSL search expression (i.e. 'User*').
     * @param {Header} retrieve - Header <code>'x-retrieve'</code>. A comma seperated list of the Contact fields to retrieve (i.e. 'Id, Name')
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Get('/:id/coursemanagers')
    public async searchCMS( @Response() res, @Param('id') id, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in AffiliatesController.searchCMS(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);
        if (!search || !retrieve) return this.handleError(res, 'Error in AffiliatesController.searchCMS(): ', { error: 'MISSING_PARAMETERS', params: (!search && !retrieve ? ['search', 'retrieve '] : !search ? ['search'] : ['retrieve']) }, HttpStatus.BAD_REQUEST);
        try {
            const cms = await this.affService.searchCM(id, search, retrieve, refresh === 'true');
            return res.status(HttpStatus.OK).json(cms);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.searchCMS(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /affiliates/<em>:id</em></h5> Calls {@link AffiliatesService#get} to retrieve a specific affiliate
     * 
     * @param {SalesforceId} id - Account id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Get(':id')
    public async read( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in AffiliatesController.read(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const affiliate = await this.affService.get(id);
            return res.status(HttpStatus.OK).json(affiliate);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.read(): ', error);
        }
    }

    /**
     * @desc <h5>POST: /affiliates</h5> Calls {@link AffiliatesService#create} to create a new Affiliate
     * 
     * @param {Body} body - Required fields <code>[ "Name" ]</code>
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Post()
    public async create( @Response() res, @Body() body): Promise<Response> {
        const required = checkRequired(body, ['Name']);
        if (!required.valid) return this.handleError(res, 'Error in AffiliatesController.create(): ', { error: 'MISSING_FIELDS', fields: required.missing }, HttpStatus.BAD_REQUEST);
        try {
            const sfSuccess = await this.affService.create(body);
            return res.status(HttpStatus.CREATED).json(sfSuccess);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.create(): ', error);
        }
    }

    /**
     * @desc <h5>POST: /affiliates/<em>:id</em>/map</h5> Calls {@link AffiliatesService#map} to create permissions for a Licensed Affiliate Account
     * 
     * @param {SalesforceId} id - Account id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Post(':id/map')
    public async map( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in AffiliatesController.map(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            await this.affService.map(id);
            return res.status(HttpStatus.OK).json({ mapped: true });
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.map(): ', error);
        }
    }

    /**
     * @desc <h5>PUT: /affiliates/<em>:id</em></h5> Calls {@link AffiliatesService#update} to update an Affiliate
     * 
     * @param {Body} body - Required fields <code>[ "Id" ]</code>
     * @param {SalesforceId} id - Account id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Put(':id')
    public async update( @Response() res, @Body() body, @Param('id') id): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/) || id !== body.Id) return this.handleError(res, 'Error in AffiliatesController.update(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);
        let required = checkRequired(body, ['Id']);
        if (!required.valid) return this.handleError(res, 'Error in AffiliatesController.update(): ', { error: "MISSING_FIELDS", fields: required.missing }, HttpStatus.BAD_REQUEST);

        try {
            const result = await this.affService.update(body);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.update(): ', error);
        }
    }

    /**
     * @desc <h5>DELETE: /affiliates/<em>:id</em></h5> Calls {@link AffiliatesService#delete} to "delete" an Affiliate
     * 
     * @param {SalesforceId} id - Account id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Delete(':id')
    public async delete( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in AffiliatesController.delete(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const result = await this.affService.delete(id);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.delete(): ', error);
        }
    }
}