import { createFunctionSpy, FunctionSpy } from 'alsatian';
import { MockInstance } from '../../factories/service.factory';

export class MockAuthServiceInstance extends MockInstance {

    constructor() {
        super();
        this.login.andReturn({ services: 'affiliate-portal', roles: [{ name: 'Facilitator', service: 'affiliate-portal' }] });
        this.getRoles.andReturn({ roles: [] });
    }

    getUsers: FunctionSpy = createFunctionSpy();
    getUser: FunctionSpy = createFunctionSpy();
    createUser: FunctionSpy = createFunctionSpy();
    updateUser: FunctionSpy = createFunctionSpy();
    deleteUser: FunctionSpy = createFunctionSpy();
    addRoleToUser: FunctionSpy = createFunctionSpy();
    removeRoleFromUser: FunctionSpy = createFunctionSpy();
    getPermissions: FunctionSpy = createFunctionSpy();
    getPermission: FunctionSpy = createFunctionSpy();
    createPermission: FunctionSpy = createFunctionSpy();
    updatePermission: FunctionSpy = createFunctionSpy();
    deletePermission: FunctionSpy = createFunctionSpy();
    getRoles: FunctionSpy = createFunctionSpy();
    getRole: FunctionSpy = createFunctionSpy();
    createRole: FunctionSpy = createFunctionSpy();
    updateRole: FunctionSpy = createFunctionSpy();
    deleteRole: FunctionSpy = createFunctionSpy();
    grantPermissionToUser: FunctionSpy = createFunctionSpy();
    revokePermissionToUser: FunctionSpy = createFunctionSpy();
    grantPermissionToRole: FunctionSpy = createFunctionSpy();
    revokePermissionToRole: FunctionSpy = createFunctionSpy();
    login: FunctionSpy = createFunctionSpy();
    isValid: FunctionSpy = createFunctionSpy();
    canAccess: FunctionSpy
}