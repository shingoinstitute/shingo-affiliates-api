import { Provider } from '@nestjs/common'
import { EnsureRoleService } from '../components/ensurerole.component'
import { AuthClient } from '@shingo/auth-api-client'

export const provider: Provider = {
  provide: EnsureRoleService,
  useFactory: async (authService: AuthClient) => {
    const service = new EnsureRoleService(authService)
    await service.init()
    return service
  },
  inject: [AuthClient],
}
