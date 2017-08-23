import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { LoggerService } from '../components';

/**
 * This middleware checks if the current session's user has the role of Affiliate Manager
 * 
 * @export
 * @class IsAFManMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class IsAFManMiddleware implements NestMiddleware {

    private log;

    constructor() {
        this.log = new LoggerService();
    }

    /**
     * The function called when the middleware is activated. Checks that <code>req.session.user.role === 'Affiliate Manager'</code>
     * 
     * @returns {void}
     * @memberof IsAFManMiddleware
     */
    public resolve() {
        return (req, res, next) => {
            if (req.path.match(/.*resetpassword.*/)) return next();
            const isAFMan = req.session.user && req.session.user.role.name === 'Affiliate Manager';
            this.log.debug('Is AF Man %j', isAFMan)
            if (isAFMan) return next();
            return res.status(HttpStatus.FORBIDDEN).json({ error: 'ACCESS_FORBIDDEN', message: `You need to be an Affiliate Manager to access ${req.path}` });
        }
    }
}