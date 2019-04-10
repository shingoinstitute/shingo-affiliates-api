export interface Support_Page__c {
  readonly "Id": string
  "OwnerId": string
  readonly "IsDeleted": boolean
  readonly "Name": string
  readonly "CreatedDate": string
  readonly "CreatedById": string
  readonly "LastModifiedDate": string
  readonly "LastModifiedById": string
  readonly "SystemModstamp": string
  readonly "LastActivityDate"?: string | null | undefined
  readonly "LastViewedDate"?: string | null | undefined
  readonly "LastReferencedDate"?: string | null | undefined
  "Application__c": "Affiliate Portal" | "Shingo Events"
  "Category__c": "Other" | "Authentication" | "Workshops" | "Dashboard" | "Affiliates" | "Facilitators"
  "Content__c"?: string | null | undefined
  "Restricted_To__c"?: string | null | undefined
  "Title__c": string
  "Owner": object | object
  readonly "CreatedBy": object
  readonly "LastModifiedBy": object
  "ActivityHistories"?: Array<object> | null | undefined
  "AttachedContentDocuments"?: Array<object> | null | undefined
  "AttachedContentNotes"?: Array<object> | null | undefined
  "Attachments"?: Array<import("./Attachment.sf").default> | null | undefined
  "CombinedAttachments"?: Array<object> | null | undefined
  "ContentDocumentLinks"?: Array<object> | null | undefined
  "DuplicateRecordItems"?: Array<object> | null | undefined
  "Emails"?: Array<object> | null | undefined
  "Events"?: Array<object> | null | undefined
  "Notes"?: Array<object> | null | undefined
  "NotesAndAttachments"?: Array<object> | null | undefined
  "OpenActivities"?: Array<object> | null | undefined
  "ProcessInstances"?: Array<object> | null | undefined
  "ProcessSteps"?: Array<object> | null | undefined
  "RecordActions"?: Array<object> | null | undefined
  "Shares"?: Array<object> | null | undefined
  "Tasks"?: Array<object> | null | undefined
  "TopicAssignments"?: Array<object> | null | undefined
}
export default Support_Page__c
export const name = "Support_Page__c"
export type name = typeof name
