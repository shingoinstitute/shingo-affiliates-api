import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { InitService } from './initService';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';
import * as cors from 'cors';
import * as connectRedis from 'connect-redis';

const RedisStore = connectRedis(session);

const port = process.env.PORT || 3000

// Set up CORS whitelist
let whitelist = ['https://affiliates.shingo.org', 'http://affiliates.shingo.org', 'https://beta-affiliates.shingo.org', 'http://shingo.org', 'https://shingo.org', 'http://www.shingo.org', 'https://www.shingo.org'];

// Set up ExpressJS Server
const server = express();

const corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) > -1 || process.env.NODE_ENV !== 'production') {
            console.debug('Setting \'Access-Control-Allow-Origin\' to %s', origin);
            callback(null, true);
        } else {
            console.warn(`${origin} was not in the whitelist: %j`, whitelist);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}

// Set up CORS using specified options
server.use(cors(corsOptions));

// Set up bodyParser to handle json and urlencoded bodies
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));

// Set up express-session
let options: any = {
    secret: process.env.SESSION_SECRET || 'ilikedogz',
    resave: true,
    saveUninitialized: true,
    proxy: true
}

if (process.env.SHINGO_REDIS)
    options.store = new RedisStore({
        host: process.env.SHINGO_REDIS,
        port: 6379
    });

server.use(session(options));

// Initialize the NestJS application and start the server
InitService.init()
    .then(() => {
        const app = NestFactory.create(ApplicationModule, server);
        app.setGlobalPrefix(`${process.env.GLOBAL_PREFIX}`);
        app.listen(port, () => console.info(`Application is listening on port ${port}`));
    })
    .catch(error => {
        console.error('Error in lifting application!')
        console.error(error)
    });
