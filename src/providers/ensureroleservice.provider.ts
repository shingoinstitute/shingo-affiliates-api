import { Provider } from '@nestjs/common'
import { EnsureRoleService } from '../components/ensurerole.component'
import { LoggerInstance } from 'winston'
import { AuthClient } from '@shingo/auth-api-client'

export const provider: Provider = {
  provide: EnsureRoleService,
  useFactory: async (log: LoggerInstance, authService: AuthClient) => {
    const service = new EnsureRoleService(authService, log)
    await service.init()
    return service
  },
  inject: ['LoggerService', AuthClient],
}
