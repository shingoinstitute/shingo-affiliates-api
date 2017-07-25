import { Module, MiddlewaresConsumer, RequestMethod, OnModuleInit } from '@nestjs/common';
import { WorkshopsController, AuthController, FacilitatorsController, AffiliatesController } from './controllers';
import { AuthMiddleware, IsValidMiddleware, IsAFManMiddleware } from './middleware'
import {
    SalesforceService, CacheService, AuthService,
    WorkshopsService, FacilitatorsService, AffiliatesService,
    UserService
} from './components';

@Module({
    controllers: [WorkshopsController, AuthController, FacilitatorsController, AffiliatesController],
    components: [
        AuthMiddleware,
        SalesforceService,
        CacheService,
        AuthService,
        WorkshopsService,
        FacilitatorsService,
        AffiliatesService,
        UserService
    ]
})
export class ApplicationModule {

    private eventsEmitter;

    configure(consumer: MiddlewaresConsumer) {
        consumer
            .apply(IsValidMiddleware)
            .forRoutes(FacilitatorsController,
            {
                path: '/workshops', method: RequestMethod.ALL
            },
            {
                path: '/workshops/a*', method: RequestMethod.ALL
            },
            {
                path: '/workshops/search', method: RequestMethod.ALL
            },
            {
                path: '/workshops/describe', method: RequestMethod.ALL
            }
            )
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

}

