import { NestFactory } from '@nestjs/core'
import { ApplicationModule } from './app.module'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { loggerFactory } from './factories/logger.factory'
import { ValidationPipe } from '@nestjs/common'

const port = process.env.PORT || 3000
const log = loggerFactory()

if (!process.env.AUTH_API || !process.env.SF_API || !process.env.EMAIL_PASS) {
  // tslint:disable-next-line:max-line-length
  log.error(
    `Environment variables missing. AUTH: ${process.env.AUTH_API}; SF: ${
      process.env.SF_API
    }; EMAIL_PASS: ${process.env.EMAIL_PASS}`,
  )
  process.exit(1)
}

// Set up CORS whitelist
let whitelist = [
  'https://affiliates.shingo.org',
  'http://affiliates.shingo.org',
  'https://beta-affiliates.shingo.org',
  'http://shingo.org',
  'https://shingo.org',
  'http://www.shingo.org',
  'https://www.shingo.org',
]

if (process.env.NODE_ENV !== 'production') {
  whitelist = whitelist.concat([
    'http://localhost:4200',
    'https://localhost',
    'https://api.shingo.org',
  ])
}

// Set up ExpressJS Server
const server = express()

// Set up CORS using specified options
server.use(
  cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV !== 'production') return callback(null, true)

      if (whitelist.indexOf(origin) > -1) {
        log.debug("Setting 'Access-Control-Allow-Origin' to %s", origin)
        callback(null, true)
      } else {
        log.warn(`${origin} was not in the whitelist: %j`, whitelist)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  }),
)

// Set up bodyParser to handle json and urlencoded bodies
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: false }))

// Initialize the NestJS application and start the server
const bootstrap = async () => {
  const app = await NestFactory.create(ApplicationModule, server)
  app.setGlobalPrefix(process.env.GLOBAL_PREFIX || '')
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  )
  app
    .listen(port)
    .then(() => log.info(`Application is listening on port ${port}`))
}

bootstrap().catch(error => {
  log.error('Error in lifting application!')
  log.error(error)
  process.exit(1)
})
