import { Middleware, NestMiddleware, ForbiddenException, Inject } from '@nestjs/common';
import { LoggerInstance } from 'winston';

/**
 * This middleware checks if the current session's user has the role of Affiliate Manager
 *
 * @export
 * @class IsAFManMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class IsAFManMiddleware implements NestMiddleware {

  constructor(@Inject('LoggerService') private log: LoggerInstance) { }

  /**
   * The function called when the middleware is activated.
   * Checks that <code>req.session.user.role === 'Affiliate Manager'</code>
   */
  resolve() {
    return (req, res, next) => {
      if (req.path.match(/.*resetpassword.*/)) return next();

      const isAFMan = req.session.user && req.session.user.role.name === 'Affiliate Manager';

      this.log.debug('Is AF Man %j', isAFMan)

      if (isAFMan) return next();

      throw new ForbiddenException(
        `You need to be an Affiliate Manager to access ${req.path}`,
        'ACCESS_FORBIDDEN'
      )
    }
  }
}
