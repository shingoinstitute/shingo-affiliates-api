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
import { AuthClient, authservices } from '@shingo/auth-api-client'
import { LoggerInstance } from 'winston'
import { LoginBody, LoginAsBody, ChangePasswordBody } from './authInterfaces'
import { AuthUser } from '../../guards/auth.guard'
import { RoleGuard, AuthGuard } from '../../guards'
import { IsAffiliateManager, User } from '../../decorators'

/**
 * Provides the controller of the Auth REST logic
 */
@Controller('auth')
export class AuthController {
  constructor(
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
      .then(jwt =>
        this.authService
          .getUser(`user.email='${body.email}'`)
          .then<{ jwt: string } & authservices.User>(u => ({
            ...u,
            jwt,
          })),
      )
      .catch((e: Error) => {
        this.log.debug(e as any)
        if (
          e.message === 'INVALID_PASSWORD' ||
          e.message === 'EMAIL_NOT_FOUND'
        ) {
          throw new ForbiddenException(e.message || '')
        }

        throw e
      })

    if (typeof user === 'undefined') {
      throw new ForbiddenException('', 'INVALID_LOGIN')
    }

    if (!(user.services || '').includes('affiliate-portal')) {
      throw new ForbiddenException('', 'NOT_REGISTERED')
    }

    return user
  }

  /**
   * ### GET: /auth/valid
   * Protected by isValid middleware. Returns the user object
   */
  @Get('valid')
  @UseGuards(AuthGuard)
  async valid(@User() user: AuthUser) {
    return user
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
    const newToken = await this.authService.loginAs({
      adminId: user.id!,
      userId: body.userId,
    })

    this.log.debug(`Admin ${user.id} logged in as ${body.userId}`)

    return newToken
  }
}
