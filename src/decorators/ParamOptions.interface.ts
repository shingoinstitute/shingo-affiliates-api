import { PipeTransform, Type } from '@nestjs/common'
import { Request } from 'express'

export type ParamOptions = string | { query: string } | { header: string } | { query: string, header: string }
export type ParamDecorator = (
  param: ParamOptions,
  ...pipes: Array<PipeTransform<any, any> | Type<PipeTransform<any, any>>>
) => ParameterDecorator

export const parseOptions = (data: ParamOptions, req: Request) => {
  const headerKey = typeof data === 'string' ? data : (data as {header?: string}).header
  const queryKey = typeof data === 'string' ? data : (data as {query?: string}).query

  const header = headerKey && req.headers[`x-${headerKey}`]
  const query: string[] | string | object | undefined = queryKey && req.query[queryKey]

  return { header, query, headerKey, queryKey }
}
