import { Component } from '@nestjs/common';
export { User } from './user';

/**
 * @desc Provide methods for working with users
 * 
 * @export
 * @class UserService
 */
@Component()
export class UserService {

    /**
     * @desc Parse out the workshops that a user has permissions for
     * 
     * @param {any} user - Requires <code>user.permissions[]</code> and <code>user.roles[].permissions[]</code>
     * @returns {string[]} 
     * @memberof UserService
     */
    public getWorkshopIds(user: { permissions: Array<{ resource: string }>, role: { permissions: Array<{resource: string}> } }): string[] {
        const ids = [...user.permissions, ...user.role.permissions]
                .filter(p => p.resource.includes('/workshops/'))
                .map(p => `'${p.resource.replace('/worshops/', '')}'`)

        return [...new Set(ids)]; // Only return unique ids
    }

}