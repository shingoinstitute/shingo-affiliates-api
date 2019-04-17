import {
  Module,
  MiddlewareConsumer,
  RequestMethod,
  OnModuleInit,
} from '@nestjs/common'
import {
  WorkshopsController,
  AuthController,
  FacilitatorsController,
  AffiliatesController,
  SupportController,
} from './controllers'
import {
  AuthMiddleware,
  IsValidMiddleware,
  IsAFManMiddleware,
  RouteLoggerMiddleware,
} from './middleware'
import {
  CacheService,
  AuthService,
  WorkshopsService,
  FacilitatorsService,
  AffiliatesService,
  MailerService,
  SupportService,
} from './components'
import { salesforceServiceProvider } from './components/salesforce/new-salesforce.component'
import { MulterFactory } from './factories'
import { SalesforceIdValidator } from './validators/SalesforceId.validator'
import { RecordTypeService } from './components/recordtype/RecordType.component'
import ensureRoleServiceProvider from './providers/ensureroleservice.provider'
import { EnsureRoleService } from './components/ensurerole.component'

/**
 * The NestJS application module ties together the controllers and components. It also configures any nest middleware.
 *
 * @export
 * @class ApplicationModule
 */
@Module({
  controllers: [
    WorkshopsController,
    AuthController,
    FacilitatorsController,
    AffiliatesController,
    SupportController,
  ],
  providers: [
    SalesforceIdValidator,
    AuthMiddleware,
    CacheService,
    AuthService,
    WorkshopsService,
    FacilitatorsService,
    AffiliatesService,
    MailerService,
    MulterFactory,
    SupportService,
    salesforceServiceProvider,
    RecordTypeService,
    ensureRoleServiceProvider,
  ],
})
export class ApplicationModule implements OnModuleInit {
  onModuleInit() {
    const ensure = new EnsureRoleService()
    return ensure.init()
  }
  // FIXME: auth, user injection, permissions should be done by decorators not middleware
  configure(consumer: MiddlewareConsumer) {
    if (process.env.DEBUG_ROUTES === 'true') {
      consumer
        .apply(RouteLoggerMiddleware)
        .forRoutes(
          WorkshopsController,
          AuthController,
          AffiliatesController,
          FacilitatorsController
        )
    }

    // Protect all routes that must have a user logged in
    consumer
      .apply(IsValidMiddleware)
      .forRoutes(
        FacilitatorsController,
        { path: '/workshops/a*', method: RequestMethod.ALL },
        { path: '/workshops/search', method: RequestMethod.ALL },
        { path: '/workshops/describe', method: RequestMethod.ALL },
        { path: '/auth/logout', method: RequestMethod.ALL },
        { path: '/auth/valid', method: RequestMethod.ALL },
        { path: '/auth/changepassword', method: RequestMethod.ALL },
        { path: '/affiliates/*', method: RequestMethod.ALL },
        { path: '/affiliates*', method: RequestMethod.POST },
        { path: '/affiliates*', method: RequestMethod.PUT },
        { path: '/affiliates*', method: RequestMethod.DELETE }
      )

    // Protect all routes that require a read on the Affiliate
    consumer
      .apply(AuthMiddleware)
      .with(1, 'affiliate -- ')
      .forRoutes(
        { path: '/facilitators', method: RequestMethod.GET },
        { path: '/facilitators/0*', method: RequestMethod.GET },
        { path: '/affiliates/*', method: RequestMethod.GET }
      )

    // Protect all routes that require the user to be an Affiliate Manager
    consumer
      .apply(IsAFManMiddleware)
      .forRoutes(
        { path: '/facilitators', method: RequestMethod.POST },
        { path: '/facilitators/*', method: RequestMethod.POST },
        { path: '/facilitators*', method: RequestMethod.PUT },
        { path: '/facilitators*', method: RequestMethod.DELETE },
        { path: '/affiliates*', method: RequestMethod.POST },
        { path: '/affiliates*', method: RequestMethod.PUT },
        { path: '/affiliates*', method: RequestMethod.DELETE },
        { path: '/auth/loginas', method: RequestMethod.ALL }
      )

    // Protect all routes that require workshop creation permissions
    consumer
      .apply(AuthMiddleware)
      .with(2, 'workshops -- ')
      .forRoutes({ path: '/workshops', method: RequestMethod.POST })

    // Protect all routes that require read permissions for a workshop
    consumer
      .apply(AuthMiddleware)
      .with(1)
      .forRoutes({ path: '/workshops/a*', method: RequestMethod.GET })

    // Protect all routes that require write permissions for a workshop
    consumer
      .apply(AuthMiddleware)
      .with(2)
      .forRoutes(
        { path: '/workshops/a*', method: RequestMethod.POST },
        { path: '/workshops/a*', method: RequestMethod.PUT },
        { path: '/workshops/a*', method: RequestMethod.DELETE }
      )
  }
}
