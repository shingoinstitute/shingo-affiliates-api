export interface Contact {
  readonly "Id": string
  readonly "IsDeleted": boolean
  readonly "MasterRecordId"?: string | null | undefined
  "AccountId"?: string | null | undefined
  "LastName": string
  "FirstName"?: string | null | undefined
  "Salutation"?: "Mr." | "Ms." | "Mrs." | "Dr." | "Prof." | null | undefined
  readonly "Name": string
  "RecordTypeId"?: string | null | undefined
  "OtherStreet"?: string | null | undefined
  "OtherCity"?: string | null | undefined
  "OtherState"?: string | null | undefined
  "OtherPostalCode"?: string | null | undefined
  "OtherCountry"?: string | null | undefined
  "OtherLatitude"?: number | null | undefined
  "OtherLongitude"?: number | null | undefined
  "OtherGeocodeAccuracy"?: "Address" | "NearAddress" | "Block" | "Street" | "ExtendedZip" | "Zip" | "Neighborhood" | "City" | "County" | "State" | "Unknown" | null | undefined
  readonly "OtherAddress"?: object | null | undefined
  "MailingStreet"?: string | null | undefined
  "MailingCity"?: string | null | undefined
  "MailingState"?: string | null | undefined
  "MailingPostalCode"?: string | null | undefined
  "MailingCountry"?: string | null | undefined
  "MailingLatitude"?: number | null | undefined
  "MailingLongitude"?: number | null | undefined
  "MailingGeocodeAccuracy"?: "Address" | "NearAddress" | "Block" | "Street" | "ExtendedZip" | "Zip" | "Neighborhood" | "City" | "County" | "State" | "Unknown" | null | undefined
  readonly "MailingAddress"?: object | null | undefined
  "Phone"?: string | null | undefined
  "Fax"?: string | null | undefined
  "MobilePhone"?: string | null | undefined
  "HomePhone"?: string | null | undefined
  "OtherPhone"?: string | null | undefined
  "AssistantPhone"?: string | null | undefined
  "ReportsToId"?: string | null | undefined
  "Email"?: string | null | undefined
  "Title"?: string | null | undefined
  "Department"?: string | null | undefined
  "AssistantName"?: string | null | undefined
  "LeadSource"?: "Advertisement" | "Employee Referral" | "External Referral" | "Partner" | "Public Relations" | "Seminar - Internal" | "Seminar - Partner" | "Trade Show" | "Web" | "Word of mouth" | "Other" | "Bob" | null | undefined
  "Birthdate"?: string | null | undefined
  "Description"?: string | null | undefined
  "OwnerId": string
  readonly "CreatedDate": string
  readonly "CreatedById": string
  readonly "LastModifiedDate": string
  readonly "LastModifiedById": string
  readonly "SystemModstamp": string
  readonly "LastActivityDate"?: string | null | undefined
  readonly "LastCURequestDate"?: string | null | undefined
  readonly "LastCUUpdateDate"?: string | null | undefined
  readonly "LastViewedDate"?: string | null | undefined
  readonly "LastReferencedDate"?: string | null | undefined
  "EmailBouncedReason"?: string | null | undefined
  "EmailBouncedDate"?: string | null | undefined
  readonly "IsEmailBounced": boolean
  readonly "PhotoUrl"?: string | null | undefined
  "Jigsaw"?: string | null | undefined
  readonly "JigsawContactId"?: string | null | undefined
  "Suffix__c"?: string | null | undefined
  "Middle_Names__c"?: string | null | undefined
  "Shingo_Prize_Relationship__c"?: string | null | undefined
  "A_Number__c"?: string | null | undefined
  "Publication__c"?: "Automotive" | "General" | "Healthcare" | "Manufacturing" | "Technology" | null | undefined
  "Asst_Email__c"?: string | null | undefined
  "Other_Email__c"?: string | null | undefined
  readonly "Contact_Quality__c"?: number | null | undefined
  "Shirt_Size__c"?: string | null | undefined
  "Industry_Type__c"?: string | null | undefined
  "Industry__c"?: string | null | undefined
  "Biography__c"?: string | null | undefined
  "Photograph__c"?: string | null | undefined
  "Facilitator_For__c"?: string | null | undefined
  "Job_History__c"?: string | null | undefined
  "From_Old_Fileserver__c": boolean
  "Most_Recent_Workshop__c"?: string | null | undefined
  "Most_Recent_Affiliate_Webinar__c"?: string | null | undefined
  "Full_Name_and_Email__c"?: string | null | undefined
  "Most_Recent_Examiner_Webinar__c"?: string | null | undefined
  readonly "Workshop_Evaluation_Subject_Line__c"?: string | null | undefined
  readonly "MasterRecord"?: import("./Contact.sf").default | null | undefined
  "Account"?: import("./Account.sf").default | null | undefined
  "RecordType"?: import("./RecordType.sf").default | null | undefined
  "ReportsTo"?: import("./Contact.sf").default | null | undefined
  "Owner": object
  readonly "CreatedBy": object
  readonly "LastModifiedBy": object
  "Facilitator_For__r"?: import("./Account.sf").default | null | undefined
  "Most_Recent_Workshop__r"?: import("./Workshop__c.sf").default | null | undefined
  "Most_Recent_Affiliate_Webinar__r"?: object | null | undefined
  "Most_Recent_Examiner_Webinar__r"?: object | null | undefined
  "AcceptedEventRelations"?: Array<object> | null | undefined
  "AccountContactRoles"?: Array<object> | null | undefined
  "ActivityHistories"?: Array<object> | null | undefined
  "Assessments__r"?: Array<object> | null | undefined
  "Assessments1__r"?: Array<object> | null | undefined
  "Assets"?: Array<object> | null | undefined
  "AttachedContentDocuments"?: Array<object> | null | undefined
  "AttachedContentNotes"?: Array<object> | null | undefined
  "Attachments"?: Array<import("./Attachment.sf").default> | null | undefined
  "CampaignMembers"?: Array<object> | null | undefined
  "Cases"?: Array<object> | null | undefined
  "CaseContactRoles"?: Array<object> | null | undefined
  "Checkouts__r"?: Array<object> | null | undefined
  "CombinedAttachments"?: Array<object> | null | undefined
  "Histories"?: Array<object> | null | undefined
  "Shares"?: Array<object> | null | undefined
  "ContentDocumentLinks"?: Array<object> | null | undefined
  "ContractsSigned"?: Array<object> | null | undefined
  "ContractContactRoles"?: Array<object> | null | undefined
  "Core_Shingo_Surveys__r"?: Array<object> | null | undefined
  "DeclinedEventRelations"?: Array<object> | null | undefined
  "DuplicateRecordItems"?: Array<object> | null | undefined
  "EmailMessageRelations"?: Array<object> | null | undefined
  "EmailStatuses"?: Array<object> | null | undefined
  "Events"?: Array<object> | null | undefined
  "EventRelations"?: Array<object> | null | undefined
  "Failed_Check_Ins__r"?: Array<object> | null | undefined
  "Insight_Applications1__r"?: Array<object> | null | undefined
  "Insight_Applications2__r"?: Array<object> | null | undefined
  "Insight_Applications3__r"?: Array<object> | null | undefined
  "Insight_Applications__r"?: Array<object> | null | undefined
  "Instructor_Evaluations__r"?: Array<object> | null | undefined
  "Leads__r"?: Array<object> | null | undefined
  "Notes"?: Array<object> | null | undefined
  "NotesAndAttachments"?: Array<object> | null | undefined
  "OpenActivities"?: Array<object> | null | undefined
  "OpportunityContactRoles"?: Array<object> | null | undefined
  "OutgoingEmailRelations"?: Array<object> | null | undefined
  "ProcessInstances"?: Array<object> | null | undefined
  "ProcessSteps"?: Array<object> | null | undefined
  "Publication_Awards1__r"?: Array<object> | null | undefined
  "RecordActions"?: Array<object> | null | undefined
  "Research_Awards__r"?: Array<object> | null | undefined
  "Shingo_Event_Registrations__r"?: Array<object> | null | undefined
  "Shingo_Speakers__r"?: Array<object> | null | undefined
  "Personas"?: Array<object> | null | undefined
  "Tasks"?: Array<object> | null | undefined
  "TopicAssignments"?: Array<object> | null | undefined
  "UndecidedEventRelations"?: Array<object> | null | undefined
  "Users"?: Array<object> | null | undefined
  "WebinarAttendees__r"?: Array<object> | null | undefined
  "Workshops__r"?: Array<import("./WorkshopFacilitatorAssociation__c.sf").default> | null | undefined
  "Workshops_Attended__r"?: Array<object> | null | undefined
  "Workshop_Evaluations__r"?: Array<object> | null | undefined
  "Course_Manager_Of__r"?: Array<import("./Workshop__c.sf").default> | null | undefined
}
export default Contact
export const name = "Contact"
export type name = typeof name
