import { Module, MiddlewaresConsumer, RequestMethod, OnModuleInit } from '@nestjs/common';
import { WorkshopsController, AuthController } from './controllers';
import { AuthMiddleware } from './middleware'
import { WorkshopEmitter } from './events';

@Module({
    controllers: [ WorkshopsController, AuthController ],
    components: [ AuthMiddleware ]
})
export class ApplicationModule implements OnModuleInit {

    private eventsEmitter;

    configure(consumer : MiddlewaresConsumer){
        consumer.apply(AuthMiddleware)
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

    onModuleInit() {
        WorkshopEmitter.init();
    }
}

