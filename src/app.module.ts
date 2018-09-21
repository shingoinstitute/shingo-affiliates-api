import { Module, MiddlewareConsumer, OnModuleInit } from '@nestjs/common'
import {
  WorkshopsController,
  AuthController,
  FacilitatorsController,
  AffiliatesController,
  SupportController,
} from './controllers'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient } from '@shingo/auth-api-client'
import { RouteLoggerMiddleware } from './middleware'
import {
  CacheService,
  WorkshopsService,
  FacilitatorsService,
  AffiliatesService,
  SupportService,
} from './components'
import { mailerFactory } from './factories/mailer.factory'
import { loggerFactory } from './factories/logger.factory'
import { defaultPort } from './util'
import { SalesforceIdValidator } from './validators/SalesforceId.validator'
import { PermissionGuard, AuthGuard, RoleGuard } from './guards'
import { EnsureRoleService } from './components/ensurerole.component'
import { LoggerInstance } from 'winston'

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
    { provide: 'LoggerService', useFactory: loggerFactory },
    CacheService,
    WorkshopsService,
    FacilitatorsService,
    AffiliatesService,
    {
      provide: EnsureRoleService,
      useFactory: async (log: LoggerInstance, authService: AuthClient) => {
        const service = new EnsureRoleService(authService, log)
        await service.init()
        return service
      },
      inject: ['LoggerService', AuthClient],
    },
    {
      provide: 'MailerService',
      useFactory: () => {
        return mailerFactory(
          {
            user: 'shingo.it@aggies.usu.edu',
            pass: process.env.EMAIL_PASS!,
          },
          process.env.NODE_ENV !== 'production',
        )
      },
    },
    SupportService,
    {
      provide: AuthClient,
      useFactory: () => new AuthClient(defaultPort(process.env.AUTH_API!, 80)),
    },
    {
      provide: SalesforceClient,
      useFactory: () =>
        new SalesforceClient(defaultPort(process.env.SF_API!, 80)),
    },
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
