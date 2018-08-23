import {
    Controller,
    Get, Post, Put, Delete,
    HttpStatus, Request, Response, Next,
    Param, Query, Headers, Body, Session, Inject
} from '@nestjs/common';
import { BaseController } from '../base.controller';

import _ from 'lodash';
import { parseError } from '../../util';
import { SalesforceClient } from '@shingo/shingo-sf-api';
import { AuthClient, User } from '@shingo/shingo-auth-api';
import { LoggerInstance } from 'winston';

/**
 * @desc Provides the controller of the Auth REST logic
 *
 * @export
 * @class AuthController
 * @extends {BaseController}
 */
@Controller('auth')
export class AuthController extends BaseController {

    constructor(private sfService: SalesforceClient,
                private authService: AuthClient,
                @Inject('LoggerService') logger: LoggerInstance) {
        super(logger);
    };

    /**
     * @desc <h5>POST: /auth/login</h5>
     *
     * @param {any} body - Required fields: <code>[ 'email', 'password' ]</code>
     * @returns {Promise<Response>} Response body is an object with the user's JWT
     * @memberof AuthController
     */
    @Post('login')
    public async login( @Request() req, @Response() res, @Body() body): Promise<Response> {
        if (!body.email || !body.password) return this.handleError(res, 'Error in AuthController.login(): ', { error: "MISSING_FIELDS" }, HttpStatus.BAD_REQUEST);

        let user: User | undefined;

        try {
            user = await this.authService.login(body);
        } catch (e) {
            this.log.debug(e)
            const parsed = parseError(e);
            return this.handleError(res, 'Error in AuthController.login(): ', e,
            parsed.error && (parsed.error === 'INVALID_PASSWORD' || parsed.error === 'EMAIL_NOT_FOUND')
                ? HttpStatus.FORBIDDEN
                : HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (user === undefined) {
            return this.handleError(res, 'Error in AuthController.login(): ', { error: 'INVALID_LOGIN' }, HttpStatus.FORBIDDEN);
        }

        if (!user.services.includes('affiliate-portal')) {
            return this.handleError(res, 'Error in AuthController.login(): ', { error: 'NOT_REGISTERED' }, HttpStatus.NOT_FOUND);
        }

        try {
            req.session.user = await this.getSessionUser(user);
            req.session.affiliate = req.session.user['AccountId'];

            return res.status(HttpStatus.OK).json(_.omit(req.session.user, ['permissions', 'extId', 'services', 'role.permissions']));
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.login(): ', error);
        }
    }

    private async getSessionUser(user): Promise<any> {
        const contact = (await this.sfService.retrieve({ object: 'Contact', ids: [user.extId] }))[0];
        let sessionUser = _.omit(user, ['password', 'roles']);
        sessionUser = _.merge(contact, _.omit(sessionUser, ['email']));
        sessionUser.role = user.roles.map(role => { if (role.service === 'affiliate-portal') return _.omit(role, ['users', 'service']) })[0];

        return sessionUser;
    }


    /**
     * <h5>GET: /auth/valid</h5> Protected by isValid middleware. Returns the user's JWT
     *
     * @returns {Promise<Response>}
     * @memberof AuthController
     */
    @Get('valid')
    public async valid( @Request() req, @Response() res): Promise<Response> {
        return res.status(HttpStatus.OK).json(_.omit(req.session.user, ['permissions', 'extId', 'services', 'role.permissions']));
    }

    /**
     * @desc <h5>GET: /auth/logout</h5> Sets the user's JWT to '' and removes the user from the session
     *
     * @returns {Promise<Response>}
     * @memberof AuthController
     */
    @Get('logout')
    public async logout( @Request() req, @Response() res): Promise<Response> {
        if (!req.session.user) return this.handleError(res, 'Error in AuthController.logout(): ', { error: 'NO_LOGIN_FOUND' }, HttpStatus.NOT_FOUND)
        try {
            req.session.user.jwt = `${Math.random()}`;
            req.session.user.email = req.session.user.Email;
            await this.authService.updateUser(_.pick(req.session.user, ['id', 'jwt']));
            req.session.user = null;
            return res.status(HttpStatus.OK).json({ message: "LOGOUT_SUCCESS" });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.logout(): ', error);
        }
    }

    @Post('/changepassword')
    public async changePassword( @Request() req, @Response() res, @Body() body): Promise<Response> {
        if (!body.password) return this.handleError(res, 'Error in AuthController.changePassword(): ', { error: 'MISSING_FIELDS', fields: ['password'] }, HttpStatus.BAD_REQUEST);

        try {
            req.session.user.password = body.password;

            const updated = await this.authService.updateUser(_.pick(req.session.user, ['id', 'password']));

            req.session.user = await this.authService.getUser(`user.id=${req.session.user.id}`);
            req.session.user = await this.getSessionUser(req.session.user);

            return res.status(HttpStatus.OK).json({ jwt: req.session.user.jwt });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.changePassword', error);
        }
    }

    @Post('/loginas')
    public async loginAs(@Request() req, @Response() res, @Body() body): Promise<Response> {
        if(!body.adminId || !body.userId) return this.handleError(res, 'Error in AuthController.loginAs(): ', { error: 'MISSING_FIELDS', fields: ['adminId', 'userId']}, HttpStatus.BAD_REQUEST);
        if(req.session.user.id != body.adminId) return this.handleError(res, 'Error in AuthController.loginAs(): ', {error: 'UNAUTHORIZED'}, HttpStatus.FORBIDDEN);

        try {
            const user = await this.authService.loginAs({adminId: body.adminId, userId: body.userId});
            req.session.user = await this.getSessionUser(user);
            req.session.user.adminToken = req.headers['x-jwt'];
            req.session.affiliate = req.session.user['AccountId'];

            this.log.debug(`Admin ${body.adminId} logged in as ${body.userId}`);

            return res.status(HttpStatus.OK).json(_.omit(req.session.user, ['permissions', 'extId', 'services', 'role.permissions', 'password']));
        } catch(error) {
            return this.handleError(res, 'Error in AuthController.loginAs', error);
        }
    }
}
