import { createTransport } from 'nodemailer'

export const mailerFactory = (auth: { user: string, pass: string }, debug = false) => {
  const transport = {
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth,
    tls: {
      ciphers: 'SSLv3',
    },
    debug,
  }

  return createTransport(transport)
}
