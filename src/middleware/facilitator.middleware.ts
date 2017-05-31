import { HttpStatus, Middleware, NestMiddleware, Request, Response, Next, Headers, RequestMapping } from '@nestjs/common';
import { Client, ClientProxy, Transport, ClientRedis} from '@nestjs/microservices';

@Middleware()
export class FacilitatorMiddleware implements NestMiddleware {

    @Client({ transport: Transport.REDIS, url: process.env.REDIS_URL || 'redis://shingo-redis:6379' })
    authApi : ClientRedis;
    
    public resolve() {
        return (req, res, next) => {
            this.authApi = new ClientRedis({url: process.env.REDIS_URL});

            const email = req.headers['x-email'];
            console.log(`Getting permissions for AF User with email ${email}`);
            this.authApi.send({cmd: 'getPermissions'}, { email })
                .subscribe((result) => {
                    console.log(`Got result for getPermissions(${email}): `, result);
                    if(result instanceof Array){
                        req.session.permissions = result;
                        return next();
                    } else {
                        res.status(HttpStatus.FORBIDDEN)
                            .json({error: 'Forbidden'});
                    }
                    
                }, error => {
                    console.error('Error in FacilitatorMiddleware.resolve(): ', error);
                    next(error);
                });
        }
    }
}