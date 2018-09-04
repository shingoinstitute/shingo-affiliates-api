import { createParamDecorator, BadRequestException } from '@nestjs/common'
import { Request } from 'express'

// tslint:disable-next-line:variable-name
export const Refresh = createParamDecorator((_data, req: Request) => {
  const header = req.headers['x-force-refresh']
  const query = req.query.refresh
  const refreshParam = (header || query as string)

  // allow usage such as /route?refresh without explicit value
  if (refreshParam === '') {
    return true
  }

  if (!refreshParam) return false

  if (Array.isArray(refreshParam)) {
    throw new BadRequestException(`Refresh parameter ${refreshParam} is not a valid boolean string`)
  }

  const refresh = (refreshParam as string).toLowerCase()

  if (refresh !== 'true' && refresh !== 'false' && refresh !== 'yes' && refresh !== 'no') {
    throw new BadRequestException(`Refresh parameter ${refresh} is not a valid boolean string`)
  }

  return refresh === 'true' || refresh === 'yes'
})
