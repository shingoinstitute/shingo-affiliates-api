import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance, MockServiceFactory } from './mockService.factory';

export interface MockAuthServiceInstance extends MockInstance {
    getUsers: FunctionSpy,
    getUser: FunctionSpy,
    createUser: FunctionSpy,
    updateUser: FunctionSpy,
    deleteUser: FunctionSpy,
    addRoleToUser: FunctionSpy,
    removeRoleFromUser: FunctionSpy,
    getPermissions: FunctionSpy,
    getPermission: FunctionSpy,
    createPermission: FunctionSpy,
    updatePermission: FunctionSpy,
    deletePermission: FunctionSpy,
    getRoles: FunctionSpy,
    getRole: FunctionSpy,
    createRole: FunctionSpy,
    updateRole: FunctionSpy,
    deleteRole: FunctionSpy,
    grantPermissionToUser: FunctionSpy,
    revokePermissionToUser: FunctionSpy,
    grantPermissionToRole: FunctionSpy,
    revokePermissionToRole: FunctionSpy,
    login: FunctionSpy,
    isValid: FunctionSpy,
    canAccess: FunctionSpy
}

export class MockAuthServiceFactory extends MockServiceFactory {
    public getMockInstance(): MockAuthServiceInstance {
        const instance: MockAuthServiceInstance = {
            getUsers: createFunctionSpy(),
            getUser: createFunctionSpy(),
            createUser: createFunctionSpy(),
            updateUser: createFunctionSpy(),
            deleteUser: createFunctionSpy(),
            addRoleToUser: createFunctionSpy(),
            removeRoleFromUser: createFunctionSpy(),
            getPermissions: createFunctionSpy(),
            getPermission: createFunctionSpy(),
            createPermission: createFunctionSpy(),
            updatePermission: createFunctionSpy(),
            deletePermission: createFunctionSpy(),
            getRoles: createFunctionSpy(),
            getRole: createFunctionSpy(),
            createRole: createFunctionSpy(),
            updateRole: createFunctionSpy(),
            deleteRole: createFunctionSpy(),
            grantPermissionToUser: createFunctionSpy(),
            revokePermissionToUser: createFunctionSpy(),
            grantPermissionToRole: createFunctionSpy(),
            revokePermissionToRole: createFunctionSpy(),
            login: createFunctionSpy(),
            isValid: createFunctionSpy(),
            canAccess: createFunctionSpy()
        }

        instance.login.andReturn({ services: 'affiliate-portal', roles: [{ name: 'Facilitator', service: 'affiliate-portal' }] });

        return instance;
    }

}