import { HttpStatus, Middleware, NestMiddleware, MiddlewareFunction, ForbiddenException, Inject } from '@nestjs/common';
import { AuthClient } from '@shingo/shingo-auth-api';
import { getBearerToken, parseError } from '../util';
import { Request, Response, NextFunction } from 'express';
import { LoggerInstance } from 'winston';

/**
 * The auth middleware uses the Shingo Auth API to test if the user has permissions to access a given resource
 *
 * @export
 * @class AuthMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class AuthMiddleware implements NestMiddleware {

  constructor(private authService: AuthClient, @Inject('LoggerService') private log: LoggerInstance) { }

  /**
   * The function called when the middleware is activated.
   * NOTE: If user is an Affiliate Manager all check logic is skipped as the user implicitly has all permissions.
   *
   * @param level - The level of permissions required (1=Read,2=Write)
   * @param [resource] - The resource being accessed
   */
  resolve(level: 1 | 2, resource?: string): MiddlewareFunction {
    return (req: Request, _res: Response, next) => {
      const isAfMan = req.session && req.session.user && req.session.user.role.name === 'Affiliate Manager';

      if (isAfMan) return next && next();

      let realResource =
          resource && resource.match(/^.*\s--\s$/) ? resource + req.session.affiliate
          : !resource ? `${req.path}`
          : resource;

      if (realResource.match(/^\/workshops\/.*\/facilitators/)) realResource = realResource.split('/facilitators')[0];
      else if (realResource.match(/^\/workshops\/.*\/attendee_file/)) realResource = realResource.split('/attendee_file')[0];
      else if (realResource.match(/^\/workshops\/.*\/evaluation_files/)) realResource = realResource.split('/evaluation_files')[0];

      const jwt = (req.headers.authorization && getBearerToken(req.headers.authorization))
        || req.headers['x-jwt'] as string

      return this.authService
          .canAccess(realResource, level, jwt)
          .then(result => {
            const messageResource =
                realResource.includes('affiliate -- ') ? 'affiliate -- '
                : realResource.includes('workshops -- ') ? 'workshops -- '
                : `${req.path}`;

            if (result) return next && next();

            throw new ForbiddenException(
              // tslint:disable-next-line:max-line-length
              `Insufficent permission to access ${messageResource} at level ${level} by user: ${req.session.user ? req.session.user.Email : 'anonymous'}`,
              'ACCESS_FORBIDDEN'
            )
          })
          .catch(error => {
            if (error.metadata) error = parseError(error)
            this.log.error('Error in AuthMiddleware.resolve(): %j', error);
            throw error
          });
    }
  }
}
