import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

@Middleware()
export class AuthMiddleware implements NestMiddleware {

    public resolve(level : number, resource? : string) {
        return (req, res, next) => {
            console.log(`AuthMiddleware.resolve(${level}, ${resource}) session `, req.session);
            if((req.headers['x-jwt'] === '<<Shigeo1812>>' && process.env.NODE_ENV !== 'production')
                || (req.session.user && req.session.user.role && req.session.user.role.name === 'Affilate Manager')) {
                req.session.affiliate = req.headers['x-affiliate'] || 'ALL';
                req.session.user = {};
                req.session.user.id = req.headers['x-user-id'];
            }
            if(resource === 'affiliate -- ') resource += req.session.affiliate;
            else resource = `${req.path}`;
            
            client.canAccess({resource, level: 2, jwt: req.headers['x-jwt']}, (error, valid) => {
                if(valid) return next();
                if(error) console.error(`Error in AuthMiddleware.resolve(${resource}, ${level}, ${req.headers['x-jwt']}): `, error);
                res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'ACCESS_FORBIDDEN'});
            });
        }
    }
}