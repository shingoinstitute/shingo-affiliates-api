import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common'
import { Request } from 'express'
import {
  AuthClient,
  authservices,
  InvalidTokenError,
} from '@shingo/auth-api-client'
import { getJwt, retrieveResult } from '../util'
import { SalesforceClient } from '@shingo/sf-api-client'
import { Contact } from '../sf-interfaces/Contact.interface'
import { LoggerInstance } from 'winston'

export type AuthUser = authservices.User & { sfContact: Contact }
declare module 'express' {
  interface Request {
    user?: AuthUser
  }
}

/**
 * Checks if a jwt token is valid and adds the user object to the request
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthClient,
    private readonly sfService: SalesforceClient,
    @Inject('LoggerService') private readonly log: LoggerInstance,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest()
    const token = getJwt(req)
    if (!token) return false

    let valid
    try {
      valid = await this.authService.isValid(token)
    } catch (err) {
      this.log.error('AuthGuard: Got Error', err)
    }

    if (!valid) return false

    if (valid instanceof InvalidTokenError) {
      const route = req.url
      this.log.info(`AuthGuard: Denying access for ${route} :`, valid)
      return false
    }

    // add user to request
    const user = await this.authService.getUser(
      `user.email='${valid.email}' AND user.extId='${valid.extId}'`,
    )

    if (!user)
      throw new Error(
        `Auth user {email: ${valid.email}, extId: ${valid.extId}} not found`,
      )

    const sfContact = await this.sfService
      .retrieve<Contact>({ object: 'Contact', ids: [valid.extId!] })
      .then(retrieveResult)

    if (sfContact === null)
      throw new Error(
        `Associated Contact for user {email: ${valid.email}, extId: ${
          valid.extId
        }} not found`,
      )

    req.user = { ...user, sfContact }

    return true
  }
}

// tslint:disable-next-line:max-classes-per-file
@Injectable()
export class AnonymousAuthGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context)
    return true
  }
}
