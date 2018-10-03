type m<T> = T | null | undefined
export interface RecordType {
  Id: string
  Name: string
  DeveloperName: string
  NamespacePrefix?: m<string>
  Description?: m<string>
  BusinessProcessId?: m<string>
  SobjectType: string
  IsActive: boolean
  CreatedById: string
  CreatedBy: object
  CreatedDate: string
  LastModifiedDate: string
  LastModifiedById: string
  LastModifiedBy: object
  SystemModstamp: string
}
