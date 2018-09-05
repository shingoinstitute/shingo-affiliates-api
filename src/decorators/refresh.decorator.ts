import { PipeTransform, Type } from '@nestjs/common'
import { BooleanParam } from './booleanparam.decorator'

// tslint:disable-next-line:variable-name
export const Refresh = (...pipes: Array<PipeTransform<any, any> | Type<PipeTransform<any, any>>>) =>
  BooleanParam({ header: 'force-refresh', query: 'refresh' }, ...pipes)
