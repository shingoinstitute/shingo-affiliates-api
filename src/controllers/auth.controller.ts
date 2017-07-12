import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import * as grpc from 'grpc';
import * as path from 'path';

const authservices = grpc.load(path.join(__dirname, '../../proto/auth_services.proto')).authservices;
const sfservices = grpc.load(path.join(__dirname, '../../proto/sf_services.proto')).sfservices;
const authClient = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());
const sfClient = new sfservices.SalesforceMicroservices('shingo-sf-api:80', grpc.credentials.createInsecure());

@Controller('auth')
export class AuthController {

    @Post('login')
    public async login(@Request() req, @Response() res, @Body() body){
        if(!body.email || !body.password) return res.status(HttpStatus.BAD_REQUEST).json({error: "MISSING_FIELDS"});

        authClient.login({email: body.email, password: body.password}, (error, user) => {
            if(error){
                if(error.metadata && error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                console.error('Error in AuthController.login(): ', error)
                if(error.error === 'INVALID_PASSWORD' || error.error === 'EMAIL_NOT_FOUND')
                    return res.status(HttpStatus.NOT_FOUND).json({error: 'INVALID_CREDENTIALS'});
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({error: 'INTERNAL_ERROR'});
            }

            if(!user.services.includes('affiliate-portal')) return res.status(HttpStatus.NOT_FOUND).json({ error: 'NOT_REGISTERED' });

            let query = {
                action: 'SELECT',
                fields: [
                    'Id',
                    'Name',
                    'FirstName',
                    'LastName',
                    'AccountId',
                    'Email'
                ],
                table: 'Contact',
                clauses: `Email='${body.email}' AND RecordType.Name='Affiliate Instructor'`
            }

            sfClient.query(query, (error, response) => {
                if(error){
                    if(error.metadata && error.metadata.get('error-bin')) error = JSON.parse(error.metadata.get('error-bin').toString());
                    if(error.error === 'INVALID_PASSWORD' || error.error === 'EMAIL_NOT_FOUND')
                        return res.status(HttpStatus.NOT_FOUND).json({error: 'INVALID_CREDENTIALS'});
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({error: 'INTERNAL_ERROR'});
                }

                console.log('response', response);

                let sfResult = JSON.parse(response.contents);

                if(sfResult.totalSize !== 1){
                    let sfError = { code: '', details: '' };
                    sfError.code = (sfResult.totalSize > 1 ? 'DUPLICATE_EMAIL' : 'INVALID_LOGIN');
                    sfError.details = (sfResult.totalSize > 1 ? `${body.email} has returned ${sfResult.totalSize} contacts in Salesforce!` : 'A Salesforce affiliate instructor could not be found for ' + body.username)
                    console.error('Error in AuthController.login(): ', { sfError });
                    return res.status(HttpStatus.BAD_REQUEST).json({ sfError });
                }

                let sfContact = sfResult.records[0];
                console.log('User has logged in: ', user);
                req.session.user = user;
                req.session.user.contact =sfContact;
                req.session.affiliate = sfContact.AccountId;
                res.status(HttpStatus.OK)
                    .json({jwt: user.jwt});
            });

        });
    }

    @Post('logout')
    public async logout(@Request() req, @Response() res, @Body() body){
        req.session.user = null;
        res.status(HttpStatus.OK).json({message: "LOGOUT_SUCCESS"});
    }

}