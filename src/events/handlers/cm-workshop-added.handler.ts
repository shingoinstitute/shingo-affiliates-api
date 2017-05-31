import { WorkshopAddedEvent } from '../implementation/workshop-added.event';
import { Client, ClientProxy, Transport, ClientRedis} from '@nestjs/microservices';

export class CMWorkshopAddedHandler {
    /**
     * RPC client to interact with the shingo-auth-api using Redis
     * 
     * @type {ClientProxy}
     * @memberof EventsController
     */
    @Client({ transport: Transport.REDIS, url: process.env.REDIS_URL || 'redis://shingo-redis:6379' })
    static authApi : ClientProxy

    public static handle(event: WorkshopAddedEvent){
        this.authApi = new ClientRedis({url: process.env.REDIS_URL});
        console.log('Course Manager WA handling event: ', event);
        this.authApi.send({ cmd: 'findRole' }, {role: `Course Manager -- ${event.affiliateId}`})
            .subscribe(result => {
                if(result['name'] === `Course Manager -- ${event.affiliateId}`){
                    this.authApi.send({ cmd: 'grantPermission' }, {resource: `/workshops/${event.workshopId}`, level: 2, isRole: true, userId: result['id']})
                        .subscribe(r => {
                            console.log(`Add permission set ${JSON.stringify(r)}`);
                        });
                } else {
                    console.error('Got unexpected result for Course Manager handle workshop add: ', result);
                }
            });
    }
}