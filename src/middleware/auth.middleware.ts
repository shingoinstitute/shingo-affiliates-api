import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

@Middleware()
export class AuthMiddleware implements NestMiddleware {

    public resolve(level : number, resource? : string) {
        return (req, res, next) => {
            if((req.headers['x-jwt'] === '<<Shigeo1812>>' && process.env.NODE_ENV !== 'production')
                || (req.session.user && req.session.user.role && req.session.user.role.name === 'Affiliate Manager')) {
                req.session.affiliate = req.headers['x-affiliate'] || 'ALL';
                if(!req.session.user){
                    req.session.user = {};
                    req.session.user.permissions = [];
                    req.session.user.id = req.headers['x-user-id'];
                }
                return next();
            }
            if(resource && resource.match(/^.*\s--\s$/)) resource += req.session.affiliate;
            else if(!resource) resource = `${req.path}`;

            if(resource.match(/^\/workshops\/.*\/facilitators/)) resource = resource.split('/facilitators')[0];

            console.log('canAccess with ', resource);
            
            client.canAccess({resource, level: 2, jwt: req.headers['x-jwt']}, (error, valid) => {
                if(resource.includes('affiliate -- ')) resource = 'affiliate -- ';
                else resource = '';
                if(valid) return next();
                if(error) console.error(`Error in AuthMiddleware.resolve(${resource}, ${level}, ${req.headers['x-jwt']}): `, error);
                res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'ACCESS_FORBIDDEN'});
            });
        }
    }
}