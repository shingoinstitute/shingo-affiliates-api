import { PipeTransform, Type } from '@nestjs/common'
import { Request } from 'express'
import { Refined, RefinedExtra } from '../util'

/**
 * Annotates a type with a phantom field indicating that type is a Parameter
 */
export type Param<T, k extends ParamOptions> = Refined<
  T,
  ParamKey & NormalizeParamOptions<k>
>

/**
 * Normalizes Param options so that the fields query and header can always be accessed
 */
export type NormalizeParamOptions<T extends ParamOptions> = T extends string
  ? { query: T; header: T }
  : T extends { query: string; header: string }
  ? T
  : T extends { query: string }
  ? { query: T['query']; header?: never }
  : T extends { header: string }
  ? { header: T['header']; query?: never }
  : never

/**
 * Refinement key for Param
 */
export type ParamKey = 'Param'

/**
 * Used to extract additional information from the Param type
 * will return Exclude<ParamOptions, 'string'>
 */
export type ParamData<T> = RefinedExtra<T, ParamKey>

export type ParamOptions =
  | string
  | { query: string }
  | { header: string }
  | { query: string; header: string }

export type ParamDecorator = (
  param: ParamOptions,
  ...pipes: Array<PipeTransform<any, any> | Type<PipeTransform<any, any>>>
) => ParameterDecorator

export const parseOptions = (data: ParamOptions, req: Request) => {
  const headerKey =
    typeof data === 'string' ? data : (data as { header?: string }).header
  const queryKey =
    typeof data === 'string' ? data : (data as { query?: string }).query

  const header = headerKey && req.headers[`x-${headerKey}`]
  const query: string[] | string | object | undefined =
    queryKey && req.query[queryKey]

  return { header, query, headerKey, queryKey }
}
