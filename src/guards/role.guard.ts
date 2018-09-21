import {
  Injectable,
  CanActivate,
  Inject,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { LoggerInstance } from 'winston'
import { ROLE_KEY } from '../decorators/role.decorator'
import { all } from '../decorators/permission.decorator'
import { Request } from 'express'
import { hasRole as userHasRole } from '../util'

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('LoggerService') private readonly log: LoggerInstance,
  ) {}

  private async hasRole(req: Request, role: string) {
    if (!req.user) {
      return { role, user: 'anonymous', result: false }
    }

    const user = req.user.email || 'anonymous'

    const result = !!userHasRole(role)(req.user)

    return { role, user, result }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roleset = this.reflector.get(ROLE_KEY, context.getHandler())
    if (!roleset) {
      return true
    }
    const [mode, roles] = roleset
    const request: Request = context.switchToHttp().getRequest()
    const promises = roles.map(role => this.hasRole(request, role))
    const results = await Promise.all(promises)
    const allowed =
      mode === all ? results.every(r => r.result) : results.some(r => r.result)

    if (allowed) return true

    const resources = results
      .filter(r => !r.result)
      .map(r => `{role: ${r.role}, user: ${r.user}}`)

    if (mode === all) {
      throw new ForbiddenException(
        `User does not have required roles: ${resources}`,
        'ACCESS_FORBIDDEN',
      )
    } else {
      // all roles will have failed here, so we don't need to redefine resources (since the filter is a noop)
      throw new ForbiddenException(
        `User does not have any of the required roles: ${resources}`,
        'ACCESS_FORBIDDEN',
      )
    }
  }
}
