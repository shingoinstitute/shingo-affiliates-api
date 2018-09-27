import { Provider } from '@nestjs/common'
import { defaultPort } from '../util'
import { SalesforceClient } from '@shingo/sf-api-client'

export const provider: Provider = {
  provide: SalesforceClient,
  useFactory: () => new SalesforceClient(defaultPort(process.env.SF_API!, 80)),
}
