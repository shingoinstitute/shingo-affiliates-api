import { Module, MiddlewaresConsumer, RequestMethod, OnModuleInit } from '@nestjs/common';
import { WorkshopsController, AuthController, FacilitatorsController } from './controllers';
import { AuthMiddleware, IsValidMiddleware, IsAFManMiddleware } from './middleware'
import { WorkshopEmitter, FacilitatorEmitter } from './events';

@Module({
    controllers: [ WorkshopsController, AuthController, FacilitatorsController ],
    components: [ AuthMiddleware ]
})
export class ApplicationModule implements OnModuleInit {

    private eventsEmitter;

    configure(consumer : MiddlewaresConsumer){
        consumer
        .apply(IsValidMiddleware)
        .forRoutes(WorkshopsController, FacilitatorsController)
        .apply(AuthMiddleware)
        .with(1, 'affiliate -- ')
        .forRoutes({
            path: '/facilitators', method: RequestMethod.GET
        },
        {
            path: '/facilitators/*', method: RequestMethod.GET
        })
        .apply(IsAFManMiddleware)
        .forRoutes({
            path: '/facilitators', method: RequestMethod.POST
        },
        {
            path: '/facilitators/*', method: RequestMethod.PUT
        },
        {
            path: '/facilitators/*', method: RequestMethod.DELETE
        })
        .apply(AuthMiddleware)
        .with(2, 'workshops -- ')
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
        FacilitatorEmitter.init();
    }
}

