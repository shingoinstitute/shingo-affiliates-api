import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { InitService } from './initService';
import { LoggerService } from './components';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';
import * as cors from 'cors';

const port = process.env.PORT || 3000
const log = new LoggerService();

// Set up CORS whitelist
let whitelist = ['https://affiliates.shingo.org', 'http://shingo.org', 'https://shingo.org', 'http://www.shingo.org', 'https://www.shingo.org'];
if (process.env.NODE_ENV !== 'production') whitelist = whitelist.concat(['http://localhost:4200', 'https://localhost', 'http://172.18.0.5']);

// Set up CORS options
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) callback(null, true);
        else {
            log.error('CORS ERROR for origin: %s', origin);
            callback(new Error('Not allowed by CORS'));
        }
    }
}

// Set up ExpressJS Server
const server = express();

// Add CORS Headers
server.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", `true`);
    res.header("Access-Control-Allow-Origin", `${whitelist.join()}`);
    next();
});

// Set up CORS using specified options
server.use(cors(corsOptions));

// Set up bodyParser to handle json and urlencoded bodies
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));

// Set up express-session
// TODO: Setup redis store
server.use(session({
    secret: process.env.SESSION_SECRET || 'ilikedogz',
    resave: true,
    saveUninitialized: true,
    proxy: true
}))

// Initialize the NestJS application and start the server
InitService.init()
    .then(() => {
        const app = NestFactory.create(ApplicationModule, server);
        app.listen(port, () => log.info(`Application is listening on port ${port}`));
    })
    .catch(error => {
        log.error('Error in lifting application! %j', error);
    });