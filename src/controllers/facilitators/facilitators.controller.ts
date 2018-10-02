import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Inject,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common'
import { FacilitatorsService } from '../../components'
import _ from 'lodash'
import { LoggerInstance } from 'winston'
import { Transporter as MailTransport } from 'nodemailer'
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
import {
  ChangePasswordBody,
  CreateBody,
  MapBody,
  UpdateBody,
} from './facilitatorInterfaces'
import { AuthUser } from '../../guards/auth.guard'
import { RoleGuard, AuthGuard, PermissionGuard } from '../../guards'
import { stripIndent, html } from 'common-tags'

/**
 * Controller of the REST API logic for Facilitators
 */
@Controller('facilitators')
@UseGuards(AuthGuard)
export class FacilitatorsController {
  constructor(
    private facilitatorsService: FacilitatorsService,
    @Inject('MailerService') private mailer: MailTransport,
    @Inject('LoggerService') private log: LoggerInstance,
  ) {}

  /**
   * ### GET: /facilitators
   * Get a list of facilitators for given `'x-affiliate' || session.affiliate`
   *
   * @param xAffiliate Afilliate to query facilitators for from header 'x-affiliate'
   * @param refresh Force cache refresh
   */
  @Get()
  @Permission([1, 'affiliate -- '])
  @UseGuards(AuthGuard, PermissionGuard)
  async readAll(
    @User() user: AuthUser,
    @StringParam('affiliate') xAffiliate = '',
    @Refresh() refresh: boolean | undefined,
  ) {
    const isAfMan = isAffiliateManager(user)

    if (!isAfMan && !user.sfContact.AccountId) {
      throw new ForbiddenException('', 'MISSING_FIELDS')
    }

    return this.facilitatorsService.getAll(
      refresh,
      isAfMan ? xAffiliate : user.sfContact.AccountId,
    )
  }

  /**
   * ### GET: /facilitators/describe
   *
   * Describes Contact
   *
   * @param refresh Force cache refresh
   */
  @Get('/describe')
  async describe(@Refresh() refresh: boolean | undefined) {
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
  @UseGuards(AuthGuard)
  search(
    @User() user: AuthUser,
    @StringParam('search', new RequiredValidator(missingParam('search')))
    search: string,
    @ArrayParam('retrieve', new RequiredValidator(missingParam('retrieve')))
    retrieve: string[],
    @BooleanParam({ query: 'isMapped', header: 'is-mapped' })
    isMapped: boolean | undefined,
    @Refresh() refresh: boolean | undefined,
  ) {
    const isAfMan = isAffiliateManager(user)

    const mapped = !isAfMan ? true : isMapped

    if (!isAfMan && !user.sfContact.AccountId) {
      throw new ForbiddenException('', 'SESSION_EXPIRED')
    }

    return this.facilitatorsService.search(
      search,
      retrieve,
      mapped,
      isAfMan ? '' : user.sfContact.AccountId,
      refresh,
    )
  }

  /**
   * ### GET: /facilitators/:id
   * Retrieves a faciliatator
   *
   * @param id - Contact salesforce id
   */
  @Get('/:id')
  @Permission([1, 'affiliate -- '])
  @UseGuards(AuthGuard, PermissionGuard)
  read(@Param('id', SalesforceIdValidator) id: string) {
    return this.facilitatorsService.get(id)
  }

  @Get('/resetpassword/:email')
  async resetPassword(
    @Param('email') email: string,
  ): Promise<
    | { success: false; rejected?: string[] }
    | { success: true; accepted: string[]; response: string }
  > {
    const token = await this.facilitatorsService.generateReset(email)
    return this.mailer
      .sendMail({
        from: 'shingo.it@usu.edu',
        to: email,
        subject: 'Password Reset -- Affiliate Portal',
        text: stripIndent`
          Hello,

            Please follow this link to reset your password:

              ${process.env.CLIENT_HOST}/resetpassword?token=${token}

            If you did not request this password reset please ignore this message.
            NOTE: This link expires in 30 minutes.

          Thank you,

            The Shingo Institute, Home of the Shingo Prize

          This message was an automated response`,
        html: html`
          <p>Hello,</p>
          <p>Please follow this link to reset your password: </p>
          <p>&emsp;<a href="${
            process.env.CLIENT_HOST
          }/resetpassword?token=${token}">Reset Password</a></p>
          <p>If you did not request this password reset please ignore this message.</p>
          <p>NOTE: This link expires in 30 minutes.</p>
          <br>
          <p>Thank you,</p>
          <br>
          <p>The Shingo Institute, <em>Home of the Shingo Prize</em></p>
          <hr>
          <p>This message was an automated response.</p>
        `,
      })
      .then(response => {
        if (!response) return { success: false as false }
        if (response.rejected.length > 0)
          return { success: false as false, rejected: response.rejected }
        return {
          success: true as true,
          accepted: response.accepted,
          response: response.response,
        }
      })
  }

  @Post('/resetpassword/token')
  async changePassword(@Body() body: ChangePasswordBody) {
    return this.facilitatorsService
      .resetPassword(body.token, body.password)
      .then(jwt => ({ jwt }))
  }

  /**
   * ### POST: /facilitators
   * Creates a new facilitator
   *
   * @param body Required fields: [ 'AccountId', 'FirstName', 'LastName', 'Email' ]
   * Optional fields: [ 'roleId' ]
   */
  @Post()
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async create(@Body() body: CreateBody) {
    // FIXME: Add email verification
    try {
      const result = await this.facilitatorsService.create(body)

      await this.mailer.sendMail({
        from: 'shingo.it@usu.edu',
        to:
          process.env.NODE_ENV === 'development'
            ? 'shingo.it@usu.edu,abe.white@usu.edu'
            : 'shingo.coord@usu.edu',
        subject: 'New Shingo Affiliate Portal Account',
        text: `A new account has been created for ${result.extId}:${
          body.Email
        }.`,
        html: `<p>A new account has been created for <pre>${result.extId}:${
          body.Email
        }</pre>.<p>`,
      })

      await this.mailer.sendMail({
        from: 'shingo.it@usu.edu',
        to: body.Email,
        subject: 'New Shingo Affiliate Portal Account',
        text: stripIndent`
          Hello ${body.FirstName} ${body.LastName},

            Your account for the Shingo Affiliate Portal has been created!

          Thank you,

            The Shingo Institute, Home of the Shingo Prize`,
        html: html`
          <p>Hello ${body.FirstName} ${body.LastName},</p>
          <p>Your account for the Shingo Affiliate Portal has been created!</p>
          <p>Thank you,</p>
          <br>
          <p>The Shingo Institute, <em>Home of the Shingo Prize</em></p>
          <hr>
          <p>This message was an automated response.</p>`,
      })

      return result
    } catch (error) {
      if (
        error.message &&
        error.message.match(/(invalid login).*(prod\.outlook\.com)/gi)
      ) {
        throw new InternalServerErrorException(
          'Invalid login for mailer - A facilitator was created but failed to send a notification email.',
          'EMAIL_NOT_SENT',
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
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async map(
    @Body() body: MapBody,
    @Param('id', SalesforceIdValidator) id: string,
  ) {
    return this.facilitatorsService.mapContact(id, body)
  }

  /**
   * ### PUT: /facilitators/:id
   * Updates a Facilitator.
   * If `body` contains `Email` or `password` the associated auth is also updated
   *
   * @param body The update body. Id is required
   * @param id Contact salesforce id
   */
  @Put('/:id')
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async update(
    @Body() body: UpdateBody,
    @Param('id', SalesforceIdValidator) id: string,
  ) {
    if (body.Id !== id) {
      throw new BadRequestException(
        `Parameter id ${id} does not match field Id ${body.Id}`,
        'MISSING_FIELDS',
      )
    }

    if (body.hasOwnProperty('Biography__c')) {
      delete body.Biography__c
      // tslint:disable-next-line:max-line-length
      this.log.warn(
        'Client attempted to update Biography field on Facilitator. Biography field must be updated through salesforce until this functionality is built into the affiliate portal.',
      )
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
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async delete(
    @Param('id', SalesforceIdValidator) id: string,
    @Query('deleteAuth') deleteAuth = 'true',
  ) {
    const record = await this.facilitatorsService.delete(id)

    const deleted =
      deleteAuth === 'true'
        ? await this.facilitatorsService.deleteAuth(id)
        : false

    if (deleteAuth !== 'true') await this.facilitatorsService.unmapAuth(id)

    return { salesforce: true, auth: deleted, record }
  }

  /**
   * ### DELETE: /facilitators/:id/login
   * Deletes a faciliators login only
   *
   * @param id Contact salesforce id
   */
  @Delete('/:id/login')
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async deleteLogin(@Param('id', SalesforceIdValidator) id: string) {
    return { deleted: await this.facilitatorsService.deleteAuth(id) }
  }

  /**
   * ### DELETE: /facilitators/:id/unmap
   * Removes the Affiliate Portal service from a login
   *
   * @param id Contact salesforce id
   */
  @Delete('/:id/unmap')
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async unmap(@Param('id', SalesforceIdValidator) id: string) {
    return { unmaped: await this.facilitatorsService.unmapAuth(id) }
  }

  /**
   * @desc ### POST: /facilitators/:id/roles/:roleId
   * Changes a faciliatator's role
   *
   * @param id Contact salesforce id
   * @param roleId Id of the role to change too
   */
  @Post('/:id/roles/:roleId')
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async changeRole(
    @Param('id', SalesforceIdValidator) id: string,
    @Param('roleId') roleId: string,
  ) {
    return { added: await this.facilitatorsService.changeRole(id, +roleId) }
  }
}
