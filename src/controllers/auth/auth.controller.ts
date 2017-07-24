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

/**
 * @desc Provides the controller of the Auth REST logic
 * 
 * @export
 * @class AuthController
 */
@Controller('auth')
export class AuthController {

    constructor(private sfService: SalesforceService, private authService: AuthService) { };

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
        if (error.metadata) error = this.sfService.parseRPCErrorMeta(error);

        console.error(message, error);
        return res.status(errorCode).json({ error });
    }

    /**
     * @desc <h5>POST: /auth/login</h5> Calls {@link AuthService#login} and {@link SalesforceService#query} to login a user
     * 
     * @param {Request} req - Express request
     * @param {Reponse} res - Express response
     * @param {any} body - Required fields: <code>[ 'email', 'password' ]</code>
     * @returns {Promise<Response>} Response body is an object with the user's JWT
     * @memberof AuthController
     */
    @Post('login')
    public async login( @Request() req, @Response() res, @Body() body): Promise<Response> {
        if (!body.email || !body.password) return this.handleError(res, 'Error in AuthController.login(): ', { error: "MISSING_FIELDS" }, HttpStatus.BAD_REQUEST);

        try {
            const user = await this.authService.login(body);

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
            req.session.user = user;
            req.session.user.contact = contact;
            req.session.affiliate = contact['AccountId'];

            return res.status(HttpStatus.OK).json({ jwt: user.jwt });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.login(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /auth/logout</h5> Calls {@link AuthService#updateUser} to set the user's JWT to '' and removes the user from the session
     * 
     * @param {Request} req - Express request 
     * @param {Response} res - Express response
     * @returns {Promise<Response>} 
     * @memberof AuthController
     */
    @Get('logout')
    public async logout( @Request() req, @Response() res): Promise<Response> {
        try {
            req.session.user.jwt = '';
            await this.authService.updateUser(req.session.user);
            req.session.user = null;
            return res.status(HttpStatus.OK).json({ message: "LOGOUT_SUCCESS" });
        } catch (error) {
            return this.handleError(res, 'Error in AuthController.logout(): ', error);
        }
    }

}