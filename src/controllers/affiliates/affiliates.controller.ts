import { Controller, Get, Post, Put, Delete, HttpStatus, Request, Response, Next, Param, Query, Headers, Body, Session } from '@nestjs/common';
import { AffiliatesService, Affiliate } from '../../components';

import { checkRequired } from '../../validators/objKeyValidator';

@Controller('affiliates')
export class AffiliatesController {

    constructor(private affService: AffiliatesService) { };

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
    private handleError( @Response() res, message: string, error: any, errorCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
        if (error.metadata) error = this.affService.parseRPCErrorMeta(error);

        console.error(message, error);
        return res.status(errorCode).json({ error });
    }

    /**
     * @desc <h5>GET: /affiliates</h5> Calls {@link AffiliatesService#getAll} to get a list of affiliates
     * 
     * @param {Response} res - Express response
     * @param {Query} isPublicQ - Query parameter <code>'isPublic'</code>; Expected values <code>[ 'true', 'false' ]</code>; Alias <code>headers['x-force-refesh']</code>; Returns public affiliates
     * @param {Header} isPublicH - Header <code>'x-is-public'</code>; Expected values <code>[ 'true', 'false' ]</code>; Alias <code>query['isPublic']</code>; Returns public affiliates
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} 
     * @memberof AffiliatesController
     */
    @Get()
    public async readAll( @Response() res, @Query('isPublic') isPublicQ, @Headers('x-is-public') isPublicH, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        const isPublic = (isPublicQ === 'true' || isPublicH === 'true');
        const forceRefresh = refresh === 'true';

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
     * @param {Response} res - Express response
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
     * @param {Response} res - Express response
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

    @Get(':id')
    public async read( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.matches(/a[\w\d]{14,17}/)) return this.handleError(res, 'Error in AffiliatesController.read(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const affiliate = await this.affService.get(id);
            return res.status(HttpStatus.OK).json(affiliate);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.read(): ', error);
        }
    }

    @Post()
    public async create( @Response() res, @Body() body): Promise<Response> {
        const required = checkRequired(body, ['Name']);
        if (!required.valid) this.handleError(res, 'Error in AffiliatesController.create(): ', { error: 'MISSING_FIELDS', fields: required.missing }, HttpStatus.BAD_REQUEST);
        try {
            const sfSuccess = await this.affService.create(body);
            return res.status(HttpStatus.CREATED).json(sfSuccess);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.create(): ', error);
        }
    }

    @Post(':id/map')
    public async map( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.matches(/a[\w\d]{14,17}/)) return this.handleError(res, 'Error in AffiliatesController.read(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            await this.affService.map(id);
            return res.status(HttpStatus.OK).json({ mapped: true });
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.map(): ', error);
        }
    }

    @Put(':id')
    public async update( @Response() res, @Body() body, @Param('id') id): Promise<Response> {
        if (!id.matches(/a[\w\d]{14,17}/)) return this.handleError(res, 'Error in AffiliatesController.update(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const result = await this.affService.update(body);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.update(): ', error);
        }
    }

    @Delete(':id')
    public async delete( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.matches(/a[\w\d]{14,17}/)) return this.handleError(res, 'Error in AffiliatesController.delete(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const result = await this.affService.delete(id);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in AffiliatesController.delete(): ', error);
        }
    }
}