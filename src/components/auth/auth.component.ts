import { Component } from '@nestjs/common';
import { gRPCError, User } from '../';
import * as grpc from 'grpc';
import * as path from 'path';
import * as bluebird from 'bluebird';

const authservices = grpc.load(path.join(__dirname, '../../../proto/auth_services.proto')).authservices;

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

    public getUsers(clause: string): Promise<any> {
        return this.client.readUserAsync({ clause });
    }

    public getUser(clause: string): Promise<any> {
        return this.client.readOneUserAsync({ clause });
    }

    public createUser(user: User): Promise<any> {
        return this.client.createUserAsync(user);
    }

    public updateUser(user: User): Promise<any> {
        return this.client.updateUserAsync(user);
    }

    public deleteUser(user: { id?: number, extId?: string }): Promise<any> {
        return this.client.deleteUserAsync(user);
    }

    public addRoleToUser(set: { userEmail: string, roleId: number }): Promise<any> {
        return this.client.addRoleToUserAsync(set);
    }

    public removeRoleFromUser(set: { userEmail: string, roleId: number }): Promise<any> {
        return this.client.removeRoleFromUserAsync(set);
    }

    public getPermissions(clause: string): Promise<any> {
        return this.client.readPermissionAsync({ clause });
    }

    public createPermission(permission: { resource: string, level: number }): Promise<any> {
        return this.client.createPermissionAsync(permission);
    }

    public updatePermission(permission: { id: number, resource: string, level: number }): Promise<any> {
        return this.client.updatePermissionAsync(permission);
    }

    public getPermission(clause: string): Promise<any> {
        return this.client.readOnePermissionAsync({ clause });
    }

    public deletePermission(resource: string, level: 0 | 1 | 2): Promise<any> {
        return this.client.deletePermissionAsync({ resource, level });
    }

    public getRoles(clause: string): Promise<any> {
        return this.client.readRoleAsync({ clause });
    }

    public getRole(clause: string): Promise<any> {
        return this.client.readOneRoleAsync({ clause });
    }

    public createRole(role: { name: string, service: string }): Promise<any> {
        return this.client.createRoleAsync(role);
    }

    public updateRole(role: { id: number, name: string, service: string }): Promise<any> {
        return this.client.updateRoleAsync(role);
    }

    public deleteRole(role: { id: number }): Promise<any> {
        return this.client.deleteRoleAsync(role);
    }

    public grantPermissionToUser(resource: string, level: 0 | 1 | 2, userId: number): Promise<any> {
        return this.client.grantPermissionToUserAsync({ resource, level, accessorId: userId });
    }

    public grantPermissionToRole(resource: string, level: 0 | 1 | 2, roleId: number): Promise<any> {
        return this.client.grantPermissionToRoleAsync({ resource, level, accessorId: roleId });
    }

    public revokePermissionFromUser(resource: string, level: 0 | 1 | 2, userId: number): Promise<any> {
        return this.client.revokePermissionFromUserAsync({ resource, level, accessorId: userId });
    }

    public revokePermissionFromRole(resource: string, level: 0 | 1 | 2, roleId: number): Promise<any> {
        return this.client.revokePermissionFromRoleAsync({ resource, level, accessorId: roleId });
    }

    public login(creds: { email: string, password: string }): Promise<any> {
        return this.client.loginAsync(creds);
    }

    public isValid(token: string): Promise<any> {
        return this.client.isValidAsync({ token });
    }

    public canAccess(resource: string, level: 1 | 2, jwt: string): Promise<any> {
        return this.client.canAccessAsync({ resource, level, jwt });
    }

    /**
     * @desc Utility method to assist in parsing gRPC error metadata. Returns a JSON object from the parsed error data. If no JSON object can be parsed, the method attempts to return the 'error-bin' from the meta-data as a string. If that fails the method returns the error passed to it.
     * 
     * @param {gRPCError} error - The error to be parsed
     * @returns {object} The parsed error, 'error-bin'.toString(), or passed in error
     * @memberof AuthService
     */
    parseRPCErrorMeta(error: gRPCError): object {
        try {
            let err = JSON.parse(error.metadata.get('error-bin').toString());
            return err;
        } catch (caught) {
            console.error('Couldn\'t parse RPC Error;', { error, caught });
            if (error.metadata.get('error-bin')) return error.metadata.get('error-bin').toString();
            else return error;
        }
    }

}