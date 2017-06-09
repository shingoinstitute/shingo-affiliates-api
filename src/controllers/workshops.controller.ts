import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import { WorkshopEmitter, WorkshopAddedEvent, WorkshopDeletedEvent } from '../events';
import * as NodeCache from 'node-cache';
import * as hash from 'object-hash';
import * as grpc from 'grpc';
import * as path from 'path';

const sfservices = grpc.load(path.join(__dirname, '../../proto/sf_services.proto')).sfservices;
const client = new sfservices.SalesforceMicroservices('shingo-sf-api:80', grpc.credentials.createInsecure());

/**
 * @desc :: Used for an in-memory cache (stdTTL = 30min, check for cleanup every 15min)
 */
const cache = new NodeCache({ stdTTL: 1800, checkperiod: 900 });

@Controller('workshops')
export class WorkshopsController {

    @Get()
    public async readAll(@Request() req, @Response() res, @Next() next, @Session() session){
        if(!session.user) return next({error: "Session Expired!"});
        let ids = [];
        session.user.permissions.forEach(p => {
            if(p.resource.includes('/workshops/')) ids.push(p.resource.replace('/workshops/', ''))
        });
        session.user.role.permissions.forEach(p => {
            if(p.resource.includes('/workshops/')) ids.push(p.resource.replace('/workshops/', ''))
        });

        // get array of unique ids
        ids = [...new Set(ids)];

        client.retrieve({object: 'Workshop__c', ids }, (error, response) => {
            if(error){
                console.error('Error in WorkshopsController.readAll(): ', JSON.parse(error.metadata.get('error-bin').toString()))
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            // Send records to caller
            let records = JSON.parse(response.contents);
            return res.status(HttpStatus.OK).json(records);
        });
    }

    @Get('/public')
    public async readPublic(@Request() req, @Response() res, @Next() next){
        let query = {
            action: "SELECT",
            fields: [
                "Id",
                "Name",
                "Host_Site__c",
                "Start_Date__c",
                "End_Date__c",
                "Event_City__c",
                "Event_Country__c",
                "Organizing_Affiliate__r.Id",
                "Organizing_Affiliate__r.Name",
                "Workshop_Type__c",
                "Registration_Website__c"
            ],
            table: "Workshop__c",
            clauses: "Public__c=true AND Status__c='Verified'"
        }

        const key = hash(query);

        const cachedResult = cache.get(key);

        if(cachedResult === undefined){
            client.query(query, (error, response) => {
                if(error){
                    console.error('Error in WorkshopsController.readPublic(): ', error)
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
        const key = 'describeWorkshops'

        // Get the cached result (if exists)
        const cachedResult = cache.get(key)

        // If no cached result, use the shingo-sf-api to get the result
        if(cachedResult === undefined || refresh ===  'true'){
            client.describe({object: 'Workshop__c'}, (error, results) => {
                if(error){
                    console.error('Error in WorkshopsController.describe(): ', error)
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
            retrieve: `Workshop__c(${retrieve})`
        }

        // Create the cache key based on the hash of the data
        const key = hash(data)

        // Get the cached result (if exists)
        const cachedResult = cache.get(key)

        // If no cached result, use the shingo-sf-api to get result
        if(cachedResult === undefined || refresh === 'true'){
            client.search(data, (error, results) => {
                if(error){
                    console.error('Error in WorkshopsController.search(): ', error)
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
        // else return the cached result
        else {
            res.status(HttpStatus.OK)
            .json(cachedResult)
        }
    }

    @Get('/:id')
    public async read(@Request() req, @Response() res, @Next() next, @Param('id') id){
        // Check the id
        const pattern = /a[\w\d]{14,17}/;
        if(!pattern.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${id}`})
        }

        // Create the data parameter for the RPC call
        const data = {
            object: 'Workshop__c',
            ids: [id]
        }

        client.retrieve(data, (error, results) => {
            if(error){
                console.error('Error in WorkshopsController.read(): ', error)
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
    public async create(@Request() req, @Response() res, @Next() next, @Body() body, @Session() session){
        // Check required parameters
        if(!session.affiliate || !body.Organizing_Affiliate__c){
            return res.status(HttpStatus.BAD_REQUEST)
                    .json({error: 'Missing Affiliate Id'});
        }

        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(body.Organizing_Affiliate__c)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`})
        }

        if(session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c){
            return res.status(HttpStatus.FORBIDDEN)
                    .json({error: `You are not allowed to post workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`});
        }

        const facilitators = body.facilitators;
        delete body.facilitators;

         // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Workshop__c',
            records: [ { contents: JSON.stringify(body) }]
        }

        client.create(data, (error, result) => {
            if(error){
                console.error('Error in WorkshopsController.create(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            const record = JSON.parse(result.contents)[0];

            WorkshopEmitter.emitter.emit('created', new WorkshopAddedEvent(record.id, body.Organizing_Affiliate__c, facilitators));
            req.session.user.permissions.push({resource: `/workshops/${record.id}`, level: 2});
            return res.status(HttpStatus.CREATED).json(record);
        });
    }

    @Put('/:id')
    public async update(@Request() req, @Response() res, @Next() next, @Param('id') id, @Body() body, @Session() session){
        // Check the id
        const pattern = /[\w\d]{15,17}/;
        if(!pattern.test(id) || !pattern.test(body.Id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing id parameter!'});
        }

        // Check required parameters
        if(!session.affiliate || !body.Organizing_Affiliate__c){
            return res.status(HttpStatus.BAD_REQUEST)
                    .json({error: 'Missing Affiliate Id'});
        }

        if(!pattern.test(body.Organizing_Affiliate__c)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: `Invalid Salesforce Id: ${body.Organizing_Affiliate__c}`});
        }

        if(session.affiliate !== 'ALL' && session.affiliate !== body.Organizing_Affiliate__c){
            return res.status(HttpStatus.FORBIDDEN)
                    .json({error: `You are not allowed to update workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`});
        }

        // Use the shingo-sf-api to create the new record
        const data = {
            object: 'Workshop__c',
            records: [ { contents: JSON.stringify(body) }]
        }
        client.update(data, (error, response) => {
            if(error){
                console.error('Error in WorkshopsController.update(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            const record = JSON.parse(response.contents)[0];
            res.status(HttpStatus.OK).json(record);
        });
    }

    @Delete('/:id')
    public async delete(@Request() req, @Response() res, @Next() next, @Param('id') id){
        // Check the id
        const reg = /a[\w\d]{14,17}/;
        if(!reg.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing id parameter!'})
        }

        // Create the data parameter for the RPC call
        const data = {
            object: 'Workshop__c',
            ids: [id]
        }
        client.delete(data, (error, response) => {
            if(error){
                console.error('Error in WorkshopsController.delete(): ', error)
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ 
                        error: JSON.parse(error.metadata.get('error-bin').toString())
                    });
            }

            const record = JSON.parse(response.contents)[0];
            WorkshopEmitter.emitter.emit('deleted', new WorkshopDeletedEvent(record.id));
            req.session.user.permissions = req.session.user.permissions.filter(permission => { return !permission.resource.includes(record.id)});
            req.session.user.role.permissions = req.session.user.role.permissions.filter(permission => { return !permission.resource.includes(record.id)});
            return res.status(HttpStatus.OK).json(record);
        })
    }

}