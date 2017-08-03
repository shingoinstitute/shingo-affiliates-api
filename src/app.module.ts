import { Module, MiddlewaresConsumer, RequestMethod, OnModuleInit } from '@nestjs/common';
import { WorkshopsController, AuthController, FacilitatorsController, AffiliatesController } from './controllers';
import { AuthMiddleware, IsValidMiddleware, IsAFManMiddleware, RouteLoggerMiddleware } from './middleware'
import {
    SalesforceService, CacheService, AuthService,
    WorkshopsService, FacilitatorsService, AffiliatesService,
    UserService, LoggerService
} from './components';

/**
 * The NestJS application module ties together the controllers and components. It also configures any nest middleware.
 * 
 * @export
 * @class ApplicationModule
 */
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
        UserService,
        { provide: 'logOptions', useValue: undefined },
        LoggerService
    ]
})
export class ApplicationModule {

    private eventsEmitter;

    configure(consumer: MiddlewaresConsumer) {

        if (process.env.DEBUG_ROUTES === 'true') {
            consumer.apply(RouteLoggerMiddleware)
                .forRoutes(WorkshopsController, AuthController, AffiliatesController, FacilitatorsController);
        }

        // Protect all routes that must have a user logged in
        consumer.apply(IsValidMiddleware)
            .forRoutes(FacilitatorsController,
            { path: '/workshops', method: RequestMethod.ALL },
            { path: '/workshops/a*', method: RequestMethod.ALL },
            { path: '/workshops/search', method: RequestMethod.ALL },
            { path: '/workshops/describe', method: RequestMethod.ALL },
            { path: '/auth/logout', method: RequestMethod.ALL },
            { path: '/auth/valid', method: RequestMethod.ALL },
            { path: '/affiliates/*', method: RequestMethod.GET },
            { path: '/affiliates*', method: RequestMethod.POST },
            { path: '/affiliates*', method: RequestMethod.PUT },
            { path: '/affiliates*', method: RequestMethod.DELETE });

        // Protect all routes that require a read on the Affiliate
        consumer.apply(AuthMiddleware)
            .with(1, 'affiliate -- ')
            .forRoutes({ path: '/facilitators', method: RequestMethod.GET },
            { path: '/facilitators/*', method: RequestMethod.GET },
            { path: '/affiliates/*', method: RequestMethod.GET });

        // Protect all routes that require the user to be an Affiliate Manager
        consumer.apply(IsAFManMiddleware)
            .forRoutes({ path: '/facilitators*', method: RequestMethod.POST },
            { path: '/facilitators*', method: RequestMethod.PUT },
            { path: '/facilitators*', method: RequestMethod.DELETE },
            { path: '/affiliates*', method: RequestMethod.POST },
            { path: '/affiliates*', method: RequestMethod.PUT },
            { path: '/affiliates*', method: RequestMethod.DELETE });

        // Protect all routes that require workshop creation permissions
        consumer.apply(AuthMiddleware)
            .with(2, 'workshops -- ')
            .forRoutes({ path: '/workshops', method: RequestMethod.POST });

        // Protect all routes that require read permissions for a workshop
        consumer.apply(AuthMiddleware)
            .with(1)
            .forRoutes({ path: '/workshops/a*', method: RequestMethod.GET });

        // Protect all routes that require write permissions for a workshop
        consumer.apply(AuthMiddleware)
            .with(2)
            .forRoutes({ path: '/workshops/a*', method: RequestMethod.PUT },
            { path: '/workshops/a*', method: RequestMethod.DELETE });
    }

}

