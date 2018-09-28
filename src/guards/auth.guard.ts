import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { AuthClient, authservices } from '@shingo/auth-api-client'
import { getJwt, retrieveResult } from '../util'
import { SalesforceClient } from '@shingo/sf-api-client'
import { Contact } from '../Contact.interface'

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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest()
    const token = getJwt(req)
    if (!token) return false

    const valid = await this.authService.isValid(token)

    if (valid) {
      // add user to request
      const user = await this.authService.getUser(
        `user.email='${valid.email}' AND user.extId='${valid.extId}'`,
      )

      const sfContact = await this.sfService
        .retrieve({ object: 'Contact', ids: [valid.extId!] })
        .then(retrieveResult)

      req.user = { ...user, sfContact }
    }

    return !!valid
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
