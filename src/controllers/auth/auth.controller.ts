import {
    Controller,
    Get, Post,
    Request, Response, Headers,
    Body, Inject, BadRequestException,
    ForbiddenException, InternalServerErrorException, NotFoundException, Session
} from '@nestjs/common'

import _ from 'lodash'
import { parseError, getBearerToken } from '../../util'
import { SalesforceClient } from '@shingo/shingo-sf-api'
import { AuthClient } from '@shingo/shingo-auth-api'
import { LoggerInstance } from 'winston'
import { LoginBody, LoginAsBody } from './authInterfaces';
import { ChangePasswordBody } from '../facilitators/facilitatorInterfaces';

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
  async login(@Session() session, @Body() body: LoginBody) {
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

    session.user = await this.getSessionUser(user)
    session.affiliate = session.user.AccountId

    return _.omit(session.user, ['permissions', 'extId', 'services', 'role.permissions'])
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
  async logout(@Request() req) {
    if (!req.session.user) throw new NotFoundException('', 'NO_LOGIN_FOUND')
    req.session.user.jwt = `${Math.random()}`; // WHYYY
    req.session.user.email = req.session.user.Email;
    await this.authService.updateUser(_.pick(req.session.user, ['id', 'jwt']))
    req.session.user = null
    return { message: 'LOGOUT_SUCCESS' }
  }

  @Post('/changepassword')
  async changePassword(@Session() session, @Body() body: ChangePasswordBody) {
    session.user.password = body.password

    const updated = await this.authService.updateUser(_.pick(session.user, ['id', 'password']))

    session.user = await this.authService.getUser(`user.id=${session.user.id}`)
    session.user = await this.getSessionUser(session.user)

    return { jwt: session.user.jwt }
  }

  @Post('/loginas')
  async loginAs(
    @Session() session,
    @Headers('x-jwt') xJwt: string,
    @Headers('Authorization') auth: string,
    @Body() body: LoginAsBody
  ): Promise<Response> {
    const adminToken = getBearerToken(auth || '') || xJwt

    if (session.user.id !== body.adminId) {
      throw new ForbiddenException('', 'UNAUTHORIZED')
    }

    const user = await this.authService.loginAs({adminId: body.adminId, userId: body.userId})
    session.user = await this.getSessionUser(user)
    session.user.adminToken = adminToken
    session.affiliate = session.user.AccountId

    this.log.debug(`Admin ${body.adminId} logged in as ${body.userId}`)

    return _.omit(session.user, ['permissions', 'extId', 'services', 'role.permissions', 'password'])
  }
}
