import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as session from 'express-session';

const port = process.env.PORT || 3000

const server = express()
server.use(bodyParser.json())
server.use(bodyParser.urlencoded({extended: false}))
server.use(session({
    secret: process.env.SESSION_SECRET || 'ilikedogz',
    resave: true,
    saveUninitialized: true,
    proxy: true
}))

const app = NestFactory.create(ApplicationModule, server);
app.listen(port, () => console.log(`Application is listening on port ${port}`));