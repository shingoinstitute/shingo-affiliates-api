import {
    Controller,
    Get, Post, Put, Delete,
    HttpStatus, Request, Response, Next,
    Param, Query, Headers, Body, Session
} from '@nestjs/common';
import { SalesforceService, CacheService, AuthService, FacilitatorsService } from '../../components';
import { BaseController } from '../base.controller';
import { checkRequired } from '../../validators/objKeyValidator';
import * as _ from 'lodash';

/**
 * @desc Controller of the REST API logic for Facilitators
 * 
 * @export
 * @class FacilitatorsController
 * @extends {BaseController}
 */
@Controller('facilitators')
export class FacilitatorsController extends BaseController {

    constructor(private facilitatorsService: FacilitatorsService) { super(); };

    /**
     * @desc <h5>GET: /facilitators</h5> Call {@link FacilitatorsService#getAll} to get a list of facilitators for given <code>'x-affiliate' || req.session.affilaite</code>
     * 
     * @param {Header} [xAffiliate=''] - Header 'x-affiliate' Used by the 'Affiliate Manager' role to specify the affiliate to query facilitators for ('' queries all affiliates).
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} Response body is JSON Array of objects of type <code>{<em>queried fields</em>}</code>
     * @memberof FacilitatorsController
     */
    @Get('')
    public async readAll( @Request() req, @Response() res, @Headers('x-affiliate') xAffiliate = '', @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        let isAfMan = false;
        for (let role of req.session.user.roles) {
            if (role.name === 'Affiliate Manager') isAfMan = true;
        }

        if (!isAfMan && !req.session.affilaite) return this.handleError(res, 'Error in FacilitatorsController.readAll(): ', { error: 'MISSING_FIELDS' }, HttpStatus.FORBIDDEN);

        try {
            const facilitators = await this.facilitatorsService.getAll(req.session.user, refresh === 'true', (isAfMan ? xAffiliate : req.session.affilaite));
            return res.status(HttpStatus.OK).json(facilitators);
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.readAll(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /facilitators/describe</h5> Calls {@link FacilitatorsService#describe} to describe Contact
     * 
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} Response body is a JSON object with the describe result
     * @memberof FacilitatorsController
     */
    @Get('/describe')
    public async describe( @Response() res, @Headers('x-force-refresh') refresh = 'false'): Promise<Response> {
        try {
            const describeObject = await this.facilitatorsService.describe(refresh === 'true');
            return res.status(HttpStatus.OK).json(describeObject);
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.describe(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /facilitators/search</h5> Calls {@link FacilitatorsService#search} to search for facilitators
     * 
     * 
     * @param {Header} search - Header 'x-search'. SOSL search expression (i.e. '*Test*')
     * @param {Header} retrieve - Header 'x-retrieve'. A comma seperated list of the Contact fields to retrieve (i.e. 'Id, Name, Email')
     * @param {Header} [refresh='false'] - Header <code>'x-force-refresh'</code>; Expected values <code>[ 'true', 'false' ]</code>; Forces cache refresh
     * @returns {Promise<Response>} Response body is a JSON Array of objects of type {<em>retrieve fields</em>}
     * @memberof FacilitatorsController
     */
    @Get('/search')
    public async search( @Request() req, @Response() res, @Headers('x-search') search, @Headers('x-retrieve') retrieve, @Headers('x-force-refresh') refresh = 'false') {
        let isAfMan = false;
        for (let role of req.session.user.roles) {
            if (role.name === 'Affiliate Manager') isAfMan = true;
        }
        if (!isAfMan && !req.session.affiliate) return this.handleError(res, 'Error in FacilitatorsController.search(): ', { error: 'MISSING_FIELDS' }, HttpStatus.BAD_REQUEST);

        // Check for required fields
        if (!search || !retrieve) return this.handleError(res, 'Error in FacilitatorsController.search(): ', { error: 'MISSING_FIELDS' }, HttpStatus.BAD_REQUEST);

        try {
            const searchRecords = await this.facilitatorsService.search(search, retrieve, (isAfMan ? '' : req.session.affiliate), refresh === 'true');
            return res.status(HttpStatus.OK).json(searchRecords);
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.search(): ', error);
        }
    }

    /**
     * @desc <h5>GET: /facilitators/<em>:id</em></h5> Calls {@link FacilitatorsService#get} to retrieve a Facilitator
     * 
     * @param {SalesforceId} id - Contact id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} Response body is a JSON object of type {<em>returned fields</em>}
     * @memberof FacilitatorsController
     */
    @Get('/:id')
    public async read( @Response() res, @Param('id') id): Promise<Response> {
        // Check the id
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in FacilitatorsController.read(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const facilitator = await this.facilitatorsService.get(id);
            return res.status(HttpStatus.OK).json(facilitator);
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.read(): ', error);
        }
    }

    /**
     * @desc <h5>POST: /facilitators</h5> Calls {@link FacilitatorsService#create} to create a new Facilitator
     * 
     * @param {Body} body - Required fields: <code>[ 'AccountId', 'FirstName', 'LastName', 'Email', 'password' ]</code><br>Optional fields: <code>[ 'roleId' ]</code>
     * @returns {Promise<Response>} Response body is a JSON object.
     * @memberof FacilitatorsController
     */
    @Post()
    public async create( @Response() res, @Body() body): Promise<Response> {
        if (!body.AccountId.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in FacilitatorsController.create(): ', { error: 'INVALID_SF_ID', message: `${body.AccountId} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        const required = checkRequired(body, ['AccountId', 'FirstName', 'LastName', 'Email', 'password']);
        if (!required.valid) return this.handleError(res, 'Error in FacilitatorsController.create(): ', { error: "MISSING_FIELDS", fields: required.missing }, HttpStatus.BAD_REQUEST);

        try {
            const result = await this.facilitatorsService.create(body);
            return res.status(HttpStatus.CREATED).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.create(): ', error);
        }
    }

    /**
     * @desc <h5>PUT: /facilitators/<em>:id</em></h5> Calls {@link FacilitatorsService#update} to update a Facilitator. If <code>body</code> contains <code>Email</code> or <code>password</code> the associated auth is also updated.
     * 
     * @param {any} body - Required fields <code>{ oneof: ['FirstName', 'LastName', 'Email', 'password', 'Biography', etc..] }</code>
     * @param {SalesforceId} id - Contact id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} Response body is status of updates and resulting SF Operation
     * @memberof FacilitatorsController
     */
    @Put('/:id')
    public async update( @Response() res, @Body() body, @Param('id') id): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in FacilitatorsController.update(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        if (!body) return this.handleError(res, 'Error in FacilitatorsController.update(): ', { error: "MISSING_FIELDS" }, HttpStatus.BAD_REQUEST);

        try {
            const result = await this.facilitatorsService.update(body);
            return res.status(HttpStatus.OK).json(result);
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.update(): ', error);
        }

    }

    /**
     * @desc <h5>DELETE: /facilitators/<em>:id</em></h5> Calls {@link FacilitatorsService#delete}, {@link FacilitatorsService#deleteAuth} or {@link FacilitatorsService#unmapAuth} to remove a facilitator from the affiliate portal
     * 
     * @param {SalesforceId} id - Contact id. match <code>/[\w\d]{15,17}/</code>
     * @param {string} [deleteAuth='true'] - Delete auth as well
     * @returns {Promise<Response>} Response is status of deletes and resulting SF Operation
     * @memberof FacilitatorsController
     */
    @Delete('/:id')
    public async delete( @Response() res, @Param('id') id, @Query('deleteAuth') deleteAuth = 'true'): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in FacilitatorsController.delete(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const record = await this.facilitatorsService.delete(id);
            let deleted = false;
            if (deleteAuth === 'true') deleted = await this.facilitatorsService.deleteAuth(id);
            else await this.facilitatorsService.unmapAuth(id);

            return res.status(HttpStatus.OK).json({ salesforce: true, auth: deleted, record });
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.delete(): ', error);
        }
    }

    /**
     * @desc <h5>DELETE: /facilitators/<em>:id</em>/login</h5> Calls {@link FacilitatorsService#deleteAuth} to delete a Facilitator's login only
     * 
     * @param {SalesforceId} id - Contact id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} Response body is result of delete
     * @memberof FacilitatorsController
     */
    @Delete('/:id/login')
    public async deleteLogin( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in FacilitatorsController.deleteLogin(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const deleted = await this.facilitatorsService.deleteAuth(id);
            return res.status(HttpStatus.OK).json({ deleted });
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.deleteLogin(): ', error);
        }
    }

    /**
     * @desc <h5>DELETE: /facilitators/<em>:id</em>/unmap</h5> Calls {@link FacilitatorsService#unmapAuth} to remove the Affiliate Portal service from a login
     * 
     * @param {SalesforceId} id - Contact id. match <code>/[\w\d]{15,17}/</code>
     * @returns {Promise<Response>} Reponse body is result of unmap
     * @memberof FacilitatorsController
     */
    @Delete('/:id/unmap')
    public async unamp( @Response() res, @Param('id') id): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in FacilitatorsController.deleteLogin(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const unmaped = await this.facilitatorsService.unmapAuth(id);
            return res.status(HttpStatus.OK).json({ unmaped });
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.unmap(): ', error);
        }
    }

    /**
     * @desc <h5>POST: /facilitators/<em>:id</em>/roles/<em>:roleId</em></h5> Calls {@link FacilitatorsService#changeRole} to change a Facilitator's role
     * 
     * @param {SalesforceId} id - Contact id. match <code>/[\w\d]{15,17}/</code>
     * @param {number} roleId - Id of the role to change too
     * @returns {Promise<Response>} Response body is result of add
     * @memberof FacilitatorsController
     */
    @Post('/:id/roles/:roleId')
    public async changeRole( @Response() res, @Param('id') id, @Param('roleId') roleId): Promise<Response> {
        if (!id.match(/[\w\d]{15,17}/)) return this.handleError(res, 'Error in FacilitatorsController.changeRole(): ', { error: 'INVALID_SF_ID', message: `${id} is not a valid Salesforce ID.` }, HttpStatus.BAD_REQUEST);

        try {
            const added = this.facilitatorsService.changeRole(id, roleId);
            return res.status(HttpStatus.OK).json({ added });
        } catch (error) {
            return this.handleError(res, 'Error in FacilitatorsController.changeRole(): ', error);
        }
    }
}