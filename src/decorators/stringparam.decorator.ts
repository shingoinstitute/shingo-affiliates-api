import { createParamDecorator, BadRequestException } from '@nestjs/common'
import { Request } from 'express'
import { ParamOptions, ParamDecorator, parseOptions } from './ParamOptions.interface'

/**
 * Decorator for a string parameter specified by header or query string
 * @param param Rules for the key of the header or query. When string, both are used with header taking priority
 * @returns string | undefined
 */
// tslint:disable-next-line:variable-name
export const StringParam = createParamDecorator((data: ParamOptions, req: Request) => {
  const { header, query, headerKey, queryKey } = parseOptions(data, req)
  const stringParam = header || query

  if (typeof stringParam !== 'string' && typeof stringParam !== 'undefined') {
    throw new BadRequestException(
      `Parameter ${headerKey || queryKey} with value ${stringParam} is not a valid string`
    )
  }

  return stringParam
}) as ParamDecorator
