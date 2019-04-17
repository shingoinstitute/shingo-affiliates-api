import { createParamDecorator, BadRequestException } from '@nestjs/common'
import { Request } from 'express'
import qs from 'qs'
import {
  ParamOptions,
  ParamDecorator,
  parseOptions,
} from './ParamOptions.interface'

/**
 * Decorator for an array parameter specified by header or query string
 * @param param Rules for the key of the header or query. When string, both are used with header taking priority
 * @returns string[] | undefined
 */
// tslint:disable-next-line:variable-name
export const ArrayParam = createParamDecorator(
  (data: ParamOptions, req: Request) => {
    const { header, query, headerKey, queryKey } = parseOptions(data, req)

    // header was somehow already parsed to array
    if (Array.isArray(header)) {
      return header
    }

    // try to parse header
    const headerParsed =
      typeof header !== 'undefined'
        ? (qs.parse(header) as { [key: string]: string[] })
        : undefined // needed because when using header && qs.parse(header), typescript gave us "" | string[] | undefined

    if (headerParsed && Array.isArray(headerParsed[headerKey!])) {
      return headerParsed[headerKey!]
    }

    if (!Array.isArray(query)) {
      // we did not successfully parse the header, so use orignal value
      const arr = header || query

      if (typeof arr === 'object') {
        throw new BadRequestException(
          `Parameter ${headerKey ||
            queryKey} with value ${arr} is not a valid array`
        )
      }

      // comma delimited, since qs didn't parse to array
      const delimited =
        typeof arr !== 'undefined'
          ? arr.split(',').map(v => v.trim())
          : undefined

      // occurs when query is just empty. we don't want the empty string to become a non-empty array
      return delimited && delimited.length === 1 && delimited[0] === ''
        ? []
        : delimited
    } else {
      // query already was parsed using qs by express
      return query
    }
  }
) as ParamDecorator
