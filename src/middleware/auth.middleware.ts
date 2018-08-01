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

            let realResource =
                resource && resource.match(/^.*\s--\s$/) ? resource + req.session.affiliate
                : !resource ? `${req.path}`
                : resource;

            if (realResource.match(/^\/workshops\/.*\/facilitators/)) realResource = realResource.split('/facilitators')[0];
	        else if (realResource.match(/^\/workshops\/.*\/attendee_file/)) realResource = realResource.split('/attendee_file')[0];
	        else if (realResource.match(/^\/workshops\/.*\/evaluation_files/)) realResource = realResource.split('/evaluation_files')[0];

            return this.authService.canAccess(realResource, level, req.headers['x-jwt'])
                .then(result => {
                    const messageResource =
                        realResource.includes('affiliate -- ') ? 'affiliate -- '
                        : realResource.includes('workshops -- ') ? 'workshops -- '
                        : `${req.path}`;

                    if (result && result.response) return next();
                    throw { error: 'ACCESS_FORBIDDEN', message: `Insufficent permission to access ${messageResource} at level ${level} by user: ${req.session.user ? req.session.user.Email : 'anonymous'}` };
                })
                .catch(error => {
                    if (error.metadata) error = SalesforceService.parseRPCErrorMeta(error);
                    this.log.error('Error in AuthMiddleware.resolve(): %j', error);
                    return res.status(HttpStatus.FORBIDDEN).json(error);
                });
        }
    }
}
