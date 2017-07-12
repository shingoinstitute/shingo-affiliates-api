import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../proto/auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());

@Middleware()
export class IsValidMiddleware implements NestMiddleware {

    public resolve() {
        return (req, res, next) => {
            if(req.headers['x-jwt'] === '<<Shigeo1812>>' && process.env.NODE_ENV !== 'production') return next();
            if(!req.session.user) return res.status(HttpStatus.FORBIDDEN).json({error: 'ACCESS_EXPIRED'});

            client.isValid({token: req.headers['x-jwt']}, (error, valid) => {
                if(valid && valid.response) return next();
                if(error) console.error(`Error in IsValidMiddleware.resolve(${req.headers['x-jwt']}): `, error);
                res.status(HttpStatus.FORBIDDEN)
                    .json({error: 'ACCESS_FORBIDDEN'});
            });
        }
    }
}