import {
    Controller,
    Get, Post, Put, Delete,
    HttpStatus, Request, Response, Next,
    Param, Query, Headers, Body, Session
} from '@nestjs/common';
import {
    SalesforceService, AuthService,
    SFQueryObject
} from '../../components';
import { BaseController } from '../base.controller';

import * as _ from 'lodash';

/**
 * @desc Provides the controller of the Auth REST logic
 * 
 * @export
 * @class AuthController
 * @extends {BaseController}
 */
@Controller('auth')
export class AuthController extends BaseController {

    constructor(private sfService: SalesforceService, private authService: AuthService) { super(); };

    /**
     * @desc <h5>POST: /auth/login</h5> Calls {@link AuthService#login} and {@link SalesforceService#query} to login a user
     * 
     * @param {any} body - Required fields: <code>[ 'email', 'password' ]</code>
     * @returns {Promise<Response>} Response body is an object with the user's JWT
     * @memberof AuthController
     */
    @Post('login')
    public async login( @Request() req, @Response() res, @Body() body): Promise<Response> {
        if (!body.email || !body.password) return this.handleError(res, 'Error in AuthController.login(): ', { error: "MISSING_FIELDS" }, HttpStatus.BAD_REQUEST);

        try {
            const user = await this.authService.login({ email: body.email, password: body.password });

            if (user === undefined) return this.handleError(res, 'Error in AuthController.login(): ', { error: 'INVALID_LOGIN' }, HttpStatus.FORBIDDEN);
            if (!user.services.includes('affiliate-portal')) return this.handleError(res, 'Error in AuthController.login(): ', { error: 'NOT_REGISTERED' }, HttpStatus.NOT_FOUND);

            const query = {
                action: 'SELECT',
                fields: [
                    'Id',
                    'Name',
                    'FirstName',
                    'LastName',
                    'AccountId',
                    'Email'
                ],
                table: 'Contact',
                clauses: `Email='${body.email}' AND RecordType.Name='Affiliate Instructor'`
            }
            const contact = (await this.sfService.query(query as SFQueryObject)).records[0];
            req.session.user = _.omit(user, ['password']);
            req.session.user.contact = contact;
            req.session.affiliate = contact['AccountId'];

            return res.status(HttpStatus.OK).json({ jwt: user.jwt });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.login(): ', error);
        }
    }


    /**
     * <h5>GET: /auth/valid</h5> Protected by isValid middleware. Only get called if the value of x-jwt corresponds to a valid user
     * 
     * @returns {Promise<Response>} 
     * @memberof AuthController
     */
    @Get('valid')
    public async( @Response() res): Promise<Response> {
        return res.status(HttpStatus.OK).json();
    }

    /**
     * @desc <h5>GET: /auth/logout</h5> Calls {@link AuthService#updateUser} to set the user's JWT to '' and removes the user from the session
     * 
     * @returns {Promise<Response>} 
     * @memberof AuthController
     */
    @Get('logout')
    public async logout( @Request() req, @Response() res): Promise<Response> {
        if (!req.session.user) return this.handleError(res, 'Error in AuthController.logout(): ', { error: 'NO_LOGIN_FOUND' })
        try {
            req.session.user.jwt = '';
            await this.authService.updateUser(_.omit(req.session.user, ['contact']));
            req.session.user = null;
            return res.status(HttpStatus.OK).json({ message: "LOGOUT_SUCCESS" });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.logout(): ', error);
        }
    }

}