import {
    Controller,
    Get, Post, Put, Delete,
    Param, Query, Headers, Body, Session, Inject,
    ForbiddenException, BadRequestException, InternalServerErrorException
} from '@nestjs/common'
import { FacilitatorsService } from '../../components'
import { checkRequired } from '../../validators/objKeyValidator'
import _ from 'lodash'
import generator from 'generate-password'
import { LoggerInstance } from 'winston'
import { Transporter as MailTransport } from 'nodemailer'
import { SalesforceIdValidator } from '../../validators/SalesforceId.validator'
import { Refresh, ArrayParam } from '../../decorators'

/**
 * Controller of the REST API logic for Facilitators
 */
@Controller('facilitators')
export class FacilitatorsController {

  constructor(
    private facilitatorsService: FacilitatorsService,
    @Inject('MailerService') private mailer: MailTransport,
    @Inject('LoggerService') private log: LoggerInstance
  ) { }

  /**
   * ### GET: /facilitators
   * Get a list of facilitators for given `'x-affiliate' || session.affiliate`
   *
   * @param xAffiliate Afilliate to query facilitators for from header 'x-affiliate'
   * @param refresh Force cache refresh
   */
  @Get()
  async readAll(@Session() session,
                @Headers('x-affiliate') xAffiliate = '',
                @Refresh() refresh: boolean) {
    const isAfMan = session.user && session.user.role.name === 'Affiliate Manager'

    if (!isAfMan && !session.affiliate) {
      throw new ForbiddenException('', 'MISSING_FIELDS')
    }

    return this.facilitatorsService.getAll(true, isAfMan ? xAffiliate : session.affiliate)
  }

  /**
   * ### GET: /facilitators/describe
   *
   * Describes Contact
   *
   * @param refresh Force cache refresh
   */
  @Get('/describe')
  async describe(@Refresh() refresh: boolean) {
    return this.facilitatorsService.describe(refresh)
  }

  /**
   * @desc <h5>GET: /facilitators/search</h5> Calls {@link FacilitatorsService#search} to search for facilitators
   *
   *
   * @param search SOSL search expresssion found in header 'x-search'
   * @param retrieve a comma separated list of fields to retrieve found in header 'x-retrieve'
   * @param refresh Force cache refresh
   */
  @Get('/search')
  search(@Session() session,
         @Headers('x-search') search: string,
         @ArrayParam('retrieve') retrieve: string[],
         @Headers('x-is-mapped') isMapped = 'true',
         @Refresh() refresh: boolean) {
    const isAfMan = session.user.role.name === 'Affiliate Manager'

    const mapped = !isAfMan ? 'true' : isMapped

    if (!isAfMan && !session.affiliate) {
      throw new ForbiddenException('', 'SESSION_EXPIRED')
    }

    // Check for required fields
    if (!search || !retrieve) {
      throw new BadRequestException(
        `Missing parameters: ${!search ? 'x-search ' : ''}${!retrieve ? 'x-retrieve' : ''}`,
        'MISSING_FIELDS'
      )
    }

    return this.facilitatorsService.search(
      search,
      retrieve,
      mapped === 'true',
      (isAfMan ? '' : session.affiliate), refresh
    )
  }

  /**
   * ### GET: /facilitators/:id
   * Retrieves a faciliatator
   *
   * @param id - Contact salesforce id
   */
  @Get('/:id')
  read(@Param('id', SalesforceIdValidator) id: string) {
    return this.facilitatorsService.get(id)
  }

  @Get('/resetpassword/:email')
  async resetPassword(@Param('email') email: string): Promise<
    { success: false, rejected?: string[] } |
    { success: true, accepted: string[], response: string}
  > {
    const token = await this.facilitatorsService.generateReset(email);
    return this.mailer.sendMail({
        from: 'shingo.it@usu.edu',
        to: email,
        subject: 'Password Reset -- Affiliate Portal',
        text: `Hello,

Please follow this link to reset your password:

  ${process.env.CLIENT_HOST}/resetpassword?token=${token}

If you did not request this password reset please ignore this message.
NOTE: This link expires in 30 minutes.

Thank you,

  The Shingo Institute, Home of the Shingo Prize

This message was an automated response`,
        html: `
        <p>Hello,</p>
        <p>Please follow this link to reset your password: </p>
        <p>&emsp;<a href="${process.env.CLIENT_HOST}/resetpassword?token=${token}">Reset Password</a></p>
        <p>If you did not request this password reset please ignore this message.</p>
        <p>NOTE: This link expires in 30 minutes.</p>
        <br>
        <p>Thank you,</p>
        <br>
        <p>The Shingo Institute, <em>Home of the Shingo Prize</em></p>
        <hr>
        <p>This message was an automated response.</p>
        `,
    }).then(response => {
      if (!response) return { success: false as false }
      if (response.rejected.length > 0) return { success: false as false, rejected: response.rejected }
      return { success: true as true, accepted: response.accepted, response: response.response }
    })
  }

  @Post('/resetpassword/token')
  async changePassword(@Body() body) {
    const valid = checkRequired(body, ['password', 'token']);

    if (!valid.valid) {
      throw new BadRequestException(`Missing Fields: ${valid.missing.join()}`, 'MISSING_FIELDS')
    }

    return this.facilitatorsService
      .resetPassword(body.token, body.password)
      .then(user => ({ id: user.id, email: user.email }))
  }

  /**
   * ### POST: /facilitators
   * Creates a new facilitator
   *
   * @param body Required fields: [ 'AccountId', 'FirstName', 'LastName', 'Email' ]
   * Optional fields: [ 'roleId' ]
   */
  @Post()
  async create(@Body() body) {
    const required = checkRequired(body, ['AccountId', 'FirstName', 'LastName', 'Email']);
    if (!required.valid) {
      throw new BadRequestException(`Missing Fields: ${required.missing.join()}`, 'MISSING_FIELDS')
    }

    if (!body.AccountId.match(/[\w\d]{15,17}/)) {
      throw new BadRequestException(`${body.AccountId} is not a valid Salesforce ID.`, 'INVALID_SF_ID')
    }

    try {
      body.password = generator.generate({ length: 12, numbers: true, symbols: true, uppercase: true, strict: true });
      const result = await this.facilitatorsService.create(body)

      this.mailer.sendMail({
        from: 'shingo.it@usu.edu',
        to: (process.env.NODE_ENV === 'development'
          ? 'shingo.it@usu.edu,abe.white@usu.edu' : 'shingo.coord@usu.edu'),
        subject: 'New Shingo Affiliate Portal Account',
        text: `A new account has been created for ${result.id}:${body.Email}:${body.password}.`,
        html: `A new account has been created for ${result.id}:${body.Email}:${body.password}.`,
      });

      return this.mailer.sendMail({
        from: 'shingo.it@usu.edu',
        to: body.Email,
        subject: 'New Shingo Affiliate Portal Account',
        text: `Hello ${body.FirstName} ${body.LastName},

Your account for the Shingo Affiliate Portal has been created!

Your temporary password is:

  ${body.password}

Please change it when you first log in.

Thank you,

  The Shingo Institute, Home of the Shingo Prize`,
        html: `
        <p>Hello ${body.FirstName} ${body.LastName},</p>
        <p>Your account for the Shingo Affiliate Portal has been created!</p>
        <p>Your temporary password is:</p>
        <p>&emsp;${body.password}</p>
        <p>Please change it when you first log in.</p>
        <p>Thank you,</p>
        <br>
        <p>The Shingo Institute, <em>Home of the Shingo Prize</em></p>
        <hr>
        <p>This message was an automated response.</p>`,
      }).then(() => result);

    } catch (error) {
      if (error.message && error.message.match(/(invalid login).*(prod\.outlook\.com)/gi)) {
        throw new InternalServerErrorException(
          'Invalid login for mailer - A facilitator was created but failed to send a notification email.',
          'EMAIL_NOT_SENT'
        )
      }

      throw error
    }
  }

  /**
   * ### POST: /facilitators/:id
   * Maps an existing Affiliate Instructor Contact to a new/current Auth login
   *
   * @param body Required fields: [ 'AccountId', 'Email', 'password' ]
   * Optional fields: ['roleId']
   * @param id SalesforceId of the Contact to map
   */
  @Post('/:id')
  async map(@Body() body, @Param('id', SalesforceIdValidator) id: string): Promise<Response> {
    const required = checkRequired(body, ['AccountId', 'Email']);
    if (!required.valid) {
      throw new BadRequestException(`Missing Fields: ${required.missing.join()}`, 'MISSING_FIELDS')
    }

    return this.facilitatorsService.mapContact(id, body)
  }

  /**
   * ### PUT: /facilitators/:id
   * Updates a Facilitator.
   * If `body` contains `Email` or `password` the associated auth is also updated
   *
   * @param body Required fields { ['Id'],
   * oneof: ['FirstName', 'LastName', 'Email', 'password', 'Biography__c', etc..]
   * }
   * @param id - Contact id. match <code>/[\w\d]{15,17}/</code>
   */
  @Put('/:id')
  async update(@Body() body, @Param('id', SalesforceIdValidator) id: string): Promise<Response> {
    if (!body.Id || body.Id !== id) {
      throw new BadRequestException('Missing Fields: Id', 'MISSING_FIELDS')
    }

    if (body.hasOwnProperty('Biography__c')) {
      delete body.Biography__c;
      // tslint:disable-next-line:max-line-length
      this.log.warn('Client attempted to update Biography field on Facilitator. Biography field must be updated through salesforce until this functionality is built into the affiliate portal.')
    }

    return this.facilitatorsService.update(body)
  }

  /**
   * ### DELETE: /facilitators/:id
   * Removes a facilitator from the affiliate portal
   *
   * @param id Contact salesforce id
   * @param deleteAuth Delete auth as well
   * @memberof FacilitatorsController
   */
  @Delete('/:id')
  async delete(@Param('id', SalesforceIdValidator) id: string, @Query('deleteAuth') deleteAuth = 'true') {
    const record = await this.facilitatorsService.delete(id)

    const deleted = deleteAuth === 'true'
      ? await this.facilitatorsService.deleteAuth(id)
      : false

    if (deleteAuth !== 'true') await this.facilitatorsService.unmapAuth(id)

    return { salesforce: true, auth: deleted, record }
  }

  /**
   * ### DELETE: /facilitators/:id/login
   * Deletes a faciliators login only
   *
   * @param id Contact id. match <code>/[\w\d]{15,17}/</code>
   */
  @Delete('/:id/login')
  async deleteLogin(@Param('id', SalesforceIdValidator) id: string) {
    return { deleted: await this.facilitatorsService.deleteAuth(id) }
  }

  /**
   * ### DELETE: /facilitators/:id/unmap
   * Removes the Affiliate Portal service from a login
   *
   * @param id Contact id. match <code>/[\w\d]{15,17}/</code>
   */
  @Delete('/:id/unmap')
  async unmap(@Param('id', SalesforceIdValidator) id: string) {
    return { unmaped: await this.facilitatorsService.unmapAuth(id) }
  }

  /**
   * @desc ### POST: /facilitators/:id/roles/:roleId
   * Changes a faciliatator's role
   *
   * @param id Contact id. match <code>/[\w\d]{15,17}/</code>
   * @param roleId Id of the role to change too
   */
  @Post('/:id/roles/:roleId')
  async changeRole(@Param('id', SalesforceIdValidator) id: string, @Param('roleId') roleId: string) {
    return { added: await this.facilitatorsService.changeRole(id, roleId) }
  }

}
