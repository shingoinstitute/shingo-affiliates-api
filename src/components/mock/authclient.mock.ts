import { AuthClient, authservices } from '@shingo/auth-api-client'
import { id } from '../../util/fp'

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
  users: Array<Required<authservices.User>>,
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
