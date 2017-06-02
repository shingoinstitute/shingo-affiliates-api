import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../auth_services.proto')).authservices;
const client = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure())

@Controller('auth')
export class AuthController {

    @Post('login')
    public async login(@Request() req, @Response() res, @Body() body){
        if(!body.username || !body.password) return res.status(HttpStatus.BAD_REQUEST).json({error: "MISSING_FIELDS"});

        client.login({username: body.username, password: body.password}, (error, user) => {
            if(error){
                console.log('Error in AuthController.login(): ', error);
                if(error.error === 'INVALID_PASSWORD' || error.error === 'EMAIL_NOT_FOUND')
                    return res.status(HttpStatus.NOT_FOUND).json({error: 'INVALID_CREDENTIALS'});
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
            }

            req.session.user = user;
            res.status(HttpStatus.OK)
                .json({jwt: user.jwt});
        });
    }

}