import { HttpStatus, Middleware, NestMiddleware } from '@nestjs/common';
import { AuthService } from '../components';
import { parseRPCErrorMeta } from '../util';

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

    constructor() {
        this.authService = new AuthService();
    }

    private parseResource(resource: string) {
        if (resource.match(/^\/workshops\/.*\/facilitators/))
            return resource.split('/facilitators')[0]
        else if (resource.match(/^\/workshops\/.*\/attendee_file/))
            return resource.split('/attendee_file')[0]
        else if (resource.match(/^\/workshops\/.*\/evaluation_files/))
            return resource.split('/evaluation_files')[0]

        return resource
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

            const realResource = this.parseResource(
                resource && resource.match(/^.*\s--\s$/) ? resource + req.session.affiliate
                : !resource ? resource = `${req.path}`
                : resource
            )

            return this.authService.canAccess(realResource, level, req.headers['x-jwt'])
                .then(result => {
                    if (result && result.response) return next();
                    throw { error: 'ACCESS_FORBIDDEN', message: `Insufficent permission to access ${realResource} at level ${level} by user: ${req.session.user ? req.session.user.Email : 'anonymous'}` };
                })
                .catch(error => {
                    if (error.metadata) error = parseRPCErrorMeta(error);
                    console.error('Error in AuthMiddleware.resolve(): %j', error);
                    return res.status(HttpStatus.FORBIDDEN).json(error);
                });
        }
    }
}
