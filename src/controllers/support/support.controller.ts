import {
    Controller,
    Get, Post, Put, Delete,
    HttpStatus, Request, Response, Next,
    Param, Query, Headers, Body, Session
} from '@nestjs/common';
import { LoggerService, SupportService } from '../../components';
import { BaseController } from '../base.controller';
import { checkRequired } from '../../validators/objKeyValidator';
import * as _ from 'lodash';
import * as generator from 'generate-password';

/**
 * @desc Controller of the REST API logic for Support Pages
 * 
 * @export
 * @class SupportController
 * @extends {BaseController}
 */
@Controller('support')
export class SupportController extends BaseController {

    constructor(private supportService: SupportService, private logger: LoggerService) {
        super(logger);
    };

    @Get()
    public async readAll( @Response() res, @Session() session, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        let role = 'Anonymous';
        if (session.user && session.user.role)
            role = session.user.role.name + "s";

        try {
            const pages = await this.supportService.getAll(role, refresh === 'true');
            return res.status(HttpStatus.OK).json(pages);
        } catch (error) {
            return this.handleError(res, 'Error in SupportController.readAll(): ', error);
        }
    }

    @Get('/category/:name')
    public async readCategory( @Response() res, @Session() session, @Param('name') catName, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        let role = 'Anonymous';
        if (session.user && session.user.role)
            role = session.user.role.name + "s";

        try {
            let pages = await this.supportService.getAll(role, refresh === 'true');
            pages = pages.filter(page => page.Category__c.toLowerCase() === catName.toLowerCase());
            return res.status(HttpStatus.OK).json(pages);
        } catch (error) {
            return this.handleError(res, 'Error in SupportController.readCategory(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /support/describe</h5> Calls {@link SupportService#describe} to describe Support_Page__c
     * 
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} Response body is a JSON object with the describe result
     * @memberof FacilitatorsController
     */
    @Get('/describe')
    public async describe( @Response() res, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        try {
            const describeObject = await this.supportService.describe(refresh === 'true');
            return res.status(HttpStatus.OK).json(describeObject);
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.describe(): ', error);
        }
    }

    @Get('/search')
    public async search( @Response() res, @Session() session, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {

        // Check for required fields
        if (!search || !retrieve) return this.handleError(res, 'Error in SupportController.search(): ', { error: 'MISSING_PARAMETERS', params: (!search && !retrieve ? ['search', 'retrieve '] : !search ? ['search'] : ['retrieve']) }, HttpStatus.BAD_REQUEST);

        if (!retrieve.includes("Restricted_To__c")) retrieve += ",Restricted_To__c";

        let role = 'Anonymous';
        if (session.user && session.user.role)
            role = session.user.role.name + "s";

        try {
            const pages = await this.supportService.search(search, retrieve, role, refresh === 'true');
            return res.status(HttpStatus.OK).json(pages);
        } catch (error) {
            return this.handleError(res, 'Error in SupportController.search(): ', error);
        }

    }

    @Get('/:id')
    public async read( @Response() res, @Session() session, @Param('id') id, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        let role = 'Anonymous';
        if (session.user && session.user.role)
            role = session.user.role.name + "s";

        try {
            const page = await this.supportService.get(id, refresh === 'true');
            if (!page.Restricted_To__c.includes(role)) return this.handleError(res, 'Error in SupportController.read(): ', { code: 'ACCESS_FORBIDDEN', message: 'You do not have permissions to read this support page!' }, HttpStatus.FORBIDDEN);
            return res.status(HttpStatus.OK).json(page);
        } catch (error) {
            return this.handleError(res, 'Error in SupportController.read(): ', error);
        }
    }

}