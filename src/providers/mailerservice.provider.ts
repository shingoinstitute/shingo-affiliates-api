import { Provider } from '@nestjs/common'
import { mailerFactory } from '../factories/mailer.factory'

export const provider: Provider = {
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
}
