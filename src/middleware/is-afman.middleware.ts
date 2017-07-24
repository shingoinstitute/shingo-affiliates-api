import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';

@Middleware()
export class IsAFManMiddleware implements NestMiddleware {

    public resolve() {
        return (req, res, next) => {
            if (req.session.user && req.session.user.roles && req.session.user.roles.findIndex(r => { return r.name === 'Affiliate Manager' }) !== -1) return next();
            else return res.status(HttpStatus.FORBIDDEN).json({ error: 'ACCESS_FORBIDDEN' });
        }
    }
}