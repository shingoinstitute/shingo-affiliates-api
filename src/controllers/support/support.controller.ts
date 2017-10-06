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
            pages = pages.filter(page => page.Category__c === catName);
            return res.status(HttpStatus.OK).json(pages);
        } catch (error) {
            return this.handleError(res, 'Error in SupportController.readCategory(): ', error);
        }
    }

    @Get('/:id')
    public async read( @Response() res, @Session() session, @Param('id') id, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        let role = 'Anonymous';
        if (session.user && session.user.role)
            role = session.user.role.name + "s";

        try {
            const page = await this.supportService.get(id, role, refresh === 'true');
            return res.status(HttpStatus.OK).json(page);
        } catch (error) {
            return this.handleError(res, 'Error in SupportController.read(): ', error);
        }
    }

}