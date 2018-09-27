import { Provider } from '@nestjs/common'
import { AuthClient } from '@shingo/auth-api-client'
import { defaultPort } from '../util'

export const provider: Provider = {
  provide: AuthClient,
  useFactory: () => new AuthClient(defaultPort(process.env.AUTH_API!, 80)),
}
