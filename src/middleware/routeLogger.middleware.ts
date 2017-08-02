import { Middleware, NestMiddleware } from '@nestjs/common';
import { LoggerService } from '../components';
import * as _ from 'lodash';

@Middleware()
export class RouteLoggerMiddleware implements NestMiddleware {

    private log = new LoggerService();

    public resolve() {
        return (req, res, next) => {
            let info = `${req.method} ${req.originalUrl}`;
            if (req.session.user) info += ` by ${req.session.user.email}`;
            this.log.verbose(info);
            for (const key in req.headers) {
                if (key.includes('x-')) this.log.verbose(`'${key}: ${req.headers[key]}'`);
            }
            if (req.method === 'POST' || req.method === 'PUT') {
                let body = req.body;
                if (process.env.NODE_ENV === 'production') body = _.omit(body, ['password']);
                this.log.verbose('Request body: %j', req.body);
            }

            return next();
        }
    }
}