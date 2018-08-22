import { Middleware, NestMiddleware } from '@nestjs/common';
import { LoggerService } from '../components';
import _ from 'lodash';

/**
 * Route Logger logs information about every route. Use this to debug any issues.
 *
 * @export
 * @class RouteLoggerMiddleware
 * @implements {NestMiddleware}
 */
@Middleware()
export class RouteLoggerMiddleware implements NestMiddleware {

  constructor(private log: LoggerService) { }

  /**
   * Logs:
   * `METHOD /original/url [by user.email]
   *  Header: 'x-custom-header: value'
   *  Body: {"some":"field"}
   * `
   */
  resolve() {
    return (req, res, next) => {
      // Log route info
      const info = `${req.method} ${req.originalUrl}` + (req.session.user ? ` by ${req.session.user.Email}` : '');
      this.log.verbose(info);

      // Log custom headers
      for (const key in req.headers) {
        if (key.includes('x-')) this.log.verbose(`\tHeader: '${key}: ${req.headers[key]}'`);
      }

      // Log post body
      if (req.method === 'POST' || req.method === 'PUT') {
        const body = process.env.NODE_ENV === 'production' ? _.omit(req.body, ['password']) : req.body;
        this.log.verbose('\tBody: %j', req.body);
      }

      return next();
    }
  }
}
