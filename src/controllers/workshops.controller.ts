import { Controller,
        Get, Post, Put, Delete,
        HttpStatus, Request, Response, Next,
        Param, Query, Headers, Body, Session
    } from '@nestjs/common';
import { Client, ClientProxy, Transport} from '@nestjs/microservices';
import * as NodeCache from 'node-cache';
import * as hash from 'object-hash';

/**
 * @desc :: Used for an in-memory cache (stdTTL = 30min, check for cleanup every 15min)
 */
const cache = new NodeCache({ stdTTL: 1800, checkperiod: 900 })

@Controller('workshops')
export class WorkshopsController {

    /**
     * RPC client to interact with the shingo-sf-api using Redis
     * 
     * @type {ClientProxy}
     * @memberof EventsController
     */
    @Client({ transport: Transport.REDIS, url: process.env.REDIS_URL || 'redis://shingo-redis:6379' })
    sfApi : ClientProxy

    @Get()
    public async readAll(@Request() req, @Response() res, @Next() next, @Session() session){
        if(!session.permissions) return next({error: "Session Expired!"});
        let ids = [];
        session.permissions.forEach(p => {
            if(p.resource.includes('/workshops/')) ids.push(p.resource.replace('/workshops/', ''))
        });
        console.log('Finding workshops: ', ids);
        this.sfApi.send({ cmd: 'retrieve' }, { object: 'Workshop__c', ids: ids })
            .subscribe(result => {
                console.log(`result for retrieve(${JSON.stringify({ids: ids})}): `, result);
                if(result.hasOwnProperty('errorCode')){
                    return res.status(HttpStatus.OK)
                              .json([]);
                }
                res.status(HttpStatus.OK)
                    .json(result);
            }, error => {
                console.error('Error in WorkshopsController.readAll(): ', error);
                next(error);
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
            const pattern = { cmd: "soql_query" };
            this.sfApi.send(pattern, query)
                .subscribe(result => {
                    res.status(HttpStatus.OK)
                        .json(result);
                    const success = cache.set(key, result)
                    if(!success) console.error("Response could not be cached!");
                }, err => {
                    console.error("Error in WorkshopsController.readPublic(): ", err);
                    next(err);
                });
        } else {
            res.status(HttpStatus.OK)
                .json(cachedResult);
        }
    }

    @Get('/search')
    public async search(@Request() req, @Response() res, @Next() next, @Headers('x-search') search, @Headers('x-retrieve') retrieve){
        // Check for required fields
        if(!search || !retrieve){
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing ' + (!search && !retrieve ? 'search and retrieve ' : !search ? 'search' : 'retrieve') + ' parameters!'})
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

        this.sfApi.send({ cmd: 'create' }, { object: 'Workshop__c', records: body})
            .subscribe(result => {
                if(result.hasOwnProperty('id')){
                    this.sfApi.send({ cmd: 'grantPermission' }, { userId: req.session.userId, resource: `/workshops/${result['id']}`, level: 2 })
                        .subscribe(r => {
                            res.status(HttpStatus.CREATED)
                                .json({ Id: result['id'] });                            
                        });
                } else if(result.hasOwnProperty('errorCode')){
                    console.error('Error in WorkshopsController.create(): ', result);
                    if(result['errorCode'] === 'REQUIRED_FIELD_MISSING'){
                        res.status(HttpStatus.BAD_REQUEST)
                            .json({error: `Missing required fields: ${JSON.stringify(result['fields'])}`})
                    } else if(result['errorCode'] === 'MALFORMED_ID'){
                        res.status(HttpStatus.BAD_REQUEST)
                            .json({error: `The following fields have a malformed or missing Salesforce Id: ${JSON.stringify(result['fields'])}`});
                    }
                } else {
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .json({error: 'Workshop not added to Salesforce!'})
                }
            });
    }

    @Put('/:id')
    public async update(@Request() req, @Response() res, @Next() next, @Param('id') id, @Body() body){
        // Check the id
        const reg = /a[\w\d]{14,17}/;
        if(!reg.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing id parameter!'})
        }
    }

    @Delete('/:id')
    public async delete(@Request() req, @Response() res, @Next() next, @Param('id') id){
        // Check the id
        const reg = /a[\w\d]{14,17}/;
        if(!reg.test(id)) {
            return res.status(HttpStatus.BAD_REQUEST)
            .json({error: 'Missing id parameter!'})
        }

        this.sfApi.send({cmd: 'delete'}, {object: 'Workshop__c', ids: id})
            .subscribe( result => {
                if(result.hasOwnProperty('errorCode')) return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({error: result})
                res.status(HttpStatus.OK)
                    .json(result);
            })

    }

}