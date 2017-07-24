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
    public getWorkshopIds(user): string[] {
        let ids = [];
        user.permissions.forEach(p => {
            if (p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
        });
        user.roles.forEach(role => {
            role.permissions.forEach(p => {
                if (p.resource.includes('/workshops/')) ids.push(`'${p.resource.replace('/workshops/', '')}'`)
            });
        });

        return [...new Set(ids)]; // Only return unique ids
    }

}