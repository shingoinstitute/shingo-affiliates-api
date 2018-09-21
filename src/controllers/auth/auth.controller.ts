import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  ForbiddenException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common'

import _ from 'lodash'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient } from '@shingo/auth-api-client'
import { LoggerInstance } from 'winston'
import { LoginBody, LoginAsBody } from './authInterfaces'
import { ChangePasswordBody } from '../facilitators/facilitatorInterfaces'
import { AuthUser } from '../../guards/auth.guard'
import { RoleGuard, AuthGuard } from '../../guards'
import { IsAffiliateManager, User } from '../../decorators'

/**
 * Provides the controller of the Auth REST logic
 */
@Controller('auth')
export class AuthController {
  constructor(
    private sfService: SalesforceClient,
    private authService: AuthClient,
    @Inject('LoggerService') private log: LoggerInstance,
  ) {}

  /**
   * ### POST: /auth/login
   * Returns a user object with jwt token as property 'jwt'
   *
   * @param body login credentials
   */
  @Post('login')
  async login(@Body() body: LoginBody) {
    const user = await this.authService
      .login(body)
      .then(jwt => ({
        ...this.authService.getUser(`user.email='${body.email}'`),
        jwt,
      }))
      .catch((e: Error) => {
        this.log.debug(e as any)
        if (
          e.message === 'INVALID_PASSWORD' ||
          e.message === 'EMAIL_NOT_FOUND'
        ) {
          throw new ForbiddenException(e.message || '')
        }

        throw new InternalServerErrorException(
          e.message || 'Unknown error when logging in',
        )
      })

    if (typeof user === 'undefined') {
      throw new ForbiddenException('', 'INVALID_LOGIN')
    }

    if (!(user.services || '').includes('affiliate-portal')) {
      throw new ForbiddenException('', 'NOT_REGISTERED')
    }

    return _.omit(user, [
      'permissions',
      'extId',
      'services',
      'role.permissions',
    ])
  }

  /**
   * ### GET: /auth/valid
   * Protected by isValid middleware. Returns the user's JWT
   *
   * @memberof AuthController
   */
  @Get('valid')
  @UseGuards(AuthGuard)
  async valid(@User() user: AuthUser) {
    return _.omit(user, [
      'permissions',
      'extId',
      'services',
      'role.permissions',
    ])
  }

  @Post('/changepassword')
  @UseGuards(AuthGuard)
  async changePassword(
    @User() user: AuthUser,
    @Body() body: ChangePasswordBody,
  ) {
    const updated = await this.authService.updateUser({
      id: user.id!,
      password: body.password,
    })
    if (updated) {
      const jwt = await this.authService.login({
        email: user.email!,
        password: body.password,
      })
      return { jwt }
    } else {
      throw new InternalServerErrorException(
        `Server was unable to update password for user ${user.email}`,
      )
    }
  }

  @Post('/loginas')
  @IsAffiliateManager()
  @UseGuards(AuthGuard, RoleGuard)
  async loginAs(@User() user: AuthUser, @Body() body: LoginAsBody) {
    if (user.id !== body.adminId) {
      throw new ForbiddenException('', 'UNAUTHORIZED')
    }

    // loginAs should probably return a jwt token, since everything else requires that for auth
    // client would store the token and use it for future requests, then use old token when switching back
    const newUser = await this.authService.loginAs({
      adminId: body.adminId,
      userId: body.userId,
    })

    this.log.debug(`Admin ${body.adminId} logged in as ${body.userId}`)

    return _.omit(newUser, [
      'permissions',
      'extId',
      'services',
      'role.permissions',
      'password',
    ])
  }
}
