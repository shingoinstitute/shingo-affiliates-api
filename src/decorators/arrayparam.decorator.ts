import { createParamDecorator, PipeTransform, Type } from '@nestjs/common'
import { Request } from 'express'
import qs from 'qs'

// tslint:disable-next-line:variable-name
export const ArrayParam = createParamDecorator((data: string, req: Request) => {
  const header = req.headers[`x-${data}`]
  const query = req.query[data]

  // header was somehow already parsed to array
  if (Array.isArray(header)) {
    return header
  }

  // try to parse header
  const headerParsed = header && qs.parse(header as string)

  if (headerParsed && Array.isArray(headerParsed[data])) {
    return headerParsed[data]
  }

  if (!Array.isArray(query)) {
    // we did not successfully parse the header, so use orignal value
    const arr = header || query

    // comma delimited, since qs didn't parse to array
    if (typeof arr === 'string') {
      const delimited = arr.split(',').map(v => v.trim())
      // occurs when query is just empty. we don't want the empty string to become a non-empty array
      return delimited.length === 1 && delimited[0] === ''
        ? []
        : delimited
    }
  } else {
    // query already was parsed using qs by express
    return query
  }

  return []
}) as (param: string, ...pipes: Array<PipeTransform<any, any> | Type<PipeTransform<any, any>>>) => ParameterDecorator
