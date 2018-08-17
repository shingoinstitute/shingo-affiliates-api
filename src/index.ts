import { NestFactory } from '@nestjs/core'
import { ApplicationModule } from './app.module'
import { InitService } from './initService'
import { LoggerService } from './components'
import express from 'express'
import bodyParser from 'body-parser'
import session from 'express-session'
import cors from 'cors'
import connectRedis from 'connect-redis'

// tslint:disable-next-line:variable-name
const RedisStore = connectRedis(session)

const port = process.env.PORT || 3000
const log = new LoggerService()

if (!process.env.AUTH_API || !process.env.SF_API) {
    log.error(`Environment variables missing. AUTH: ${process.env.AUTH_API} SF: ${process.env.SF_API}`)
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
  whitelist = whitelist.concat(['http://localhost:4200', 'https://localhost', 'https://api.shingo.org'])
}

// Set up ExpressJS Server
const server = express()

// Set up CORS using specified options
server.use(cors({
        origin: (origin, callback) => {
            if (process.env.NODE_ENV !== 'production') return callback(null, true)

            if (whitelist.indexOf(origin) > -1) {
                log.debug('Setting \'Access-Control-Allow-Origin\' to %s', origin)
                callback(null, true)
            } else {
                log.warn(`${origin} was not in the whitelist: %j`, whitelist)
                callback(new Error('Not allowed by CORS'))
            }
        },
        credentials: true,
    })
)

// Set up bodyParser to handle json and urlencoded bodies
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: false }))

// Set up express-session
const options: any = {
    secret: process.env.SESSION_SECRET || 'ilikedogz',
    resave: true,
    saveUninitialized: true,
    proxy: true,
}

if (process.env.SHINGO_REDIS) {
    options.store = new RedisStore({
        host: process.env.SHINGO_REDIS,
        port: 6379,
    })
}

server.use(session(options))

// Initialize the NestJS application and start the server
InitService.init()
    .then(async () => {
        const app = await NestFactory.create(ApplicationModule, server)
        app.setGlobalPrefix(process.env.GLOBAL_PREFIX || '/')
        app.listen(port, () => log.info(`Application is listening on port ${port}`))
    })
    .catch(error => {
        log.error('Error in lifting application!')
        log.error(error)
        process.exit(1)
    })
