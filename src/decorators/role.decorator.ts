import { ReflectMetadata } from '@nestjs/common'
import { SetMode, any } from './permission.decorator'
import { Token } from '../util'

export type RoleSetType = [SetMode, string[]]
export const ROLE_KEY = new Token<RoleSetType>('org.shingo.affiliates.roles')

// tslint:disable-next-line:variable-name
export function Role(mode: SetMode, ...roles: [string, ...string[]])
export function Role(...roles: [string, ...string[]])
export function Role(...data: [SetMode | string, ...string[]]) {
  const [first, ...rest] = data
  const type = typeof first === 'symbol' ? first : any
  const perms = typeof first === 'symbol' ? rest : (data as string[])
  return ReflectMetadata(ROLE_KEY, [type, perms])
}
