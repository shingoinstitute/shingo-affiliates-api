import { Controller, Get, Post, Put, Delete,
  Param, Query, Headers, Body, Session,
  Inject, ForbiddenException, BadRequestException } from '@nestjs/common'
import { AffiliatesService } from '../../components'

import { checkRequired } from '../../validators/objKeyValidator'
import { LoggerInstance } from 'winston'
import { SalesforceIdValidator } from '../../validators/SalesforceId.validator'

/**
 * Controller of the REST API logic for Affiliates
 */
@Controller('affiliates')
export class AffiliatesController {

  constructor(
    private affService: AffiliatesService,
    @Inject('LoggerService') private log: LoggerInstance
  ) { }

  /**
   * ## GET: /affiliates
   * Gets a list of affiliates
   *
   * @param isPublicQ Should public affiliates be returned (Query parameter 'isPublic')
   * @param isPublicH Should public affiliates be returned (Header 'x-is-public')
   * @param refresh Force cache reset using header x-force-refresh
   */
  @Get()
  async readAll(
    @Session() session,
    @Query('isPublic') isPublicQ: string,
    @Headers('x-is-public') isPublicH: string,
    @Headers('x-force-refresh') refresh = 'false'
  ) {
    const isPublic = (isPublicQ === 'true' || isPublicH === 'true')
    const forceRefresh = refresh === 'true'

    if (!isPublic && (!session.user || session.user.role.name !== 'Affiliate Manager')) {
      throw new ForbiddenException('', 'NOT_AFFILIATE_MANAGER')
    }

    return this.affService.getAll(isPublic, forceRefresh)
  }

  /**
   * ### GET: /affiliates/describe
   * Describe the salesforce Account object
   *
   * @param refresh Force cache refresh using header x-force-refresh
   */
  @Get('/describe')
  describe(@Headers('x-force-refresh') refresh = 'false') {
    return this.affService.describe(refresh === 'true')
  }

  /**
   * ### GET: /affiliates/search
   * Returns an array of affiliates that match search criteria
   *
   * @param search SOSL search expresssion found in header 'x-search'
   * @param retrieve a comma separated list of fields to retrieve found in header 'x-retrieve'
   * @param refresh Force cache refresh using header x-force-refresh
   */
  @Get('/search')
  async search(@Headers('x-search') search: string,
               @Headers('x-retrieve') retrieve: string,
               @Headers('x-force-refresh') refresh = 'false') {
    // Check for required fields
    if (!search || !retrieve) {
      throw new BadRequestException(
        `Missing parameters: ${!search ? 'x-search ' : ''}${!retrieve ? 'x-retrieve' : ''}`,
        'MISSING_PARAMETERS'
      )
    }

    return this.affService.search(search, retrieve.split(',').map(r => r.trim()), refresh === 'true')
  }

  /**
   * ### GET: /affiliates/:id/coursemanagers
   * Search the related contacts of an Affiliate
   *
   * @param id - The Salesforce Id of the affiliate
   * @param search SOSL search expresssion found in header 'x-search'
   * @param retrieve a comma separated list of fields to retrieve found in header 'x-retrieve'
   * @param refresh Force cache refresh using header x-force-refresh
   */
  @Get('/:id/coursemanagers')
  searchCMS(@Param('id', SalesforceIdValidator) id: string,
            @Headers('x-search') search: string,
            @Headers('x-retrieve') retrieve: string,
            @Headers('x-force-refresh') refresh = 'false') {

    if (!search || !retrieve) {
      throw new BadRequestException(
        `Missing parameters: ${!search ? 'x-search ' : ''}${!retrieve ? 'x-retrieve' : ''}`,
        'MISSING_PARAMETERS'
      )
    }

    return this.affService.searchCM(id, search, retrieve.split(',').map(r => r.trim()), refresh === 'true')
  }

  /**
   * ### GET: /affiliates/:id
   * Retrieves a specific affiliate
   *
   * @param id - Account id. match <code>/[\w\d]{15,17}/</code>
   */
  @Get(':id')
  async read(@Param('id', SalesforceIdValidator) id: string) {
    return this.affService.get(id)
  }

  /**
   * ### POST: /affiliates
   * Creates a new affiliate
   *
   * @param body Required fields <code>[ "Name" ]</code>
   */
  @Post()
  create(@Body() body) {
    const required = checkRequired(body, ['Name'])
    if (!required.valid) {
      throw new BadRequestException(`Missing Fields: ${required.missing.join()}`, 'MISSING_FIELDS')
    }
    return this.affService.create(body)
  }

  /**
   * ### POST: /affiliates/:id/map
   * Creates permissions for a Licensed Affiliate Account
   *
   * @param id Account id. match <code>/[\w\d]{15,17}/</code>
   */
  @Post(':id/map')
  async map(@Param('id', SalesforceIdValidator) id: string, @Body() affiliate) {
    if (!affiliate.Id.match(/[\w\d]{15,18}/) || id !== affiliate.Id) {
      throw new BadRequestException(`${id} is not a valid Salesforce ID.`, 'INVALID_SF_ID')
    }
    await this.affService.map(affiliate)
    return { mapped: true }
  }

  /**
   * ### PUT: /affiliates/:id
   * Updates an affiliate
   *
   * @param body - Required fields <code>[ "Id" ]</code>
   * @param id - Account id. match <code>/[\w\d]{15,17}/</code>
   */
  @Put(':id')
  update(@Body() body, @Param('id', SalesforceIdValidator) id: string) {
    if (id !== body.Id) {
      throw new BadRequestException(`${id} is not a valid Salesforce ID.`, 'INVALID_SF_ID')
    }

    const required = checkRequired(body, ['Id'])
    if (!required.valid) {
      throw new BadRequestException(`Missing Fields: ${required.missing.join()}`, 'MISSING_FIELDS')
    }

    if (body.hasOwnProperty('Summary__c')) {
      delete body.Summary__c
      // tslint:disable-next-line:max-line-length
      this.log.warn('\nClient attempted to update Biography field on Affiliate. Biography/Summary field must be updated through salesforce until this functionality is built into the affiliate portal.\n')
    }

    return this.affService.update(body)
  }

  /**
   * ### DELETE: /affiliates/:id
   * Deletes an affiliate
   *
   * @param id - Account id. match <code>/[\w\d]{15,17}/</code>
   */
  @Delete(':id')
  delete(@Param('id', SalesforceIdValidator) id: string) {
    return this.affService.delete(id)
  }
}
