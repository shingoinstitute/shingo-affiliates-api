import { ReflectMetadata } from '@nestjs/common'
import { Token } from '../util'

export const all = Symbol('all')
export const any = Symbol('any')
export type SetMode = typeof all | typeof any

export type PermissionType = [1 | 2, string?]
export type PermissionSetType = [SetMode, PermissionType[]]
export const PERM_KEY = new Token<PermissionSetType>(
  'org.shingo.affiliates.permissions',
)

// tslint:disable-next-line:variable-name
export function Permission(
  mode: SetMode,
  ...perms: [PermissionType, ...PermissionType[]]
)
export function Permission(...perms: [PermissionType, ...PermissionType[]])
export function Permission(
  ...data: [SetMode | PermissionType, ...PermissionType[]]
) {
  const [first, ...rest] = data
  const type = typeof first === 'symbol' ? first : any
  const perms = typeof first === 'symbol' ? rest : (data as PermissionType[])
  return ReflectMetadata(PERM_KEY, [type, perms])
}
