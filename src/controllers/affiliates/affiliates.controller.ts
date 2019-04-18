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
  NotFoundException,
} from '@nestjs/common'
import { AffiliatesService } from '../../components'

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
import {
  missingParam,
  isAffiliateManager,
  CurrUser,
  RouteMetadata,
  RefreshParam,
  UrlParam as UrlParamType,
  Body as BodyType,
} from '../../util'
import { CreateBody, MapBody, UpdateBody } from './affiliateInterfaces'
import { AuthGuard, RoleGuard, PermissionGuard } from '../../guards'
import { AuthUser } from '../../guards/auth.guard'
import { Param as ParamType } from '../../decorators/ParamOptions.interface'

/**
 * Controller of the REST API logic for Affiliates
 */
@Controller('affiliates')
export class AffiliatesController {
  constructor(private affService: AffiliatesService) {}

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
    @User() user: CurrUser<AuthUser>,
    @BooleanParam({ query: 'isPublic', header: 'is-public' })
    isPublic: ParamType<
      boolean | undefined,
      { query: 'isPublic'; header: 'is-public' }
    >,
    @Refresh() refresh: RefreshParam<boolean | undefined>,
    // a phantom parameter - not actually used, just for type information
    // unfortunately decorators cannot currently mutate types - otherwise this would be
    // unnecessary. We must keep the information here in sync with the information in the
    // decorators
    _metadata: RouteMetadata<{
      route: '/affiliates'
      auth: true
      method: 'GET'
    }>,
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
  describe(
    @Refresh() refresh: RefreshParam<boolean | undefined>,
    _metadata: RouteMetadata<{
      route: '/affiliates/describe'
      auth: false
      method: 'GET'
    }>,
  ) {
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
    search: ParamType<string, 'search'>,
    @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve')))
    retrieve: ParamType<string[], 'retrieve'>,
    @Refresh() refresh: RefreshParam<boolean | undefined>,
    _metadata: RouteMetadata<{
      route: '/affiliates/search'
      auth: true
      method: 'GET'
    }>,
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
    @Param('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    @StringParam('search', new RequiredValidator(missingParam('search')))
    search: ParamType<string, 'search'>,
    @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve')))
    retrieve: ParamType<string[], 'retrieve'>,
    @Refresh() refresh: RefreshParam<boolean | undefined>,
    _metadata: RouteMetadata<{
      route: '/affiliates/:id/coursemanagers'
      auth: true
      permission: [[1, 'affiliate -- ']]
      method: 'GET'
    }>,
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
  async read(
    @Param('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/affiliates/:id'
      auth: true
      permission: [[1, 'affiliate -- ']]
      method: 'GET'
    }>,
  ) {
    const data = await this.affService.get(id)
    if (typeof data === 'undefined')
      throw new NotFoundException(`Affiliate with id ${id} not found`)
    return data
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
  create(
    @Body() body: BodyType<CreateBody>,
    _metadata: RouteMetadata<{
      route: '/affiliates'
      // TODO: indicate the IsAffiliateManager requirement
      auth: true
      method: 'POST'
    }>,
  ) {
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
  map(
    @Param('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    @Body() affiliate: BodyType<MapBody>,
    _metadata: RouteMetadata<{
      route: '/affiliates/:id/map'
      // TODO: indicate the IsAffiliateManager requirement
      auth: true
      method: 'POST'
    }>,
  ) {
    if (id !== affiliate.Id) {
      throw new BadRequestException(
        `Parameter id ${id} does not match field Id ${affiliate.Id}`,
        'INVALID_SF_ID',
      )
    }
    return this.affService.map(affiliate.Id).then(() => ({ mapped: true }))
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
    @Body() body: BodyType<UpdateBody>,
    @Param('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/affiliates/:id'
      // TODO: indicate the IsAffiliateManager requirement
      auth: true
      method: 'PUT'
    }>,
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
      console.warn(
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
  delete(
    @Param('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/affiliates/:id'
      // TODO: indicate the IsAffiliateManager requirement
      auth: true
      method: 'DELETE'
    }>,
  ) {
    return this.affService.delete(id)
  }
}
