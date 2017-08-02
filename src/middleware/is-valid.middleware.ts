import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { SalesforceService, AuthService, SFQueryObject, LoggerService } from '../components';

@Middleware()
export class IsValidMiddleware implements NestMiddleware {

    private sfService = new SalesforceService();
    private authService = new AuthService();
    private log = new LoggerService();

    public resolve() {
        return (req, res, next) => {
            if (req.path === '/workshops' && (req.query.isPublic || req.headers['x-is-public'])) return next();
            if (!req.headers['x-jwt'] && !req.session.user) return res.status(HttpStatus.BAD_REQUEST).json({ error: 'HEADER_NOT_SET', header: 'x-jwt' });
            return this.authService.isValid(req.headers['x-jwt'] || req.session.user.jwt)
                .then(valid => {
                    if (valid && !valid.response) throw { error: 'ACCESS_FORBIDDEN' };

                    return this.authService.getUser(`user.jwt='${req.headers['x-jwt']}'`);
                })
                .then(user => {
                    if (user === undefined) throw { error: 'USER_NOT_FOUND' };
                    req.session.user = user;

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
                .then(contact => {
                    req.session.user.contact = contact.records[0];
                    req.session.affiliate = contact.records[0]['AccountId'];
                    return next();
                })
                .catch(error => {
                    if (error.metadata) error = SalesforceService.parseRPCErrorMeta(error);
                    this.log.error('Error in is-valid.middleware.ts: %j', error);
                    return res.status(HttpStatus.FORBIDDEN).json(error);
                });
        }
    }
}