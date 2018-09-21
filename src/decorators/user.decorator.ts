import { createParamDecorator } from '@nestjs/common'
import { Request } from 'express'

// tslint:disable-next-line:variable-name
export const User = createParamDecorator((_data: any, req: Request) => req.user)
