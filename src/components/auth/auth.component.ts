import { Component } from '@nestjs/common';
import { gRPCError, User } from '../';
import * as grpc from 'grpc';
import * as path from 'path';
import bluebird from 'bluebird';
import { RequireKeys } from '../../util';

const authservices = grpc.load(path.join(__dirname, '../../proto/auth_services.proto')).authservices;

/**
 * @desc A service to abastract the Shingo Auth Microservice client
 * 
 * @export
 * @class AuthService
 */
@Component()
export class AuthService {

    private client;

    constructor() {
        this.client = bluebird.promisifyAll(this.getClient());
    }

    /**
     * @desc Method to instantiate a RPC Client from the auth_services.proto
     * 
     * @private
     * @returns Returns a RPC Client to be used in consuming the Shingo Auth Microservice
     * @memberof AuthService
     */
    private getClient() {
        return new authservices.AuthServices(`${process.env.AUTH_API}:80`, grpc.credentials.createInsecure());
    }

    /**
     * Get an array of users based upon a TypeORM query
     * 
     * @param {string} clause - A TypeORM query. See [here](https://typeorm.github.io/query-builder.html) for some examples
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public getUsers(clause: string): Promise<any> {
        return this.client.readUserAsync({ clause });
    }

    /**
     * Get a single user based upon a TypeORM query
     * 
     * @param {string} clause - A TypeORM query. See [here](https://typeorm.github.io/query-builder.html) for some examples
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public getUser(clause: string): Promise<any> {
        return this.client.readOneUserAsync({ clause });
    }

    /**
     * Create a user in the Auth Database
     * 
     * @param {User} user - Expecting <code>{"email", "password", "services", "extId?"}</code>
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public createUser(user: User): Promise<any> {
        return this.client.createUserAsync(user);
    }

    /**
     * Update a user in the Auth Database
     * 
     * @param {User} user - Expecting <code>{oneormoreof: {"email", "password", "services"}, oneof: {"id", extId"}}</code>
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public updateUser(user: RequireKeys<Partial<User>, 'id'> | RequireKeys<Partial<User>, 'extId'>): Promise<any> {
        return this.client.updateUserAsync(user);
    }

    /**
     * Delete a user from the Auth Database
     * 
     * @param {User} user - User to delete
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public deleteUser(user: { id?: number, extId?: string }): Promise<any> {
        return this.client.deleteUserAsync(user);
    }

    /**
     * Add a role to a user by email
     * 
     * @param {RoleRequest} set - User and Role to associate
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public addRoleToUser(set: { userEmail: string, roleId: number }): Promise<any> {
        return this.client.addRoleToUserAsync(set);
    }

    /**
     * Remove a role from a user by email
     * 
     * @param {RoleRequest} set - User and Role to disassociate
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public removeRoleFromUser(set: { userEmail: string, roleId: number }): Promise<any> {
        return this.client.removeRoleFromUserAsync(set);
    }

    /**
     * Get an array of permissions based on TypeORM query
     * 
     * @param {string} clause - A TypeORM query. See [here](https://typeorm.github.io/query-builder.html) for some examples
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public getPermissions(clause: string): Promise<any> {
        return this.client.readPermissionAsync({ clause });
    }

    /**
     * Get a single permission based on a TypeORM Query
     * 
     * @param {string} clause - A TypeORM query. See [here](https://typeorm.github.io/query-builder.html) for some examples
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public getPermission(clause: string): Promise<any> {
        return this.client.readOnePermissionAsync({ clause });
    }

    /**
     * Create a permission.
     * 
     * @param {Permission} permission - Permission to be created
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public createPermission(permission: { resource: string, level: number }): Promise<any> {
        return this.client.createPermissionAsync(permission);
    }

    /**
     * Update a permission
     * 
     * @param {Permission} permission - Permission to update
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public updatePermission(permission: { id: number, resource: string, level: number }): Promise<any> {
        return this.client.updatePermissionAsync(permission);
    }

    /**
     * Delete a permission
     * 
     * @param {string} resource - Permission resource
     * @param {(0 | 1 | 2)} level - Permission level
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public deletePermission(resource: string, level: 0 | 1 | 2): Promise<any> {
        return this.client.deletePermissionAsync({ resource, level });
    }

    /**
     * Get an array of roles based on a TypeORM query
     * 
     * @param {string} clause - A TypeORM query. See [here](https://typeorm.github.io/query-builder.html) for some examples
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public getRoles(clause: string): Promise<any> {
        return this.client.readRoleAsync({ clause });
    }

    /**
     * Get a single role based on a TypeORM query
     * 
     * @param {string} clause - A TypeORM query. See [here](https://typeorm.github.io/query-builder.html) for some examples
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public getRole(clause: string): Promise<any> {
        return this.client.readOneRoleAsync({ clause });
    }

    /**
     * Create a role
     * 
     * @param {Role} role - Role to create
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public createRole(role: { name: string, service: string }): Promise<any> {
        return this.client.createRoleAsync(role);
    }

    /**
     * Update a role
     * 
     * @param {Role} role - Role to update
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public updateRole(role: { id: number, name: string, service: string }): Promise<any> {
        return this.client.updateRoleAsync(role);
    }

    /**
     * Delete a role
     * 
     * @param {Role} role - Id of role to delete
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public deleteRole(role: { id: number }): Promise<any> {
        return this.client.deleteRoleAsync(role);
    }

    /**
     * Grant permission to a user based on resource and level
     * 
     * @param {string} resource - Resource to grant permissions to
     * @param {(0 | 1 | 2)} level - Level to grant (0=Deny,1=Read,2=Write)
     * @param {number} userId - User's Id
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public grantPermissionToUser(resource: string, level: 0 | 1 | 2, userId: number): Promise<any> {
        return this.client.grantPermissionToUserAsync({ resource, level, accessorId: userId });
    }

    /**
     * Grant permission to a role based on resource and level
     * 
     * @param {string} resource - Resource to grant permissions to
     * @param {(0 | 1 | 2)} level - Level to grant (0=Deny,1=Read,2=Write)
     * @param {number} roleId - Role's Id
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public grantPermissionToRole(resource: string, level: 0 | 1 | 2, roleId: number): Promise<any> {
        return this.client.grantPermissionToRoleAsync({ resource, level, accessorId: roleId });
    }

    /**
     * Revoke permission from a user based on resource and level
     * 
     * @param {string} resource - Resource to grant permissions to
     * @param {(0 | 1 | 2)} level - Level to grant (0=Deny,1=Read,2=Write)
     * @param {number} userId - User's Id
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public revokePermissionFromUser(resource: string, level: 0 | 1 | 2, userId: number): Promise<any> {
        return this.client.revokePermissionFromUserAsync({ resource, level, accessorId: userId });
    }

    /**
     * Revoke permission from a role based on resource and level
     * 
     * @param {string} resource - Resource to grant permissions to
     * @param {(0 | 1 | 2)} level - Level to grant (0=Deny,1=Read,2=Write)
     * @param {number} roleId - Role's Id
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public revokePermissionFromRole(resource: string, level: 0 | 1 | 2, roleId: number): Promise<any> {
        return this.client.revokePermissionFromRoleAsync({ resource, level, accessorId: roleId });
    }

    /**
     * Use email and password to login a user
     * 
     * @param {Credentials} creds 
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public login(creds: { email: string, password: string }): Promise<any> {
        return this.client.loginAsync(creds);
    }

    /**
     * Check if JWT is valid
     * 
     * @param {string} token - JWT
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public isValid(token: string): Promise<any> {
        return this.client.isValidAsync({ token });
    }

    /**
     * Check if user with JWT can access the requested resource with given permission level
     * 
     * @param {string} resource - Resource to grant permissions to
     * @param {(1 | 2)} level - Level of access (1=Read,2=Write)
     * @param {string} jwt - User's JWT
     * @returns {Promise<any>} 
     * @memberof AuthService
     */
    public canAccess(resource: string, level: 1 | 2, jwt: string): Promise<any> {
        return this.client.canAccessAsync({ resource, level, jwt });
    }

    public loginAs(loginAsRequest : {adminId : number, userId: number}) : Promise<any> {
        return this.client.loginAsAsync(loginAsRequest);
    }

}