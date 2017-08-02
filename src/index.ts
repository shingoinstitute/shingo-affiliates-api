import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { InitService } from './initService';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';
import * as cors from 'cors';

const port = process.env.PORT || 3000

const server = express();
const whitelist = ['http://localhost:4200', 'https://localhost', 'http://172.18.0.5'];
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) callback(null, true);
        else {
            console.error('CORS ERROR for origin', origin);
            callback(new Error('Not allowed by CORS'));
        }
    }
}
server.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", `true`);
    res.header("Access-Control-Allow-Origin", `${whitelist.join()}`);
    next();
});
server.use(cors(corsOptions));
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: false }));
server.use(session({
    secret: process.env.SESSION_SECRET || 'ilikedogz',
    resave: true,
    saveUninitialized: true,
    proxy: true
}))

InitService.init()
    .then(() => {
        const app = NestFactory.create(ApplicationModule, server);
        app.listen(port, () => console.log(`Application is listening on port ${port}`));
    })
    .catch(error => {
        console.error('Error in lifting application!', error);
    });