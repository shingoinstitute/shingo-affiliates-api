import { PipeTransform, Type } from '@nestjs/common'
import { BooleanParam } from './booleanparam.decorator'
import { Param } from './ParamOptions.interface'

// tslint:disable-next-line:interface-over-type-literal
export type RefreshData = {
  header: 'force-refresh'
  query: 'refresh'
}
export type RefreshParam<T> = Param<T, RefreshData>

// tslint:disable-next-line:variable-name
export const Refresh = (
  ...pipes: Array<PipeTransform<any, any> | Type<PipeTransform<any, any>>>
) => BooleanParam({ header: 'force-refresh', query: 'refresh' }, ...pipes)
