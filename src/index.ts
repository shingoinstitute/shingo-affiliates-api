import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { InitService } from './initService';
import { LoggerService } from './components';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';
import * as cors from 'cors';
import * as connectRedis from 'connect-redis';

// tslint:disable-next-line:variable-name
const RedisStore = connectRedis(session);

const port = process.env.PORT || 3000;
const log = new LoggerService();

// Set up CORS whitelist
const whitelist = process.env.NODE_ENV === 'production' ? /^(.*)\.shingo\.org$/ : /(.*)/;

// Set up ExpressJS Server
const server = express();

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (whitelist.test(origin || '')) {
            log.debug('Setting \'Access-Control-Allow-Origin\' to %s', origin);
            callback(null, true);
        } else {
            log.warn(`${origin} was not in the whitelist`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true
};

// Set up CORS using specified options
server.use(cors(corsOptions));

// Set up bodyParser to handle json and urlencoded bodies
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));

// Set up express-session
const options: any = {
    secret: process.env.SESSION_SECRET || 'ilikedogz',
    resave: true,
    saveUninitialized: true,
    proxy: true
};

if (process.env.SHINGO_REDIS) {
    options.store = new RedisStore({
        host: process.env.SHINGO_REDIS,
        port: 6379
    });
}

server.use(session(options));

// Initialize the NestJS application and start the server
InitService.init()
    .then(() => {
        const app = NestFactory.create(ApplicationModule, server);
        app.setGlobalPrefix(`${process.env.GLOBAL_PREFIX}`);
        app.listen(port, () => log.info(`Application is listening on port ${port}`));
    })
    .catch(error => {
        log.error('Error in lifting application!');
        log.error(JSON.stringify(error, null, 3));

    });
