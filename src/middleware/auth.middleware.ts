import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { AuthService, SalesforceService, LoggerService } from '../components';

/**
 * The auth middleware uses the Shingo Auth API to test if the user has permissions to access a given resource
 * 
 * @export
 * @class AuthMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class AuthMiddleware implements NestMiddleware {

    private authService;
    private log;

    constructor() {
        this.authService = new AuthService();
        this.log = new LoggerService();
    }

    /**
     * The function called when the middleware is activated. Calls {@link AuthService#canAccess}. NOTE: If user is an Affiliate Manager all check logic is skipped as the user implicitly has all permissions.
     * 
     * @param {(1|2)} level - The level of permissions required (1=Read,2=Write)
     * @param {string} [resource] - The resource being accessed
     * @returns {void}
     * @memberof AuthMiddleware
     */
    public resolve(level: number, resource?: string) {
        return (req, res, next) => {
            let isAfMan = req.session.user && req.session.user.role.name === 'Affiliate Manager';

            if (isAfMan) return next();

            if (resource && resource.match(/^.*\s--\s$/)) resource += req.session.affiliate;
            else if (!resource) resource = `${req.path}`;

            if (resource.match(/^\/workshops\/.*\/facilitators/)) resource = resource.split('/facilitators')[0];

            return this.authService.canAccess(resource, level, req.headers['x-jwt'])
                .then(result => {
                    if (resource.includes('affiliate -- ')) resource = 'affiliate -- ';
                    else if (resource.includes('workshops -- ')) resource = 'workshops -- ';
                    else resource = '';
                    if (result && result.response) return next();
                    throw { error: 'ACCESS_FORBIDDEN', message: `Insufficent permission to access ${resource} at level ${level} by user: ${req.session.user ? req.session.user.Email : 'anonymous'}` };
                })
                .catch(error => {
                    if (error.metadata) error = SalesforceService.parseRPCErrorMeta(error);
                    this.log.error('Error in AuthMiddleware.resolve(): %j', error);
                    return res.status(HttpStatus.FORBIDDEN).json(error);
                });
        }
    }
}