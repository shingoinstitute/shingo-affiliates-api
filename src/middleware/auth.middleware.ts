import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

@Middleware()
export class AuthMiddleware implements NestMiddleware {

    public resolve(level : number, resource? : string) {
        return (req, res, next) => {
            if(!resource) resource = `${req.method}: ${req.path}`;
            if(resource.includes('affiliate -- ')) resource += req.session.affiliate;
            
            client.canAccess({resource, level: 2, jwt: req.headers['x-jwt']}, (error, valid) => {
                if(valid) return next();
                if(error) console.error(`Error in AuthMiddleware.resolve(${resource}, ${level}, ${req.headers['x-jwt']}): `, error);
                res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'ACCESS_FORBIDDEN'});
            })
        }
    }
}