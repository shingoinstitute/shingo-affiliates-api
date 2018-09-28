import { CanActivate, ExecutionContext } from '@nestjs/common'

export const authGuardMock = (allow = true) => {
  return class AuthGuardMock implements CanActivate {
    canActivate(_context: ExecutionContext) {
      return allow
    }
  }
}
