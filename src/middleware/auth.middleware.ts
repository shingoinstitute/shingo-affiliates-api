import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { AuthService } from '../components';

@Middleware()
export class AuthMiddleware implements NestMiddleware {

    private authService = new AuthService();

    public resolve(level: number, resource?: string) {
        return (req, res, next) => {
            let role = req.session.user.roles.find(role => { return role.name === 'Affiliate Manager'; });

            if (req.session.user && role) return next();

            if (resource && resource.match(/^.*\s--\s$/)) resource += req.session.affiliate;
            else if (!resource) resource = `${req.path}`;

            if (resource.match(/^\/workshops\/.*\/facilitators/)) resource = resource.split('/facilitators')[0];

            return this.authService.canAccess(resource, 2, req.header['x-jwt'])
                .then(result => {
                    if (resource.includes('affiliate -- ')) resource = 'affiliate -- ';
                    else resource = '';
                    if (result && result.response) return next();
                    throw { error: 'ACCESS_FORBIDDEN' };
                })
                .catch(error => {
                    console.error('Error in AuthMiddleware.resolve(): ', error);
                    return res.status(HttpStatus.FORBIDDEN).json(error);
                });
        }
    }
}