import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { SalesforceService, AuthService, SFQueryObject, LoggerService } from '../components';
import * as _ from 'lodash';

/**
 * This middleware checks if the user with given JWT is valid (JWT is correct and hasn't expired) and rebuilds the user object on session if it is missing
 * 
 * @export
 * @class IsValidMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class IsValidMiddleware implements NestMiddleware {

    private sfService;
    private authService;
    private log;

    constructor() {
        this.sfService = new SalesforceService();
        this.authService = new AuthService();
        this.log = new LoggerService();
    }

    /**
     * The function called when the middleware is activated. If <code>req.session.user === undefined</code> this method gets the user with matching JWT from the Auth database, then fetches the user's Contact from Salesforce and merges the two objects
     * 
     * @returns {void}
     * @memberof IsValidMiddleware
     */
    public resolve() {
        return (req, res, next) => {
            if (req.path.match(/.*resetpassword.*/gi)) return next();
            if (req.path === '/workshops' && (req.query.isPublic || req.headers['x-is-public'])) return next();
            if (!req.headers['x-jwt'] && !req.session.user) return res.status(HttpStatus.BAD_REQUEST).json({ error: 'HEADER_NOT_SET', header: 'x-jwt' });
            return this.authService.isValid(req.headers['x-jwt'] || req.session.user.jwt)
                .then(valid => {
                    if (valid && !valid.response) throw { error: 'ACCESS_FORBIDDEN' };

                    if (req.session.user && req.session.user.AccountId && req.session.user.jwt === req.headers['x-jwt']) throw new Error('SESSION_ALIVE');

                    return this.authService.getUser(`user.jwt='${req.headers['x-jwt']}'`);
                })
                .then(user => {
                    if (user === undefined) throw { error: 'USER_NOT_FOUND' };
                    req.session.user = _.omit(user, ['password', 'roles']);
                    req.session.user.role = user.roles.map(role => { if (role.service === 'affiliate-portal') return _.omit(role, ['users', 'service']) })[0];

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
                        clauses: `Email='${user.email}' AND RecordType.Name='Affiliate Instructor'`
                    }
                    return this.sfService.query(query as SFQueryObject);
                })
                .then(response => {
                    let contact = response.records[0];
                    req.session.user = _.merge(contact, _.omit(req.session.user, ['email']));
                    req.session.affiliate = contact['AccountId'];
                    return next();
                })
                .catch(error => {
                    if (error.message === 'SESSION_ALIVE') return next();
                    if (error.metadata) error = SalesforceService.parseRPCErrorMeta(error);
                    this.log.error('Error in is-valid.middleware.ts: %j', error);
                    return res.status(HttpStatus.FORBIDDEN).json(error);
                });
        }
    }
}