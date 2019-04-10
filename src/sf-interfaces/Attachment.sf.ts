export interface Attachment {
  readonly "Id": string
  readonly "IsDeleted": boolean
  "ParentId": string
  "Name": string
  "IsPrivate": boolean
  "ContentType"?: string | null | undefined
  readonly "BodyLength"?: number | null | undefined
  "Body": string
  "OwnerId": string
  readonly "CreatedDate": string
  readonly "CreatedById": string
  readonly "LastModifiedDate": string
  readonly "LastModifiedById": string
  readonly "SystemModstamp": string
  "Description"?: string | null | undefined
  "Parent": import("./Account.sf").default | object | object | object | object | object | object | object | import("./Contact.sf").default | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | object | import("./Support_Page__c.sf").default | object | object | object | object | object | import("./WorkshopFacilitatorAssociation__c.sf").default | object | object | import("./Workshop__c.sf").default | object | object | object | object | object | object
  "Owner": object
  readonly "CreatedBy": object | object
  readonly "LastModifiedBy": object | object
}
export default Attachment
export const name = "Attachment"
export type name = typeof name
