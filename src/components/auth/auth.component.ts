import { Component } from '@nestjs/common';
import { gRPCError, User } from '../';
import * as grpc from 'grpc';
import * as path from 'path';


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
        this.client = this.getClient();
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

    private parseResponse(error, result): Promise<any> {
        if (error) return Promise.reject(error);
        return Promise.resolve(result);
    }

    public getUsers(clause: string): Promise<any> {
        return this.client.readUser(clause, this.parseResponse);
    }

    public getUser(clause: string): Promise<any> {
        return this.client.readOneUser(clause, this.parseResponse);
    }

    public createUser(user: User): Promise<any> {
        return this.client.createUser(user, this.parseResponse);
    }

    public updateUser(user: User): Promise<any> {
        return this.client.updateUser(user, this.parseResponse);
    }

    public deleteUser(user: { id?: number, extId?: string }): Promise<any> {
        return this.client.deleteUser(user, this.parseResponse);
    }

    public addRoleToUser(set: { userEmail: string, roleId: number }): Promise<any> {
        return this.client.addRoleToUser(set, this.parseResponse);
    }

    public removeRoleFromUser(set: { userEmail: string, roleId: number }): Promise<any> {
        return this.client.removeRoleFromUser(set, this.parseResponse);
    }

    public getPermissions(clause: string): Promise<any> {
        return this.client.readPermission(clause, this.parseResponse);
    }

    public createPermission(permission: { resource: string, level: number }): Promise<any> {
        return this.client.createPermission(permission, this.parseResponse);
    }

    public updatePermission(permission: { id: number, resource: string, level: number }): Promise<any> {
        return this.client.updatePermission(permission, this.parseResponse);
    }

    public getPermission(clause: string): Promise<any> {
        return this.client.readOnePermission(clause, this.parseResponse);
    }

    public deletePermission(resource: string, level: 0 | 1 | 2): Promise<any> {
        return this.client.deletePermission({ resource, level }, this.parseResponse);
    }

    public getRoles(clause: string): Promise<any> {
        return this.client.readRole(clause, this.parseResponse);
    }

    public getRole(clause: string): Promise<any> {
        return this.client.readOneRole(clause, this.parseResponse);
    }

    public createRole(role: { name: string, service: string }): Promise<any> {
        return this.client.createRole(role, this.parseResponse);
    }

    public updateRole(role: { id: number, name: string, service: string }): Promise<any> {
        return this.client.updateRole(role, this.parseResponse);
    }

    public deleteRole(role: { id: number }): Promise<any> {
        return this.client.deleteRole(role, this.parseResponse);
    }

    public grantPermissionToUser(resource: string, level: 0 | 1 | 2, userId: number): Promise<any> {
        return this.client.grantPermissionToUser({ resource, level, accessorId: userId }, this.parseResponse);
    }

    public grantPermissionToRole(resource: string, level: 0 | 1 | 2, roleId: number): Promise<any> {
        return this.client.grantPermissionToRole({ resource, level, accessorId: roleId }, this.parseResponse);
    }

    public revokePermissionFromUser(resource: string, level: 0 | 1 | 2, userId: number): Promise<any> {
        return this.client.revokePermissionFromUser({ resource, level, accessorId: userId }, this.parseResponse);
    }

    public revokePermissionFromRole(resource: string, level: 0 | 1 | 2, roleId: number): Promise<any> {
        return this.client.revokePermissionFromRole({ resource, level, accessorId: roleId }, this.parseResponse);
    }

    public login(creds: { email: string, password: string }): Promise<any> {
        return this.client.login(creds, this.parseResponse);
    }

    public isValid(token: string): Promise<any> {
        return this.client.isValid({ token }, this.parseResponse);
    }

    public canAccess(resource: string, level: 1 | 2, jwt: string): Promise<any> {
        return this.client.canAccess({ resource, level, jwt }, this.parseResponse);
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