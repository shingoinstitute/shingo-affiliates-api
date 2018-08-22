import { HttpStatus, Middleware, NestMiddleware } from '@nestjs/common';
import { LoggerService } from '../components';
import _ from 'lodash';
import { SalesforceClient } from '@shingo/shingo-sf-api';
import { AuthClient } from '@shingo/shingo-auth-api';
import { parseRPCErrorMeta } from '../util'

/**
 * Checks if the user with given JWT is valid (JWT is correct and hasn't expired)
 * and rebuilds the user object on session if it is missing
 *
 * @export
 * @class IsValidMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class IsValidMiddleware implements NestMiddleware {

  constructor(private sfService: SalesforceClient, private authService: AuthClient, private log: LoggerService) { }

  /**
   * If <code>req.session.user === undefined</code> this method gets
   * the user with matching JWT from the Auth database,
   * then fetches the user's Contact from Salesforce and merges the two objects
   *
   * @memberof IsValidMiddleware
   */
  resolve() {
    return (req, res, next) => {
      if (req.path.match(/.*resetpassword.*/gi)) return next();
      if (req.path === '/workshops' && (req.query.isPublic || req.headers['x-is-public'])) return next();
      if (!req.headers['x-jwt'] && !req.session.user) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'INVALID_TOKEN', header: 'x-jwt' });
      }

      const adminToken = (req.session.user ? req.session.user.adminToken : '');

      return this.authService
        .isValid(req.headers['x-jwt'] || req.session.user.jwt)
        .then(valid => {
          if (valid && !valid.response) throw { error: 'INVALID_TOKEN' };

          if (req.session.user
            && req.session.user.AccountId
            && req.session.user.jwt === req.headers['x-jwt']
            && req.headers['x-force-refresh'] !== 'true') {
              throw new Error('SESSION_ALIVE');
            }

          return this.authService.getUser(`user.jwt='${req.headers['x-jwt']}'`);
        })
        .then(user => {
          if (user === undefined) throw { error: 'INVALID_TOKEN' };
          req.session.user = _.omit(user, ['password', 'roles']);
          req.session.user.role = user.roles.map(role => {
            // FIXME: this will return undefined for all instances where if doesn't match
            if (role.service === 'affiliate-portal') return _.omit(role, ['users', 'service'])
          })[0];

          return this.sfService.retrieve({ object: 'Contact', ids: [user.extId] });
        })
        .then(response => {
          const contact = response[0];
          req.session.user = _.merge(contact, _.omit(req.session.user, ['email']));
          req.session.user.adminToken = adminToken;
          req.session.affiliate = contact['AccountId'];
          return next();
        })
        .catch(error => {
          if (error.message === 'SESSION_ALIVE') return next();
          if (error.metadata) error = parseRPCErrorMeta(error);
          this.log.error('Error in is-valid.middleware.ts: %j', error);
          return res.status(HttpStatus.FORBIDDEN).json(error);
        });
    }
  }
}
