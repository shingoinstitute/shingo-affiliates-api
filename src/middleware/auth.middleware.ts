import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { Client, ClientProxy, Transport, ClientRedis} from '@nestjs/microservices';

@Middleware()
export class AuthMiddleware implements NestMiddleware {

    @Client({ transport: Transport.REDIS, url: process.env.REDIS_URL || 'redis://shingo-redis:6379' })
    authApi : ClientRedis;
    
    public resolve(level : number, resource? : string) {
        return (req, res, next) => {
            if(req.session.affiliate === undefined){ req.session.userId = 1; req.session.affiliate = 'ALL'; return next(); }

            if(!resource) resource = `${req.method}: ${req.path}`;
            if(resource.includes('affiliate -- ')) resource += req.session.affiliate;
            this.authApi = new ClientRedis({url: process.env.REDIS_URL});
            const token = req.headers['x-jwt'];
            console.log(`Checking permissions for ${resource} with level ${level}`);
            this.authApi.send({cmd: 'canAccess'}, { jwt: token, resource: resource, level: level})
                .subscribe((result) => {
                    console.log('Got result', result);
                    if(result){
                        return next();
                    } else {
                        res.status(HttpStatus.FORBIDDEN)
                            .json({error: 'Forbidden'});
                    }
                    
                }, error => {
                    console.error('Error in AuthMiddleware.resolve(): ', error);
                    next(error);
                });
        }
    }
}