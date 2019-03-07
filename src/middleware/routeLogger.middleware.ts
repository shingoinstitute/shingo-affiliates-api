import { NestMiddleware, Inject, Injectable } from '@nestjs/common'
import _ from 'lodash'
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
      console.info(info)

      // Log custom headers
      for (const key in req.headers) {
        if (key.includes('x-'))
          console.info(`\tHeader: '${key}: ${req.headers[key]}'`)
      }

      // Log post body
      if (req.method === 'POST' || req.method === 'PUT') {
        console.info('\tBody: %j', req.body)
      }

      return next()
    }) as any
  }
}
