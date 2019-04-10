export interface WorkshopFacilitatorAssociation__c {
  readonly "Id": string
  readonly "IsDeleted": boolean
  readonly "Name": string
  readonly "CreatedDate": string
  readonly "CreatedById": string
  readonly "LastModifiedDate": string
  readonly "LastModifiedById": string
  readonly "SystemModstamp": string
  "Instructor__c": string
  "Workshop__c": string
  readonly "Instructor_Full_Name__c"?: string | null | undefined
  readonly "CreatedBy": object
  readonly "LastModifiedBy": object
  "Instructor__r": import("./Contact.sf").default
  "Workshop__r": import("./Workshop__c.sf").default
  "AttachedContentDocuments"?: Array<object> | null | undefined
  "AttachedContentNotes"?: Array<object> | null | undefined
  "Attachments"?: Array<import("./Attachment.sf").default> | null | undefined
  "CombinedAttachments"?: Array<object> | null | undefined
  "ContentDocumentLinks"?: Array<object> | null | undefined
  "DuplicateRecordItems"?: Array<object> | null | undefined
  "Emails"?: Array<object> | null | undefined
  "Instructor_Evaluations__r"?: Array<object> | null | undefined
  "Notes"?: Array<object> | null | undefined
  "NotesAndAttachments"?: Array<object> | null | undefined
  "ProcessInstances"?: Array<object> | null | undefined
  "ProcessSteps"?: Array<object> | null | undefined
  "RecordActions"?: Array<object> | null | undefined
  "TopicAssignments"?: Array<object> | null | undefined
}
export default WorkshopFacilitatorAssociation__c
export const name = "WorkshopFacilitatorAssociation__c"
export type name = typeof name
