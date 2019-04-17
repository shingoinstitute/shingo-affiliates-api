import {
    Controller,
    Get, Post, HttpStatus, Request, Response, Body } from '@nestjs/common';
import { AuthService } from '../../components';
import { BaseController } from '../base.controller';
import _ from 'lodash';
import SalesforceService from '../../components/salesforce/new-salesforce.component';
import { Contact } from '../../sf-interfaces';
// tslint:disable-next-line:no-implicit-dependencies
import { Response as Res, Request as Req } from 'express'

/**
 * @desc Provides the controller of the Auth REST logic
 * 
 * @export
 * @class AuthController
 * @extends {BaseController}
 */
@Controller('auth')
export class AuthController extends BaseController {

    constructor(private sfService: SalesforceService, private authService: AuthService) {
        super();
    };

    /**
     * @desc <h5>POST: /auth/login</h5> Calls {@link AuthService#login} and {@link SalesforceService#query} to login a user
     * 
     * @param {any} body - Required fields: <code>[ 'email', 'password' ]</code>
     * @returns {Promise<Response>} Response body is an object with the user's JWT
     * @memberof AuthController
     */
    @Post('login')
    public async login( @Request() req: Req, @Response() res: Res, @Body() body: any) {
        if (!body.email || !body.password) return this.handleError(res, 'Error in AuthController.login(): ', { error: "MISSING_FIELDS" }, HttpStatus.BAD_REQUEST);

        let user;

        try {
            user = await this.authService.login(body);
        } catch (e) {
            return this.handleError(res, 'Error in AuthController.login(): ', e, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (user === undefined) {
            return this.handleError(res, 'Error in AuthController.login(): ', { error: 'INVALID_LOGIN' }, HttpStatus.FORBIDDEN);
        }
    
        if (!user.services.includes('affiliate-portal')) {
            return this.handleError(res, 'Error in AuthController.login(): ', { error: 'NOT_REGISTERED' }, HttpStatus.NOT_FOUND);
        }

        try {
            (req as any).session.user = await this.getSessionUser(user);
            (req as any).session.affiliate = (req as any).session.user['AccountId'];
            
            return res.status(HttpStatus.OK).json(_.omit((req as any).session.user, ['permissions', 'extId', 'services', 'role.permissions']));
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.login(): ', error);
        }
    }

    private async getSessionUser(user: any) {
        const [contact] = await this.sfService.retrieve<Contact>({ object: 'Contact', ids: [user.extId] })
        let sessionUser = _.omit(user, ['password', 'roles']);
        sessionUser = _.merge(contact, _.omit(sessionUser, ['email']));
        sessionUser.role = user.roles.map((role: { service: string; }) => { if (role.service === 'affiliate-portal') return _.omit(role, ['users', 'service']) })[0];

        return sessionUser;
    }


    /**
     * <h5>GET: /auth/valid</h5> Protected by isValid middleware. Returns the user's JWT
     * 
     * @returns {Promise<Response>} 
     * @memberof AuthController
     */
    @Get('valid')
    public async valid( @Request() req: Req, @Response() res: Res) {
        return res.status(HttpStatus.OK).json(_.omit((req as any).session.user, ['permissions', 'extId', 'services', 'role.permissions']));
    }

    /**
     * @desc <h5>GET: /auth/logout</h5> Calls {@link AuthService#updateUser} to set the user's JWT to '' and removes the user from the session
     * 
     * @returns {Promise<Response>} 
     * @memberof AuthController
     */
    @Get('logout')
    public async logout( @Request() req: Req, @Response() res: Res) {
        if (!(req as any).session.user) return this.handleError(res, 'Error in AuthController.logout(): ', { error: 'NO_LOGIN_FOUND' }, HttpStatus.NOT_FOUND)
        try {
            (req as any).session.user.jwt = `${Math.random()}`;
            (req as any).session.user.email = (req as any).session.user.Email;
            let user = await this.authService.updateUser(_.pick((req as any).session.user, ['id', 'jwt']) as any);
            (req as any).session.user = null;
            return res.status(HttpStatus.OK).json({ message: "LOGOUT_SUCCESS" });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.logout(): ', error);
        }
    }

    @Post('/changepassword')
    public async changePassword( @Request() req: Req, @Response() res: Res, @Body() body: any) {
        if (!body.password) return this.handleError(res, 'Error in AuthController.changePassword(): ', { error: 'MISSING_FIELDS', fields: ['password'] }, HttpStatus.BAD_REQUEST);

        try {
            (req as any).session.user.password = body.password;

            const updated = await this.authService.updateUser(_.pick((req as any).session.user, ['id', 'password']) as any);

            (req as any).session.user = await this.authService.getUser(`user.id=${(req as any).session.user.id}`);
            (req as any).session.user = await this.getSessionUser((req as any).session.user);

            return res.status(HttpStatus.OK).json({ jwt: (req as any).session.user.jwt });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.changePassword', error);
        }
    }

    @Post('/loginas')
    public async loginAs(@Request() req: Req, @Response() res: Res, @Body() body: any) {
        if(!body.adminId || !body.userId) return this.handleError(res, 'Error in AuthController.loginAs(): ', { error: 'MISSING_FIELDS', fields: ['adminId', 'userId']}, HttpStatus.BAD_REQUEST);
        if((req as any).session.user.id != body.adminId) return this.handleError(res, 'Error in AuthController.loginAs(): ', {error: 'UNAUTHORIZED'}, HttpStatus.FORBIDDEN);
        
        try {
            const user = await this.authService.loginAs({adminId: body.adminId, userId: body.userId});
            (req as any).session.user = await this.getSessionUser(user);
            (req as any).session.user.adminToken = req.headers['x-jwt'];
            (req as any).session.affiliate = (req as any).session.user['AccountId'];

            console.debug(`Admin ${body.adminId} logged in as ${body.userId}`);

            return res.status(HttpStatus.OK).json(_.omit((req as any).session.user, ['permissions', 'extId', 'services', 'role.permissions', 'password']));
        } catch(error) {
            return this.handleError(res, 'Error in AuthController.loginAs', error);
        }
    }
}