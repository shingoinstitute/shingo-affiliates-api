import { PipeTransform, Type } from '@nestjs/common'

export type ParamOptions = string | { query: string } | { header: string } | { query: string, header: string }
export type ParamDecorator = (
  param: ParamOptions,
  ...pipes: Array<PipeTransform<any, any> | Type<PipeTransform<any, any>>>
) => ParameterDecorator
