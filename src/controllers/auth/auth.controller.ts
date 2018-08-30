import {
    Controller,
    Get, Post,
    Request, Response,
    Body, Inject, BadRequestException,
    ForbiddenException, InternalServerErrorException, NotFoundException
} from '@nestjs/common'

import _ from 'lodash'
import { parseError } from '../../util'
import { SalesforceClient } from '@shingo/shingo-sf-api'
import { AuthClient } from '@shingo/shingo-auth-api'
import { LoggerInstance } from 'winston'

/**
 * Provides the controller of the Auth REST logic
 */
@Controller('auth')
export class AuthController {

  constructor(
    private sfService: SalesforceClient,
    private authService: AuthClient,
    @Inject('LoggerService') private log: LoggerInstance
  ) { }

  /**
   * ### POST: /auth/login
   *
   * @param body - Required fields: <code>[ 'email', 'password' ]</code>
   */
  @Post('login')
  async login(@Request() req, @Body() body) {
    if (!body.email || !body.password) {
      throw new BadRequestException(
        `Missing fields: email, password`,
        'MISSING_FIELDS'
      )
    }

    const user = await this.authService.login(body).catch(e => {
      this.log.debug(e)
      const parsed = parseError(e)
      if (parsed.error === 'INVALID_PASSWORD' || parsed.error === 'EMAIL_NOT_FOUND') {
        throw new ForbiddenException(parsed.message || '', parsed.error)
      }

      throw new InternalServerErrorException(parsed.message || '', parsed.error)
    })

    if (typeof user === 'undefined') {
      throw new ForbiddenException('', 'INVALID_LOGIN')
    }

    if (!user.services.includes('affiliate-portal')) {
      throw new ForbiddenException('', 'NOT_REGISTERED')
    }

    req.session.user = await this.getSessionUser(user)
    req.session.affiliate = req.session.user.AccountId

    return _.omit(req.session.user, ['permissions', 'extId', 'services', 'role.permissions'])
  }

  private async getSessionUser(user): Promise<any> {
    const contact = (await this.sfService.retrieve({ object: 'Contact', ids: [user.extId] }))[0]
    let sessionUser = _.omit(user, ['password', 'roles'])
    sessionUser = _.merge(contact, _.omit(sessionUser, ['email']))
    sessionUser.role = user.roles.map(role => {
      if (role.service === 'affiliate-portal') return _.omit(role, ['users', 'service'])
      return role
    })[0]

    return sessionUser
  }

  /**
   * ### GET: /auth/valid
   * Protected by isValid middleware. Returns the user's JWT
   *
   * @memberof AuthController
   */
  @Get('valid')
  async valid(@Request() req) {
    return _.omit(req.session.user, ['permissions', 'extId', 'services', 'role.permissions'])
  }

  /**
   * ### GET: /auth/logout
   * Sets the user's JWT to '' and removes the user from the session
   */
  @Get('logout')
  async logout(@Request() req, @Response() res) {
    if (!req.session.user) throw new NotFoundException('', 'NO_LOGIN_FOUND')
    req.session.user.jwt = `${Math.random()}`; // WHYYY
    req.session.user.email = req.session.user.Email;
    await this.authService.updateUser(_.pick(req.session.user, ['id', 'jwt']))
    req.session.user = null
    return { message: 'LOGOUT_SUCCESS' }
  }

  @Post('/changepassword')
  async changePassword(@Request() req, @Body() body) {
    if (!body.password) {
      throw new BadRequestException(
        `Missing fields: password`,
        'MISSING_FIELDS'
      )
    }

    req.session.user.password = body.password

    const updated = await this.authService.updateUser(_.pick(req.session.user, ['id', 'password']))

    req.session.user = await this.authService.getUser(`user.id=${req.session.user.id}`)
    req.session.user = await this.getSessionUser(req.session.user)

    return { jwt: req.session.user.jwt }
  }

  @Post('/loginas')
  async loginAs(@Request() req, @Response() res, @Body() body): Promise<Response> {
    if (!body.adminId || !body.userId) {
      throw new BadRequestException(
        `Missing fields: userId, adminId`,
        'MISSING_FIELDS'
      )
    }

    if (req.session.user.id !== body.adminId) {
      throw new ForbiddenException('', 'UNAUTHORIZED')
    }

    const user = await this.authService.loginAs({adminId: body.adminId, userId: body.userId})
    req.session.user = await this.getSessionUser(user)
    req.session.user.adminToken = req.headers['x-jwt']
    req.session.affiliate = req.session.user.AccountId

    this.log.debug(`Admin ${body.adminId} logged in as ${body.userId}`)

    return _.omit(req.session.user, ['permissions', 'extId', 'services', 'role.permissions', 'password'])
  }
}
