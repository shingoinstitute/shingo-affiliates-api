import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import { FacilitatorEmitter, FacilitatorAddedEvent } from '../events';
import * as NodeCache from 'node-cache';
import * as hash from 'object-hash';
import * as grpc from 'grpc';
import * as path from 'path';
import * as _ from 'lodash';

const authservices = grpc.load(path.join(__dirname, '../../proto/auth_services.proto')).authservices;
const sfservices = grpc.load(path.join(__dirname, '../../proto/sf_services.proto')).sfservices;
const authClient = new authservices.AuthServices('shingo-auth-api:80', grpc.credentials.createInsecure());
const sfClient = new sfservices.SalesforceMicroservices('shingo-sf-api:80', grpc.credentials.createInsecure());

/**
 * @desc :: Used for an in-memory cache (stdTTL = 30min, check for cleanup every 15min)
 */
const cache = new NodeCache({ stdTTL: 1800, checkperiod: 900 });

@Controller('facilitators')
export class FacilitatorsController {

    @Get('')
    public async readAll(@Request() req, @Response() res, @Body() body, @Headers('x-force-refresh') refresh = 'false'){
        const affiliate = (req.session.user.role.name === 'Affiliate Manager' ? req.headers['x-affiliate'] : req.session.affiliate);
        let query = {
            action: "SELECT",
            fields: [
                "Id",
                "FirstName",
                "LastName",
                "Email",
                "Title",
                "Account.Id",
                "Account.Name",
                "Facilitator_For__r.Id",
                "Facilitator_For__r.Name",
                "Photograph__c",
                "Biography__c"
            ],
            table: "Contact",
            clauses: `RecordType.Name='Affiliate Instructor'`
        }

        if(affiliate != '' && affiliate !== undefined) query.clauses += ` AND Facilitator_For__c='${affiliate}'`;
        else if(req.session.user.role.name !== 'Affiliate Manager') return res.status(HttpStatus.BAD_REQUEST).json({error: 'MISSING_FIELD'});

        const key = hash(query);

        const cachedResult = cache.get(key);

        if(cachedResult === undefined || refresh === 'true'){
            sfClient.query(query, (error, response) => {
                if(error){
                    console.error('Error in FacilitatorsController.readAll(): ', error)
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ 
                            error: JSON.parse(error.metadata.get('error-bin').toString())
                        });
                }
                // Send records to caller
                let records = JSON.parse(response.contents);
                res.status(HttpStatus.OK).json(records);

                // Cache records
                records.cached = new Date().toISOString();
                const success = cache.set(key, records);
                if(!success) console.error("Response could not be cached!");
            });
        } else {
            res.status(HttpStatus.OK)
                .json(cachedResult);
        }
    }

    @Get('/describe')
    public async describe(@Request() req, @Response() res, @Next() next, @Headers('x-force-refresh') refresh = 'false'){
        // Set the key for the cache
        const key = 'describeContacts';

        // Get the cached result (if exists)
        const cachedResult = cache.get(key)

        // If no cached result, use the shingo-sf-api to get the result
        if(cachedResult === undefined || refresh ===  'true'){
            sfClient.describe({object: 'Contact'}, (error, results) => {
                if(error){
                    console.error('Error in FacilitatorsController.describe(): ', error)
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ 
                            error: JSON.parse(error.metadata.get('error-bin').toString())
                        });
                }

                // Send records to caller
                let records = JSON.parse(results.contents);
                res.status(HttpStatus.OK).json(records);

                // Cache records
                records.cached = new Date().toISOString();
                const success = cache.set(key, records);
                if(!success) console.error("Response could not be cached!");
            });
        }
        // else return the cachedResult
        else {
            res.status(HttpStatus.OK)
            .json(cachedResult)
        }
    }

    @Get('/search')
    public async search(@Request() req, @Response() res, @Next() next, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false'){
         // Check for required fields
        if(!search || !retrieve){
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing ' + (!search && !retrieve ? 'search and retrieve ' : !search ? 'search' : 'retrieve') + ' parameters!'})
        }

        // Generate the data parameter for the RPC call
        const data = {
            search: `{${search}}`,
            retrieve: `Contact(${retrieve}, AccountId, RecordType.Name)`
        }

        // Create the cache key based on the hash of the data
        const key = hash(data)

        // Get the cached result (if exists)
        const cachedResult = cache.get(key)

        // If no cached result, use the shingo-sf-api to get result
        if(cachedResult === undefined || refresh === 'true'){
            sfClient.search(data, (error, results) => {
                if(error){
                    console.error('Error in FacilitatorsController.search(): ', error)
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ 
                            error: JSON.parse(error.metadata.get('error-bin').toString())
                        });
                }


                // Send records to caller
                let records = JSON.parse(results.contents).searchRecords.filter(contact => { return contact.RecordType.Name === 'Affiliate Instructor' });
                if(req.session.user.role.name !== 'Affiliate Manager' || req.headers['x-affiliate']) records = records.filter(contact => { return contact.AccountId === (req.headers['x-affiliate'] === undefined ? req.session.affiliate : req.headers['x-affiliate'])})
                res.status(HttpStatus.OK).json(records);

                // Cache records
                records.cached = new Date().toISOString();
                const success = cache.set(key, records);
                if(!success) console.error("Response could not be cached!");
            });
        }
        // else return the cached result
        else {
            res.status(HttpStatus.OK)
            .json(cachedResult)
        }
    }

    @Get('/:id')
    public async read(@Request() req, @Response() res, @Next() next, @Param('id') id){
        // Check the id
        const pattern = /[\w\d]{14,17}/;
        if(!pattern.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${id}`})
        }

        // Create the data parameter for the RPC call
        const data = {
            object: 'Contact',
            ids: [id]
        }

        sfClient.retrieve(data, (error, results) => {
            if(error){
                console.error('Error in FacilitatorsController.read(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            // Send records to caller
            let record = JSON.parse(results.contents)[0];
            return res.status(HttpStatus.OK).json(record);
        });
    }

    @Post()
    public async create(@Request() req, @Response() res, @Next() next, @Body() body){
        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(body.AccountId)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`})
        }

        if(!body.AccountId || !body.FirstName || !body.LastName || !body.Email || !body.password) {
            let fields = new Array<String>();
            if(!body.AccountId) fields.push("AccountId");
            if(!body.FirstName) fields.push("FirstName");
            if(!body.LastName) fields.push("LastName");
            if(!body.Email) fields.push("Email");
            if(!body.password) fields.push("password");
            return res.status(HttpStatus.BAD_REQUEST).json({ error:"MISSING_FIELDS", fields });
        }


        const roleId = (body.roleId ? body.roleId : global['facilitatorId']);

        let contact = _.omit(body, [ "password", "roleId" ]);

        contact.RecordTypeId = '012A0000000zpqrIAA';
        const data = {
            object: 'Contact',
            records: [ { contents: JSON.stringify(contact)}]
        }
        sfClient.create(data, (error, result) => {
            if(error){
                console.error('Error in FacilitatorsController.create(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ error: JSON.parse(error.metadata.get('error-bin').toString()) });
            }

            const record = JSON.parse(result.contents)[0];

            authClient.createUser({email: body.Email, password: body.password, services: 'affiliate-portal'}, (error, user) => {
                if(error){
                    console.error('Error in FacilitatorsController.create(): ~ln 234', error);
                    return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({ error });
                }

                authClient.addRoleToUser({userEmail: user.email, roleId}, (error, added) => {
                    if(error) {
                        console.error('Error in FacilitatorsController.create(): ~ln 241', error);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .json({ error });
                    }
                    
                    if(!added.response) return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({error: 'ROLE_NOT_ADDED'});

                    return res.status(HttpStatus.CREATED).json({ jwt: user.jwt, id: user.id });
                });
            });
        });
    }

    // @Put('/:id')
    // public async update(@Request() req, @Response() res, @Next() next, @Body() body, @Param('id') id){
    //     const pattern = /[\w\d]{15,17}/;
    //     if(!pattern.test(body.AccountId)) {
    //         return res.status(HttpStatus.BAD_REQUEST)
    //             .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`})
    //     } else if(!pattern.test(id) || !pattern.test(body.Id) || id !== body.Id) {
    //         return res.status(HttpStatus.BAD_REQUEST)
    //             .json({error: `Invalid Salesforce Id: ${id}`})            
    //     }

    //     if(!body.AccountId || !body.FirstName || !body.LastName || !body.Email || !body.password) {
    //         let fields = new Array<String>();
    //         if(!body.AccountId) fields.push("AccountId");
    //         if(!body.FirstName) fields.push("FirstName");
    //         if(!body.LastName) fields.push("LastName");
    //         if(!body.Email) fields.push("Email");
    //         if(!body.password) fields.push("password");
    //         return res.status(HttpStatus.BAD_REQUEST).json({ error:"MISSING_FIELDS", fields });
    //     }

    //     let contact = _.omit(body, [ "password" ]);

    //     const data = {
    //         object: 'Contact',
    //         records: [ { contents: JSON.stringify(contact)}]
    //     }
    //     sfClient.update(data, (error, result) => {
    //         if(error){
    //             console.error('Error in FacilitatorsController.create(): ', error)
    //             return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
    //                 .json({ error: JSON.parse(error.metadata.get('error-bin').toString()) });
    //         }

    //         const record = JSON.parse(result.contents)[0];
    //     })
    // }

    // @Delete('/:id')
    // public async delete(@Request() req, @Response() res, @Next() next, @Param('id') id) {
    //     const pattern = /[\w\d]{15,17}/;
    //     if(!pattern.test(body.AccountId)) {
    //         return res.status(HttpStatus.BAD_REQUEST)
    //         .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`})
    //     }

    //     // Create the data parameter for the RPC call
    //     const data = {
    //         object: 'Contact',
    //         ids: [id]
    //     }
    //     sfClient.delete(data, (error, response) => {
    //         if(error){
    //             console.error('Error in FacilitatorsController.delete(): ', error)
    //             return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
    //                 .json({ 
    //                     error: JSON.parse(error.metadata.get('error-bin').toString())
    //                 });
    //         }

    //         authClient.deleteUserByEmail({username: })

    //         const record = JSON.parse(response.contents)[0];
    //         FacilitatorEmitter.emitter.emit('deleted', new FacilitatorDeletedEvent(record.id));
    //         return res.status(HttpStatus.OK).json(record);
    //     })
    // }
}