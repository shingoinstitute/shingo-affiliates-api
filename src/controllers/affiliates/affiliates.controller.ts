import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Inject,
  ForbiddenException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common'
import { AffiliatesService } from '../../components'

import { LoggerInstance } from 'winston'
import {
  Refresh,
  ArrayParam,
  BooleanParam,
  StringParam,
  User,
  IsAffiliateManager,
  Permission,
} from '../../decorators'
import { RequiredValidator, SalesforceIdValidator } from '../../validators'
import { missingParam, isAffiliateManager } from '../../util'
import { CreateBody, MapBody, UpdateBody } from './affiliateInterfaces'
import { AuthGuard, RoleGuard, PermissionGuard } from '../../guards'
import { AuthUser } from '../../guards/auth.guard'

/**
 * Controller of the REST API logic for Affiliates
 */
@Controller('affiliates')
export class AffiliatesController {
  constructor(
    private affService: AffiliatesService,
    @Inject('LoggerService') private log: LoggerInstance,
  ) {}

  /**
   * ## GET: /affiliates
   * Gets a list of affiliates
   *
   * @param isPublic Should public affiliates be returned
   * @param refresh Force cache reset
   */
  @Get()
  @UseGuards(AuthGuard)
  async readAll(
    @User() user: AuthUser,
    @BooleanParam({ query: 'isPublic', header: 'is-public' })
    isPublic: boolean | undefined,
    @Refresh() refresh: boolean | undefined,
  ) {
    if (!isPublic && (!user || !isAffiliateManager(user))) {
      throw new ForbiddenException('', 'NOT_AFFILIATE_MANAGER')
    }

    return this.affService.getAll(isPublic, refresh)
  }

  /**
   * ### GET: /affiliates/describe
   * Describe the salesforce Account object
   *
   * @param refresh Force cache refresh
   */
  @Get('/describe')
  describe(@Refresh() refresh: boolean | undefined) {
    return this.affService.describe(refresh)
  }

  /**
   * ### GET: /affiliates/search
   * Returns an array of affiliates that match search criteria
   *
   * @param search SOSL search expresssion found in header 'x-search'
   * @param retrieve a comma separated list of fields to retrieve found in header 'x-retrieve'
   * @param refresh Force cache refresh using header
   */
  @Get('/search')
  @UseGuards(AuthGuard)
  async search(
    @StringParam('search', new RequiredValidator(missingParam('search')))
    search: string,
    @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve')))
    retrieve: string[],
    @Refresh() refresh: boolean | undefined,
  ) {
    return this.affService.search(search, retrieve, refresh)
  }

  /**
   * ### GET: /affiliates/:id/coursemanagers
   * Search the related contacts of an Affiliate
   *
   * @param id - The Salesforce Id of the affiliate
   * @param search SOSL search expresssion found in header 'x-search'
   * @param retrieve a comma separated list of fields to retrieve found in header 'x-retrieve'
   * @param refresh Force cache refresh using header
   */
  @Get('/:id/coursemanagers')
  @Permission([1, 'affiliate -- '])
  @UseGuards(AuthGuard, PermissionGuard)
  searchCMS(
    @Param('id', SalesforceIdValidator) id: string,
    @StringParam('search', new RequiredValidator(missingParam('search')))
    search: string,
    @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve')))
    retrieve: string[],
    @Refresh() refresh: boolean | undefined,
  ) {
    return this.affService.searchCM(id, search, retrieve, refresh)
  }

  /**
   * ### GET: /affiliates/:id
   * Retrieves a specific affiliate
   *
   * @param id - Account id. match <code>/[\w\d]{15,17}/</code>
   */
  @Get(':id')
  @Permission([1, 'affiliate -- '])
  @UseGuards(AuthGuard, PermissionGuard)
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
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  create(@Body() body: CreateBody) {
    return this.affService.create(body)
  }

  /**
   * ### POST: /affiliates/:id/map
   * Creates permissions for a Licensed Affiliate Account
   *
   * @param id Account id. match <code>/[\w\d]{15,17}/</code>
   */
  @Post(':id/map')
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async map(
    @Param('id', SalesforceIdValidator) id: string,
    @Body() affiliate: MapBody,
  ) {
    if (id !== affiliate.Id) {
      throw new BadRequestException(
        `Parameter id ${id} does not match field Id ${affiliate.Id}`,
        'INVALID_SF_ID',
      )
    }
    await this.affService.map(affiliate.Id)
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
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  update(
    @Body() body: UpdateBody,
    @Param('id', SalesforceIdValidator) id: string,
  ) {
    if (id !== body.Id) {
      throw new BadRequestException(
        `Parameter id ${id} does not match field Id ${body.Id}`,
        'INVALID_SF_ID',
      )
    }

    if (body.hasOwnProperty('Summary__c')) {
      delete body.Summary__c
      // tslint:disable-next-line:max-line-length
      this.log.warn(
        '\nClient attempted to update Biography field on Affiliate. Biography/Summary field must be updated through salesforce until this functionality is built into the affiliate portal.\n',
      )
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
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  delete(@Param('id', SalesforceIdValidator) id: string) {
    return this.affService.delete(id)
  }
}
