import { Provider } from '@nestjs/common'
import { EnsureRoleService } from '../components/ensurerole.component'
import { AuthService } from '../components'

export const provider: Provider = {
  provide: EnsureRoleService,
  useFactory: async (authService: AuthService) => {
    const service = new EnsureRoleService(authService)
    await service.init()
    return service
  },
  inject: [AuthService],
}
export default provider
