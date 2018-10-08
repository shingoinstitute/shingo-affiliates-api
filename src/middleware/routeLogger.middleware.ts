import { NestMiddleware, Inject, Injectable } from '@nestjs/common'
import _ from 'lodash'
import { LoggerInstance } from 'winston'
import { Request, Response, NextFunction } from 'express'

/**
 * Route Logger logs information about every route. Use this to debug any issues.
 *
 * @export
 * @class RouteLoggerMiddleware
 * @implements {NestMiddleware}
 */
@Injectable()
export class RouteLoggerMiddleware implements NestMiddleware {
  constructor(@Inject('LoggerService') private log: LoggerInstance) {}

  /**
   * Logs:
   * `METHOD /original/url [by user.email]
   *  Header: 'x-custom-header: value'
   *  Body: {"some":"field"}
   * `
   */
  resolve() {
    return ((req: Request, _res: Response, next: NextFunction) => {
      // Log route info
      const info =
        `${req.method} ${req.originalUrl}` +
        (req.user ? ` by ${req.user.sfContact.Email}` : '')
      this.log.verbose(info)

      // Log custom headers
      for (const key in req.headers) {
        if (key.includes('x-'))
          this.log.verbose(`\tHeader: '${key}: ${req.headers[key]}'`)
      }

      // Log post body
      if (req.method === 'POST' || req.method === 'PUT') {
        this.log.verbose('\tBody: %j', req.body)
      }

      return next()
    }) as any
  }
}
