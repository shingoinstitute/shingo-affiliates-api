import { createParamDecorator, BadRequestException } from '@nestjs/common'
import { Request } from 'express'
import { ParamOptions, ParamDecorator } from './ParamOptions.interface'

/**
 * Decorator for a boolean parameter specified by header or query string
 * @param param Rules for the key of the header or query. When string, both are used with header taking priority
 * @returns boolean | undefined
 */
// tslint:disable-next-line:variable-name
export const BooleanParam = createParamDecorator((data: ParamOptions, req: Request) => {
  const headerKey = typeof data === 'string' ? data : (data as {header?: string}).header
  const queryKey = typeof data === 'string' ? data : (data as {query?: string}).query

  const header = headerKey && req.headers[`x-${headerKey}`]
  const query: string | object | string[] | undefined = queryKey && req.query[queryKey]
  // for some reason string[] is dropped from the union here. Probably because a string[] is also an object
  const boolParam = header || query

  if (typeof boolParam !== 'string' && typeof boolParam !== 'undefined') {
    throw new BadRequestException(
      `Parameter ${headerKey || queryKey} with value ${boolParam} is not a valid boolean string`
    )
  }

  const bool = boolParam && boolParam.toLowerCase()

  // allow usage such as /route?refresh without explicit value
  if (bool === '') {
    return true
  }

  if (typeof bool !== 'undefined' && bool !== 'true' && bool !== 'false' && bool !== 'yes' && bool !== 'no') {
    throw new BadRequestException(
      `Parameter ${headerKey || queryKey} with value ${boolParam} is not a valid boolean string`
    )
  }

  // we return undefined if the parameter was not specified.
  // Allows for differentiation between explicit false and exclusion of the parameter
  return bool && (bool === 'true' || bool === 'yes')
}) as ParamDecorator
