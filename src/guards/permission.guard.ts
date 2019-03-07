import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERM_KEY, all } from '../decorators/permission.decorator'
import { AuthClient } from '@shingo/auth-api-client'
import { Request } from 'express'

/**
 * Uses the Shingo Auth API to test if the user has permissions to access
 * a given resource
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthClient,
  ) {}

  private parseResource(resource: string) {
    if (resource.match(/^\/workshops\/.*\/facilitators/))
      return resource.split('/facilitators')[0]
    else if (resource.match(/^\/workshops\/.*\/attendee_file/))
      return resource.split('/attendee_file')[0]
    else if (resource.match(/^\/workshops\/.*\/evaluation_files/))
      return resource.split('/evaluation_files')[0]

    return resource
  }

  /**
   * Determines whether a user/request has permission to a resource
   * @param req The express request object
   * @param level The level of permission required (1=Read,2=Write)
   * @param resource The resource being accessed
   */
  private async hasPermission(req: Request, level: 1 | 2, resource?: string) {
    if (!req.user)
      return {
        level,
        resource: resource || '',
        user: 'anonymous',
        result: false,
      }

    const isAfMan = !!(
      req.user &&
      (req.user.roles || []).find(r => r.name === 'Affiliate Manager')
    )
    const user = (req.user && req.user.email) || 'anonymous'

    if (isAfMan) return { level, resource: resource || '', user, result: true }

    const realResource = this.parseResource(
      resource && resource.match(/^.*\s--\s$/)
        ? resource + req.user.sfContact.AccountId
        : !resource
          ? `${req.path}`
          : resource,
    )

    const messageResource = realResource.includes('affiliate -- ')
      ? 'affiliate -- '
      : realResource.includes('workshops -- ')
        ? 'workshops -- '
        : `${req.path}`

    return this.authService
      .canAccess(realResource, level, req.user.email!)
      .then(result => {
        return { level, resource: messageResource, user, result }
      })
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.get(PERM_KEY, context.getHandler())
    if (!permissions) {
      return true
    }
    const [mode, perms] = permissions
    const request: Request = context.switchToHttp().getRequest()
    const promises = perms.map(([level, resource]) =>
      this.hasPermission(request, level, resource),
    )
    const results = await Promise.all(promises)
    const allowed =
      mode === all ? results.every(r => r.result) : results.some(r => r.result)

    if (allowed) return true

    if (mode === all) {
      const resources = results
        .filter(r => !r.result)
        .map(
          r => `{resource: ${r.resource}, level: ${r.level}, user: ${r.user}}`,
        )

      throw new ForbiddenException(
        `Insufficent permission to access resources: ${resources}`,
        'ACCESS_FORBIDDEN',
      )
    } else {
      const firstFail = results.find(r => !r.result)!
      const resource = `{resource: ${firstFail.resource}, level: ${
        firstFail.level
      }, user: ${firstFail.user}`

      throw new ForbiddenException(
        `Insufficent permission to access resource: ${resource}`,
        'ACCESS_FORBIDDEN',
      )
    }
  }
}
