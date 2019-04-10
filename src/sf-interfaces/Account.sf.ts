export interface Account {
  readonly "Id": string
  readonly "IsDeleted": boolean
  readonly "MasterRecordId"?: string | null | undefined
  "Name": string
  "Type"?: "Analyst" | "Competitor" | "Customer" | "Integrator" | "Investor" | "Partner" | "Press" | "Prospect" | "Reseller" | "Other" | null | undefined
  "RecordTypeId"?: string | null | undefined
  "ParentId"?: string | null | undefined
  "BillingStreet"?: string | null | undefined
  "BillingCity"?: string | null | undefined
  "BillingState"?: string | null | undefined
  "BillingPostalCode"?: string | null | undefined
  "BillingCountry"?: string | null | undefined
  "BillingLatitude"?: number | null | undefined
  "BillingLongitude"?: number | null | undefined
  "BillingGeocodeAccuracy"?: "Address" | "NearAddress" | "Block" | "Street" | "ExtendedZip" | "Zip" | "Neighborhood" | "City" | "County" | "State" | "Unknown" | null | undefined
  readonly "BillingAddress"?: object | null | undefined
  "ShippingStreet"?: string | null | undefined
  "ShippingCity"?: string | null | undefined
  "ShippingState"?: string | null | undefined
  "ShippingPostalCode"?: string | null | undefined
  "ShippingCountry"?: string | null | undefined
  "ShippingLatitude"?: number | null | undefined
  "ShippingLongitude"?: number | null | undefined
  "ShippingGeocodeAccuracy"?: "Address" | "NearAddress" | "Block" | "Street" | "ExtendedZip" | "Zip" | "Neighborhood" | "City" | "County" | "State" | "Unknown" | null | undefined
  readonly "ShippingAddress"?: object | null | undefined
  "Phone"?: string | null | undefined
  "Fax"?: string | null | undefined
  "Website"?: string | null | undefined
  readonly "PhotoUrl"?: string | null | undefined
  "Industry"?: "Agriculture" | "Automotive" | "Aviation & Aerospace" | "Banking" | "Biotechnology" | "Chemicals" | "Communications" | "Computer & Electronics" | "Construction" | "Consulting" | "Consumer Goods" | "Defense Contractor" | "Education" | "Energy" | "Engineering" | "Entertainment" | "Environmental" | "Finance" | "Food & Beverage" | "Government" | "Healthcare" | "Heavy Equipment" | "Hospitality" | "Insurance" | "Manufacturing" | "Media" | "Military" | "Not For Profit" | "Other" | "Pharmaceutical" | "Printing" | "Recreation" | "Retail" | "Shipping" | "Technology" | "Telecommunications" | "Textiles & Apparel" | "Transportation" | "Utilities" | "Medical Device" | null | undefined
  "AnnualRevenue"?: number | null | undefined
  "NumberOfEmployees"?: number | null | undefined
  "Description"?: string | null | undefined
  "OwnerId": string
  readonly "CreatedDate": string
  readonly "CreatedById": string
  readonly "LastModifiedDate": string
  readonly "LastModifiedById": string
  readonly "SystemModstamp": string
  readonly "LastActivityDate"?: string | null | undefined
  readonly "LastViewedDate"?: string | null | undefined
  readonly "LastReferencedDate"?: string | null | undefined
  "Jigsaw"?: string | null | undefined
  readonly "JigsawCompanyId"?: string | null | undefined
  "AccountSource"?: "Advertisement" | "Employee Referral" | "External Referral" | "Partner" | "Public Relations" | "Seminar - Internal" | "Seminar - Partner" | "Trade Show" | "Web" | "Word of mouth" | "Other" | "Bob" | null | undefined
  "SicDesc"?: string | null | undefined
  "Legal_Entity__c"?: string | null | undefined
  "Industry_Sub_category__c"?: "Academic" | "Agriculture" | "Automotive" | "Aviation & Aerospace" | "Banking & Finance" | "Chemical" | "Communications" | "Computer & Electronics" | "Construction" | "Consulting" | "Consumer Goods" | "Defense Contractor" | "Distribution" | "Energy" | "Engineering" | "Entertainment" | "Food & Beverages" | "Healthcare Provider" | "Heavy Equipment" | "Insurance" | "Logistics" | "Maintenance, Repair, Overhaul" | "Maritime" | "Media" | "Medical Devices" | "Non-Profit" | "Other" | "Pharmaceutical" | "Printing" | "Pulp & Paper" | "R & D" | "Recreation Vehicles" | "Steel" | "Textiles & Apparel" | "Information Technology & Software" | "MEPs & Lean Consortiums" | "Media Outlet" | null | undefined
  "Industry_Type__c"?: "Government" | "Manufacturing" | "Defense" | "Services" | null | undefined
  "App_Abstract__c"?: string | null | undefined
  "Logo__c"?: string | null | undefined
  "Public_Contact_Email__c"?: string | null | undefined
  "Page_Path__c"?: string | null | undefined
  "Summary__c"?: string | null | undefined
  "Locations__c"?: string | null | undefined
  "Languages__c"?: string | null | undefined
  "Industry_List__c"?: string | null | undefined
  "Public_Contact_Phone__c"?: string | null | undefined
  "Public_Contact__c"?: string | null | undefined
  "Youtube_Path__c"?: string | null | undefined
  readonly "MasterRecord"?: import("./Account.sf").default | null | undefined
  "RecordType"?: import("./RecordType.sf").default | null | undefined
  "Parent"?: import("./Account.sf").default | null | undefined
  "Owner": object
  readonly "CreatedBy": object
  readonly "LastModifiedBy": object
  "ChildAccounts"?: Array<import("./Account.sf").default> | null | undefined
  "AccountContactRoles"?: Array<object> | null | undefined
  "Histories"?: Array<object> | null | undefined
  "AccountPartnersFrom"?: Array<object> | null | undefined
  "AccountPartnersTo"?: Array<object> | null | undefined
  "Shares"?: Array<object> | null | undefined
  "ActivityHistories"?: Array<object> | null | undefined
  "Assets"?: Array<object> | null | undefined
  "AttachedContentDocuments"?: Array<object> | null | undefined
  "AttachedContentNotes"?: Array<object> | null | undefined
  "Attachments"?: Array<import("./Attachment.sf").default> | null | undefined
  "Cases"?: Array<object> | null | undefined
  "CombinedAttachments"?: Array<object> | null | undefined
  "Contacts"?: Array<import("./Contact.sf").default> | null | undefined
  "Current_Facilitator__r"?: Array<import("./Contact.sf").default> | null | undefined
  "ContentDocumentLinks"?: Array<object> | null | undefined
  "Contracts"?: Array<object> | null | undefined
  "DuplicateRecordItems"?: Array<object> | null | undefined
  "Emails"?: Array<object> | null | undefined
  "Events"?: Array<object> | null | undefined
  "Insight_Applications1__r"?: Array<object> | null | undefined
  "Insight_Applications__r"?: Array<object> | null | undefined
  "Notes"?: Array<object> | null | undefined
  "NotesAndAttachments"?: Array<object> | null | undefined
  "OpenActivities"?: Array<object> | null | undefined
  "Opportunities"?: Array<object> | null | undefined
  "OpportunityPartnersTo"?: Array<object> | null | undefined
  "PartnersFrom"?: Array<object> | null | undefined
  "PartnersTo"?: Array<object> | null | undefined
  "ProcessInstances"?: Array<object> | null | undefined
  "ProcessSteps"?: Array<object> | null | undefined
  "RecordActions"?: Array<object> | null | undefined
  "Shingo_Exhibitors__r"?: Array<object> | null | undefined
  "Shingo_Recipients__r"?: Array<object> | null | undefined
  "Shingo_Speakers__r"?: Array<object> | null | undefined
  "Shingo_Sponsors__r"?: Array<object> | null | undefined
  "Personas"?: Array<object> | null | undefined
  "Tasks"?: Array<object> | null | undefined
  "TopicAssignments"?: Array<object> | null | undefined
  "Users"?: Array<object> | null | undefined
  "Organizing_Affiliate__r"?: Array<import("./Workshop__c.sf").default> | null | undefined
}
export default Account
export const name = "Account"
export type name = typeof name
