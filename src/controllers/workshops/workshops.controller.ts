import {
    Controller,
    Get, Post, Put, Delete,
    Param, Headers, Body, Session, Inject,
    ForbiddenException, BadRequestException,
    UseInterceptors, FileInterceptor, UploadedFile, FilesInterceptor, UploadedFiles
} from '@nestjs/common'
import { WorkshopsService } from '../../components'

import { checkRequired } from '../../validators/objKeyValidator'
import { LoggerInstance } from 'winston'
import { SalesforceIdValidator } from '../../validators/SalesforceId.validator'
import { Refresh, ArrayParam } from '../../decorators'

/**
 * @desc Controller of the REST API logic for Workshops
 *
 * @export
 * @class WorkshopsController
 */
@Controller('workshops')
export class WorkshopsController {

  constructor(
    private workshopsService: WorkshopsService,
    @Inject('LoggerService') private log: LoggerInstance
  ) { }

  /**
   * ### GET: /workshops
   * Get all workshops
   *
   * @param session Session containing the current user.
   */
  @Get()
  readAll(@Session() session) {
    if (!session.user) {
      throw new ForbiddenException('SESSION_EXPIRED')
    }

    return this.workshopsService.getAll(false, true, session.user)
  }

  /**
   * ### GET: /workshops/public
   * Get all public workshops
   *
   * @param refresh Force cache refresh
   */
  @Get('public')
  readPublic(@Refresh() refresh: boolean) {
    return this.workshopsService.getAll(true, refresh, null)
  }

  /**
   * ### GET: /workshops/describe
   * Describe the Workshop__c object
   *
   * @param refresh Force cache refresh
   */
  @Get('/describe')
  describe(@Refresh() refresh: boolean) {
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
  search(@Headers('x-search') search: string,
         @ArrayParam('retrieve') retrieve: string[],
         @Refresh() refresh: boolean) {
    if (!search || !retrieve) {
      throw new BadRequestException(
        `Missing parameters: ${!search ? 'x-search ' : ''}${!retrieve ? 'x-retrieve' : ''}`,
        'MISSING_PARAMETERS'
      )
    }

    return this.workshopsService.search(search, retrieve, refresh)
  }

  /**
   * ### GET: /workshops/:id
   * Get a workshop by Id
   *
   * @param id Workshop__c Salesforce id
   */
  @Get('/:id')
  read(@Param('id', SalesforceIdValidator) id: string) {
    return this.workshopsService.get(id).then(w => {
      this.log.debug(`GET: /workshops/${id} => %j`, w)
      return w
    })
  }

  /**
   * ### GET: /workshops/:id/faciliators
   * Get the facilitators for a workshop
   *
   * @param id Workshop__c Salesforce id
   */
  @Get('/:id/facilitators')
  facilitators(@Param('id', SalesforceIdValidator) id: string) {
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
  async create(@Body() body, @Session() session) {
    // Check required parameters
    this.log.debug('Trying to create workshop:\n%j', body)

    const valid = checkRequired(body, [
      'Organizing_Affiliate__c',
      'Start_Date__c',
      'End_Date__c',
      'Host_Site__c',
      'Event_Country__c',
      'Event_City__c',
      'Course_Manager__c',
      'facilitators',
    ])

    if (!valid.valid) {
      throw new BadRequestException(`Missing Fields: ${valid.missing.join()}`, 'MISSING_FIELD')
    }

    // Check for valid SF ID on Organizing_Affiliate\__c
    if (!body.Organizing_Affiliate__c.match(/[\w\d]{15,17}/)) {
      throw new BadRequestException(`${body.Organizing_Affiliate__c} is not a valid Salesforce ID.`, 'INVALID_SF_ID')
    }

    // Check can create for Organizing_Affiliate\__c
    if (session.user.role.name !== 'Affiliate Manager' && session.affiliate !== body.Organizing_Affiliate__c) {
      throw new ForbiddenException(
        `You are not allowed to post workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`,
        'PERM_DENIDED'
      )
    }

    return this.workshopsService.create(body).then(sfSuccess => {
      session.user.permissions.push({ resource: `/workshops/${sfSuccess.id}`, level: 2 });
      return sfSuccess
    })
  }

  /**
   * ### PUT: /workshops/:id
   * Updates a workshop based on fields. Also updates facilitator associations and permissions
   *
   * @param body Required fields [ "Id", "Organizing_Affiliate\__c" ]
   * @param session Accesses the affiliate id from the session to compare to the Organizaing_Affiliate\__c on the body
   * @param id Workshop__c salesforce id
   */
  @Put('/:id')
  update(@Param('id', SalesforceIdValidator) id: string, @Body() body, @Session() session) {
    // Check required parameters
    const required = checkRequired(body, ['Id', 'Organizing_Affiliate__c'])
    if (!required.valid) {
      throw new BadRequestException(`Missing Fields: ${required.missing.join()}`, 'MISSING_FIELD')
    }

    // Check the id
    const pattern = /[\w\d]{15,18}/
    if (!pattern.test(body.Id)
      || id !== body.Id
      || !pattern.test(body.Organizing_Affiliate__c)) {
      throw new BadRequestException(
        `${body.Organizing_Affiliate__c} or ${id} or ${body.Id} is not a valid Salesforce ID.`,
        'INVALID_SF_ID'
      )
    }

    // Check can update for Organizing_Affiliate\__c
    if (session.user.role.name !== 'Affiliate Manager' && session.affiliate !== body.Organizing_Affiliate__c) {
      throw new ForbiddenException(
        `You are not allowed to post workshops for the Affiliate with Id ${body.Organizing_Affiliate__c}`,
        'PERM_DENIDED'
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
  @UseInterceptors(FileInterceptor('attendeeList'))
  async uploadAttendeeFile(@UploadedFile() file: Express.Multer.File, @Param('id', SalesforceIdValidator) id: string) {
    const ext = file.originalname.split('.').pop()

    return this.workshopsService
      .upload(id, `attendee_list.${ext}`, [file.buffer.toString('base64')], file.mimetype)
      .then(results => results.length > 0 ? results[0] : { success: false })
  }

  /**
   * ### POST: /workshops/:id/evaluation_files
   * Upload an array of files containing workshop evaluations as attachments to the Workshop__c record in Salesforce
   *
   * @param id The record Id of the Workshop to attach the files to
   */
  @Post('/:id/evaluation_files')
  @UseInterceptors(FilesInterceptor('evaluationFiles', 30))
  uploadEvaluations(@UploadedFiles() files: Express.Multer.File[], @Param('id', SalesforceIdValidator) id: string) {
    const buffFiles = files.map(file => file.buffer.toString('base64'))
    const ext = files[0].originalname.split('.').pop()

    return this.workshopsService
      .upload(id, `evaluation.${ext}`, buffFiles, files[0].mimetype)
      .then(results =>
            results.length > 0 && results.every(r => r.success)
              ? results[0]
              : results.find(r => !r.success) || { success: false }
          )
  }

  /**
   * ### DELETE: /workshops/:id
   * Deletes the workshop identified by :id
   *
   * @param id Workshop__c id
   */
  @Delete('/:id')
  async delete(@Param('id', SalesforceIdValidator) id: string) {
    return this.workshopsService.delete(id)
  }

  @Put('/:id/cancel')
  async cancel(@Param('id', SalesforceIdValidator) id: string, @Body() body) {
    const required = checkRequired(body, ['reason'])
    if (!required.valid) {
      throw new BadRequestException(`Missing Fields: ${required.missing.join()}`, 'MISSING_FIELD')
    }

    return this.workshopsService.cancel(id, body.reason)
  }

}
