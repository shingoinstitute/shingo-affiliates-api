import {
  Controller,
  Get,
  Post,
  Body,
  ForbiddenException,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common'

import _ from 'lodash'
import { AuthClient } from '@shingo/auth-api-client'
import { LoginBody, LoginAsBody, ChangePasswordBody } from './authInterfaces'
import { AuthUser } from '../../guards/auth.guard'
import { RoleGuard, AuthGuard } from '../../guards'
import { IsAffiliateManager, User } from '../../decorators'
import { Body as BodyType, CurrUser, RouteMetadata } from '../../util'

/**
 * Provides the controller of the Auth REST logic
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthClient) {}

  /**
   * ### POST: /auth/login
   * Returns a user object with jwt token as property 'jwt'
   *
   * @param body login credentials
   */
  @Post('login')
  async login(
    @Body() body: BodyType<LoginBody>,
    _metadata: RouteMetadata<{
      route: '/auth/login'
      auth: false
      method: 'POST'
    }>,
  ) {
    const jwt = await this.authService.login(body).catch((e: Error) => {
      console.debug(e)
      if (e.message === 'INVALID_PASSWORD' || e.message === 'EMAIL_NOT_FOUND') {
        throw new ForbiddenException(e.message)
      }

      throw e
    })

    if (typeof jwt === 'undefined') {
      throw new ForbiddenException('', 'INVALID_LOGIN')
    }

    // if (!(user.services || '').includes('affiliate-portal')) {
    //   throw new ForbiddenException('', 'NOT_REGISTERED')
    // }

    return { jwt }
  }

  /**
   * ### GET: /auth/valid
   * Protected by isValid middleware. Returns the user object
   */
  @Get('valid')
  @UseGuards(AuthGuard)
  async valid(
    @User() user: CurrUser<AuthUser>,
    _metadata: RouteMetadata<{
      route: '/auth/valid'
      auth: true
      method: 'GET'
    }>,
  ) {
    return user as AuthUser
  }

  @Post('/changepassword')
  @UseGuards(AuthGuard)
  async changePassword(
    @User() user: CurrUser<AuthUser>,
    @Body() body: BodyType<ChangePasswordBody>,
    _metadata: RouteMetadata<{
      route: '/auth/changepassword'
      auth: true
      method: 'POST'
    }>,
  ) {
    const updated = await this.authService.updateUser({
      id: user.id,
      password: body.password,
    })
    if (updated) {
      const jwt = await this.authService.login({
        email: user.email,
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
  async loginAs(
    @User() user: CurrUser<AuthUser>,
    @Body() body: BodyType<LoginAsBody>,
    _metadata: RouteMetadata<{
      route: '/auth/loginas'
      auth: ['Affiliate Manager']
      method: 'POST'
    }>,
  ) {
    const jwt = await this.authService.loginAs({
      adminId: user.id!,
      userId: body.userId,
    })

    console.debug(`Admin ${user.id} logged in as ${body.userId}`)

    return { jwt }
  }
}
