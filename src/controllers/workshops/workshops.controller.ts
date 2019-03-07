import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param as UrlParam,
  Body,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  FileInterceptor,
  UploadedFile,
  FilesInterceptor,
  UploadedFiles,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { WorkshopsService } from '../../components'

import {
  Refresh,
  ArrayParam,
  StringParam,
  Permission,
  User,
  RefreshParam,
} from '../../decorators'
import { RequiredValidator, SalesforceIdValidator } from '../../validators'
import {
  missingParam,
  isAffiliateManager,
  CurrUser,
  UrlParam as UrlParamType,
  Body as BodyType,
  RouteMetadata,
  Files,
} from '../../util'
import { CancelBody, UpdateBody, CreateBody } from './workshopInterfaces'
import { AuthUser } from '../../guards/auth.guard'
import { PermissionGuard, AuthGuard } from '../../guards'
import { Param as ParamType } from '../../decorators/ParamOptions.interface'
import { Workshop__c } from '../../sf-interfaces/Workshop__c.interface'

/**
 * @desc Controller of the REST API logic for Workshops
 *
 * @export
 * @class WorkshopsController
 */
@Controller('workshops')
export class WorkshopsController {
  constructor(private workshopsService: WorkshopsService) {}

  /**
   * ### GET: /workshops
   * Get all workshops
   *
   * @param user The current user.
   */
  @Get()
  @UseGuards(AuthGuard)
  readAll(
    @User() user: CurrUser<AuthUser>,
    _metadata: RouteMetadata<{
      route: '/workshops'
      auth: true
      method: 'GET'
    }>,
  ) {
    if (!user) {
      throw new ForbiddenException('SESSION_EXPIRED')
    }

    return this.workshopsService.getAll(true, user)
  }

  /**
   * ### GET: /workshops/public
   * Get all public workshops
   *
   * @param refresh Force cache refresh
   */
  @Get('public')
  readPublic(
    @Refresh() refresh: RefreshParam<boolean | undefined>,
    _metadata: RouteMetadata<{
      route: '/workshops/public'
      auth: false
      method: 'GET'
    }>,
  ) {
    return this.workshopsService.getAll(refresh)
  }

  /**
   * ### GET: /workshops/describe
   * Describe the Workshop__c object
   *
   * @param refresh Force cache refresh
   */
  @Get('/describe')
  @UseGuards(AuthGuard)
  describe(
    @Refresh() refresh: RefreshParam<boolean | undefined>,
    _metadata: RouteMetadata<{
      route: '/workshops/describe'
      auth: true
      method: 'GET'
    }>,
  ) {
    return this.workshopsService.describe(refresh)
  }

  /**
   * ### GET: /workshops/search
   * Search workshops using a SOSL expression
   *
   * @param search SOSL search expresssion found in header 'x-search'
   * @param retrieve a comma separated list of fields to retrieve found in header 'x-retrieve'
   * @param refresh Force cache refresh
   */
  @Get('/search')
  @UseGuards(AuthGuard)
  search(
    @StringParam('search', new RequiredValidator(missingParam('search')))
    search: ParamType<string, 'search'>,
    @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve')))
    retrieve: ParamType<string[], 'retrieve'>,
    @Refresh() refresh: RefreshParam<boolean | undefined>,
    _metadata: RouteMetadata<{
      route: '/workshops/search'
      auth: true
      method: 'GET'
    }>,
  ) {
    return this.workshopsService.search(search, retrieve, refresh)
  }

  /**
   * ### GET: /workshops/:id
   * Get a workshop by Id
   *
   * @param id Workshop__c Salesforce id
   */
  @Get('/:id')
  @Permission([1])
  @UseGuards(AuthGuard, PermissionGuard)
  async read(
    @UrlParam('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/workshops/:id'
      auth: true
      permission: [1]
      method: 'GET'
    }>,
  ) {
    const w = await this.workshopsService.get(id)
    console.debug(`GET: /workshops/${id} => %j`, w)
    if (typeof w === 'undefined')
      throw new NotFoundException(`Workshop with id ${id} not found`)
    return w
  }

  /**
   * ### GET: /workshops/:id/faciliators
   * Get the facilitators for a workshop
   *
   * @param id Workshop__c Salesforce id
   */
  @Get('/:id/facilitators')
  @Permission([1])
  @UseGuards(AuthGuard, PermissionGuard)
  facilitators(
    @UrlParam('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/workshops/:id/facilitators'
      auth: true
      permission: [1]
      method: 'GET'
    }>,
  ) {
    return this.workshopsService.facilitators(id)
  }

  /**
   * ### POST: /workshops
   * Creates a new workshop in salesforce and adds permissions through shingo auth service
   *
   * NOTE: facilitators is exptected to be of type [{"Id", "Email"}]. Where "Id" is a Salesforce Contact Id.
   * @param body Required fields
   * ["Name","Organizing_Affiliate__c","Start_Date__c","End_Date__c",
   * "Host_Site__c","Event_Country__c","Event_City__c","facilitators"]
   * @param session Accesses the affiliate id from the session to compare to the Organizing_Affiliate__c on the body
   */
  @Post()
  @Permission([2, 'workshops -- '])
  @UseGuards(AuthGuard, PermissionGuard)
  async create(
    @Body() body: BodyType<CreateBody & Partial<Workshop__c>>,
    @User() user: CurrUser<AuthUser>,
    _metadata: RouteMetadata<{
      route: '/workshops'
      auth: true
      permission: [[2, 'workshops -- ']]
      method: 'POST'
    }>,
  ) {
    console.debug('Trying to create workshop:\n%j', body)

    // Check can create for Organizing_Affiliate\__c
    if (
      !isAffiliateManager(user) &&
      user.sfContact.AccountId !== body.Organizing_Affiliate__c
    ) {
      throw new ForbiddenException(
        `You are not allowed to post workshops for the Affiliate with Id ${
          body.Organizing_Affiliate__c
        }`,
        'PERM_DENIDED',
      )
    }

    return this.workshopsService.create(body)
  }

  /**
   * ### PUT: /workshops/:id
   * Updates a workshop based on fields. Also updates facilitator associations and permissions
   *
   * @param body A partial workshop, with required fields [ "Id", "Organizing_Affiliate__c" ]
   * @param session Accesses the affiliate id from the session to compare to the Organizaing_Affiliate__c on the body
   * @param id Workshop__c salesforce id
   */
  @Put('/:id')
  @Permission([2])
  @UseGuards(AuthGuard, PermissionGuard)
  update(
    @UrlParam('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    @Body() body: BodyType<UpdateBody & Partial<Workshop__c>>,
    @User() user: CurrUser<AuthUser>,
    _metadata: RouteMetadata<{
      route: '/workshops/:id'
      auth: true
      permission: 2
      method: 'PUT'
    }>,
  ) {
    // Check the id
    if (id !== body.Id) {
      throw new BadRequestException(
        `id parameter ${id} does not match field Id ${body.Id}`,
        'INVALID_SF_ID',
      )
    }

    // Check can update for Organizing_Affiliate\__c
    if (
      !isAffiliateManager(user) &&
      user.sfContact.AccountId !== body.Organizing_Affiliate__c
    ) {
      throw new ForbiddenException(
        `You are not allowed to post workshops for the Affiliate with Id ${
          body.Organizing_Affiliate__c
        }`,
        'PERM_DENIDED',
      )
    }

    return this.workshopsService.update(body)
  }

  /**
   * ### POST: /workshops/:id/attendee_file
   * Uploads a file containing the attendee list as an attachment to the Workshop__c record in Salesforce
   * NOTE: Expecting attached file to be in the field attendeeList and <= 25MB in size
   *
   * @param id The record Id of the Workshop to attach the file to
   */
  @Post('/:id/attendee_file')
  @Permission([2])
  @UseGuards(AuthGuard, PermissionGuard)
  @UseInterceptors(FileInterceptor('attendeeList'))
  async uploadAttendeeFile(
    @UploadedFile() file: Files<Express.Multer.File, 'attendeeList'>,
    @UrlParam('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/workshops/:id/attendee_file'
      auth: true
      permission: [2]
      method: 'POST'
    }>,
  ) {
    const ext = file.originalname.split('.').pop()

    return this.workshopsService
      .upload(
        id,
        `attendee_list.${ext}`,
        [file.buffer.toString('base64')],
        file.mimetype,
      )
      .then(results => (results.length > 0 ? results[0] : { success: false }))
  }

  /**
   * ### POST: /workshops/:id/evaluation_files
   * Upload an array of files containing workshop evaluations as attachments to the Workshop__c record in Salesforce
   *
   * @param id The record Id of the Workshop to attach the files to
   */
  @Post('/:id/evaluation_files')
  @Permission([2])
  @UseGuards(AuthGuard, PermissionGuard)
  @UseInterceptors(FilesInterceptor('evaluationFiles', 30))
  uploadEvaluations(
    @UploadedFiles() files: Files<Express.Multer.File[], 'evaluationFiles', 30>,
    @UrlParam('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/workshops/:id/evaluation_files'
      auth: true
      permission: [2]
      method: 'POST'
    }>,
  ) {
    const buffFiles = files.map(file => file.buffer.toString('base64'))
    const ext = files[0].originalname.split('.').pop()

    return this.workshopsService
      .upload(id, `evaluation.${ext}`, buffFiles, files[0].mimetype)
      .then(
        results =>
          results.length > 0 && results.every(r => r.success)
            ? results[0]
            : results.find(r => !r.success) || { success: false },
      )
  }

  /**
   * ### DELETE: /workshops/:id
   * Deletes the workshop identified by :id
   *
   * @param id Workshop__c id
   */
  @Delete('/:id')
  @Permission([2])
  @UseGuards(AuthGuard, PermissionGuard)
  async delete(
    @UrlParam('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    _metadata: RouteMetadata<{
      route: '/workshops/:id'
      auth: true
      permission: [2]
      method: 'DELETE'
    }>,
  ) {
    return this.workshopsService.delete(id)
  }

  @Put('/:id/cancel')
  @Permission([2])
  @UseGuards(AuthGuard, PermissionGuard)
  async cancel(
    @UrlParam('id', SalesforceIdValidator) id: UrlParamType<string, 'id'>,
    @Body() body: BodyType<CancelBody>,
    _metadata: RouteMetadata<{
      route: '/workshops/:id/cancel'
      auth: true
      permission: [2]
      method: 'PUT'
    }>,
  ) {
    return this.workshopsService.cancel(id, body.reason)
  }
}
