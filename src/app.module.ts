import { Module, MiddlewareConsumer, OnModuleInit } from '@nestjs/common'
import {
  WorkshopsController,
  AuthController,
  FacilitatorsController,
  AffiliatesController,
  SupportController,
} from './controllers'
import { RouteLoggerMiddleware } from './middleware'
import {
  CacheService,
  WorkshopsService,
  FacilitatorsService,
  AffiliatesService,
  SupportService,
} from './components'
import { SalesforceIdValidator } from './validators/SalesforceId.validator'
import { PermissionGuard, AuthGuard, RoleGuard } from './guards'
import { EnsureRoleService } from './components/ensurerole.component'
import {
  EnsureRoleServiceProvider,
  MailerServiceProvider,
  AuthClientProvider,
} from './providers'
import { salesforceServiceProvider } from './components/salesforce.component'

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
    AuthGuard,
    PermissionGuard,
    RoleGuard,
    CacheService,
    WorkshopsService,
    FacilitatorsService,
    AffiliatesService,
    EnsureRoleServiceProvider,
    MailerServiceProvider,
    SupportService,
    AuthClientProvider,
    salesforceServiceProvider,
  ],
})
export class ApplicationModule implements OnModuleInit {
  onModuleInit() {
    const ensure = new EnsureRoleService()
    return ensure.init()
  }

  configure(consumer: MiddlewareConsumer) {
    if (process.env.DEBUG_ROUTES === 'true') {
      consumer
        .apply(RouteLoggerMiddleware)
        .forRoutes(
          WorkshopsController,
          AuthController,
          AffiliatesController,
          FacilitatorsController,
        )
    }
  }
}
