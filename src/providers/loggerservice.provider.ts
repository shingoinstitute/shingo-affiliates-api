import { Provider } from '@nestjs/common'
import { loggerFactory } from '../factories/logger.factory'

export const provider: Provider = {
  provide: 'LoggerService',
  useFactory: loggerFactory,
}
