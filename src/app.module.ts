import { Module, MiddlewaresConsumer, RequestMethod, OnModuleInit } from '@nestjs/common';
import { WorkshopsController } from './controllers';
import { MarkWorkshopAddedHandler, AMWorkshopAddedHandler, CMWorkshopAddedHandler } from './events/handlers';
import { AuthMiddleware, FacilitatorMiddleware } from './middleware'
import { WorkshopAddedEvent } from './events/implementation/workshop-added.event';
import { Events } from './events/emitter';

@Module({
    controllers: [ WorkshopsController ],
    components: [ AuthMiddleware ]
})
export class ApplicationModule implements OnModuleInit {

    private eventsEmitter;

    constructor(){
        let events = new Events();
        this.eventsEmitter = Events.emitter;
    }

    configure(consumer : MiddlewaresConsumer){
        consumer.apply(FacilitatorMiddleware)
        .forRoutes({
            path: '/workshops', method: RequestMethod.GET
        })
        .apply(AuthMiddleware)
        .with(2, 'affiliate -- ')
        .forRoutes({
            path: '/workshops', method: RequestMethod.POST
        })
        .apply(AuthMiddleware)
        .with(2)
        .forRoutes({
            path: '/workshops/a*', method: RequestMethod.ALL
        })
    }

    onModuleInit(){
        this.eventsEmitter.on('workshop-added', MarkWorkshopAddedHandler.handle);
        this.eventsEmitter.on('workshop-added', AMWorkshopAddedHandler.handle);
        this.eventsEmitter.on('workshop-added', CMWorkshopAddedHandler.handle);
    }
}

