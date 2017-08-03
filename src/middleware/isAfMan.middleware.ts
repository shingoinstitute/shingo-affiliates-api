import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';

/**
 * This middleware checks if the current session's user has the role of Affiliate Manager
 * 
 * @export
 * @class IsAFManMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class IsAFManMiddleware implements NestMiddleware {

    /**
     * The function called when the middleware is activated. Checks that <code>req.session.user.role === 'Affiliate Manager'</code>
     * 
     * @returns {void}
     * @memberof IsAFManMiddleware
     */
    public resolve() {
        return (req, res, next) => {
            if (req.session.user && req.session.user.role === 'Affiliate Manager') return next();
            else return res.status(HttpStatus.FORBIDDEN).json({ error: 'ACCESS_FORBIDDEN' });
        }
    }
}