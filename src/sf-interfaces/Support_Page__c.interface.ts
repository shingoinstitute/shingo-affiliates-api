type m<T> = T | null | undefined

// tslint:disable-next-line:class-name
export interface Support_Page__c {
  Id: string
  OwnerId: string
  Owner: object
  IsDeleted: boolean
  Name: string
  CreatedDate: string
  CreatedById: string
  CreatedBy: object
  LastModifiedDate: string
  LastModifiedById: string
  LastModifiedBy: object
  SystemModstamp: string
  LastActivityDate?: m<string>
  LastViewedDate?: m<string>
  LastReferencedDate?: m<string>
  Application__c: 'Affiliate Portal' | 'Shingo Events'
  Category__c: 'Other' | 'Authentication' | 'Workshops' | 'Dashboard'
  Content__c?: m<string>
  Restricted_To__c?: m<string>
  Title__c: string
}
