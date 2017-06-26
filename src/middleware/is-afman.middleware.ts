import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

@Middleware()
export class IsAFManMiddleware implements NestMiddleware {

    public resolve() {
        return (req, res, next) => {
            if((req.headers['x-jwt'] === '<<Shigeo1812>>' && process.env.NODE_ENV !== 'production')
                || (req.session.user && req.session.user.role && req.session.user.role.name === 'Affiliate Manager')) {
                req.session.affiliate = req.headers['x-affiliate'] || 'ALL';
                if(!req.session.user){
                    req.session.user = {};
                    req.session.user.permissions = [];
                    req.session.user.id = req.headers['x-user-id'];
                    req.session.user.role = { name: req.headers['x-role-name'], permissions: []}
                }
                return next();
            } else {
                res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'ACCESS_FORBIDDEN'});
            }
        }
    }
}