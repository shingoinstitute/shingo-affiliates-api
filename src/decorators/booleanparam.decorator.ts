import { createParamDecorator, BadRequestException } from '@nestjs/common'
import { Request } from 'express'
import { ParamOptions, ParamDecorator, parseOptions } from './ParamOptions.interface'

/**
 * Decorator for a boolean parameter specified by header or query string
 * @param param Rules for the key of the header or query. When string, both are used with header taking priority
 * @returns boolean | undefined
 */
// tslint:disable-next-line:variable-name
export const BooleanParam = createParamDecorator((data: ParamOptions, req: Request) => {
  const { header, query, headerKey, queryKey } = parseOptions(data, req)
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
