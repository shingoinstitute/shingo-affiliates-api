import { Injectable } from '@nestjs/common';
export { User } from './user';

/**
 * Provide methods for working with users
 */
@Injectable()
export class UserService {

  /**
   * Parse out the workshops that a user has permissions for
   *
   * @param user Requires user.permissions[] and user.roles[].permissions[]
   */
  // tslint:disable-next-line:max-line-length
  getWorkshopIds(user: { permissions: Array<{ resource: string }>, roles: { permissions: Array<{resource: string}> } }): string[] {
    const ids =
      [...user.permissions, ...user.roles.permissions]
          .filter(p => p.resource.includes('/workshops/'))
          .map(p => `'${p.resource.replace('/worshops/', '')}'`)

    return [...new Set(ids)]; // Only return unique ids
  }
}
