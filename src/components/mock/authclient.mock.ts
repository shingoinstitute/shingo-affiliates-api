import { AuthClient, authservices } from '@shingo/auth-api-client'
import { id } from '../../util/fp'

export interface AuthState {
  Permission: Array<Required<authservices.Permission>>
  Role: Array<Required<authservices.Role>>
  User: Array<Required<authservices.User>>
}

export const mockLogin = (
  database: Array<{ email: string; password: string }>,
  jwt: (email: string) => string = id,
): AuthClient['login'] => async creds => {
  const foundUser = database.find(e => e.email === creds.email)
  if (!foundUser) {
    throw new Error('EMAIL_NOT_FOUND')
  }
  if (foundUser.password !== creds.password) {
    throw new Error('INVALID_PASSWORD')
  }

  return jwt(foundUser.email)
}

export const mockGetUser = (users: {
  [clause: string]: authservices.User
}): AuthClient['getUser'] => async clause =>
  typeof clause === 'undefined' || clause === ''
    ? (Object.keys(users).length && users[Object.keys(users)[0]]) || undefined
    : users[clause]

export const mockLoginAs = (
  users: Array<{ id: number; jwt: string; permissionFor: number[] }>,
): AuthClient['loginAs'] => async req => {
  const adminUser = users.find(u => u.id === req.adminId)
  if (!adminUser) {
    throw new Error()
  }

  if (!adminUser.permissionFor.includes(req.userId)) {
    throw new Error(`Invalid permissions for 'user -- ${req.userId}'`)
  }

  const reqUser = users.find(u => u.id === req.userId)

  if (!reqUser) {
    throw new Error('Invalid User ID')
  }

  return reqUser.jwt
}

export const mockUpdateUser = (
  users: AuthState['User'],
): AuthClient['updateUser'] => async updateData => {
  // don't bother searching by extId since none of the mocked methods use extId
  // will add later if tests start failing
  const userIdx = users.findIndex(u => u.id === updateData.id)
  if (userIdx < 0) {
    throw new Error(`Id, ${updateData.id} did not map to a user.`)
  }

  users[userIdx] = { ...users[userIdx], ...updateData }

  return true
}

export const mockGetRoles = (
  roles: Record<string, AuthState['Role']>,
): AuthClient['getRoles'] => async clause =>
  typeof clause === 'undefined' || clause === ''
    ? (Object.keys(roles).length && roles[Object.keys(roles)[0]]) || []
    : roles[clause]

const getNextId = (prev: Array<{ id: number }>) =>
  // seed with -1 so that the first id given an empty prev array will be 0
  Math.max(...prev.map(p => p.id), -1) + 1

export const mockCreateRole = (
  initialState: Pick<AuthState, 'Role'>,
): AuthClient['createRole'] => async data => {
  const nextId = getNextId(initialState.Role)

  const newObj: Required<authservices.Role> = {
    ...data,
    id: nextId,
    permissions: [],
    users: [],
    _TagEmpty: false,
  }

  initialState.Role.push(newObj)

  return newObj
}

export const mockGrantPermissionToRole = (
  initialState: Pick<AuthState, 'Role' | 'Permission'>,
): AuthClient['grantPermissionToRole'] => async (
  resource,
  level,
  accessorId,
) => {
  const role = initialState.Role.find(r => r.id === accessorId)
  if (!role) throw new Error(`Role ${accessorId} doesn't exist`)

  const existingPerm = await mockCreatePermission(initialState)({
    resource,
    level,
  })
  role.permissions.push(existingPerm)
  if (!existingPerm.roles) {
    existingPerm.roles = []
  }
  existingPerm.roles.push(role)

  return { accessorId, permissionId: existingPerm.id }
}

export const mockCreatePermission = (
  initialState: Pick<AuthState, 'Permission'>,
): AuthClient['createPermission'] => async data => {
  const { resource, level } = data

  let existingPerm = initialState.Permission.find(
    p => p.resource === resource && p.level === level,
  )
  if (!existingPerm) {
    const nextId = getNextId(initialState.Permission)
    existingPerm = {
      resource,
      level,
      users: [],
      roles: [],
      id: nextId,
      _TagEmpty: false,
    }
  }

  return data
}

export const mockDeletePermission = (
  initialState: AuthState,
): AuthClient['deletePermission'] => async (
  obj: string | { id: number },
  level?: 0 | 1 | 2,
) => {
  const perm = initialState.Permission.find(
    p =>
      typeof obj === 'string'
        ? p.resource === obj && p.level === level
        : p.id === obj.id,
  )

  if (!perm) return true

  initialState.User.forEach(u => {
    const idx = (u.permissions || []).findIndex(p => p === perm)
    if (idx === -1) return
    ;(u.permissions || []).splice(idx, 1)
  })

  initialState.Role.forEach(u => {
    const idx = (u.permissions || []).findIndex(p => p === perm)
    if (idx === -1) return
    ;(u.permissions || []).splice(idx, 1)
  })

  return true
}
