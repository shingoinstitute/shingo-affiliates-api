import { Overwrite } from '../util'

export type SFGeneratedFields =
  | 'OwnerId'
  | 'Owner'
  | 'CreatedDate'
  | 'CreatedById'
  | 'CreatedBy'
  | 'LastModifiedDate'
  | 'LastModifiedBy'
  | 'LastModifiedById'
  | 'SystemModstamp'
  | 'IsDeleted'

export type ForSalesforce<T> = T extends any[]
  ? ForSalesforceArray<T[number]>
  : T extends object ? ForSalesforceObject<T> : T
interface ForSalesforceArray<T> extends Array<ForSalesforce<T>> {}
type ForSalesforceObject<T> = Overwrite<
  { [P in keyof T]: ForSalesforce<T[P]> },
  { [P in keyof T & SFGeneratedFields]+?: ForSalesforce<T[P]> }
>
