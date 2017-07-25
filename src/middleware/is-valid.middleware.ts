import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { SalesforceService, AuthService, SFQueryObject } from '../components';

@Middleware()
export class IsValidMiddleware implements NestMiddleware {

    private sfService = new SalesforceService();
    private authService = new AuthService();

    public resolve() {
        return (req, res, next) => {
            if (req.path === '/workshops' && (req.query.isPublic || req.headers['x-is-public'])) return next();
            return this.authService.isValid(req.headers['x-jwt'])
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
                    console.error('Error in is-valid.middleware.ts', error);
                    return res.status(HttpStatus.FORBIDDEN).json(error);
                });
        }
    }
}