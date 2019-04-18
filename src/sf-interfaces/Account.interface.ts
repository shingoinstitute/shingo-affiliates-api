import { Contact } from './Contact.interface'
import { Attachment } from './Attachment.interface'
import { RecordType } from './RecordType.interface'
import { Workshop__c } from './Workshop__c.interface'

type m<T> = T | null | undefined
export interface Account {
  Id: string
  IsDeleted: boolean
  MasterRecordId?: m<string>
  MasterRecord?: m<Account>
  Name: string
  Type?: m<
    | 'Analyst'
    | 'Competitor'
    | 'Customer'
    | 'Integrator'
    | 'Investor'
    | 'Partner'
    | 'Press'
    | 'Prospect'
    | 'Reseller'
    | 'Other'
  >
  RecordTypeId?: m<string>
  RecordType?: m<RecordType>
  ParentId?: m<string>
  BillingStreet?: m<string>
  BillingCity?: m<string>
  BillingState?: m<string>
  BillingPostalCode?: m<string>
  BillingCountry?: m<string>
  BillingLatitude?: m<number>
  BillingLongitude?: m<number>
  BillingGeocodeAccuracy?: m<string>
  ShippingStreet?: m<string>
  ShippingCity?: m<string>
  ShippingState?: m<string>
  ShippingPostalCode?: m<string>
  ShippingCountry?: m<string>
  ShippingLatitude?: m<number>
  ShippingLongitude?: m<number>
  ShippingGeocodeAccuracy?: m<string>
  Phone?: m<string>
  Fax?: m<string>
  Website?: m<string>
  PhotoUrl?: m<string>
  Industry?: m<string>
  AnnualRevenue?: m<number>
  NumberOfEmployees?: m<number>
  Description?: m<string>
  OwnerId: string
  CreatedDate: string
  CreatedById: string
  LastModifiedDate: string
  LastModifiedById: string
  SystemModstamp: string
  LastActivityDate?: m<string>
  LastViewedDate?: m<string>
  LastReferencedDate?: m<string>
  Jigsaw?: m<string>
  JigsawCompanyId?: m<string>
  AccountSource?: m<string>
  SicDesc?: m<string>
  Legal_Entity__c?: m<string>
  Industry_Sub_category__c?: m<string>
  Industry_Type__c?: m<string>
  Sponsorship_Contact__c?: m<string>
  Study_Tour_Contact__c?: m<string>
  Event_Primary_Contact__c?: m<string>
  App_Abstract__c?: m<string>
  Logo__c?: m<string>
  Public_Contact_Email__c?: m<string>
  Page_Path__c?: m<string>
  Summary__c?: m<string>
  Locations__c?: m<string>
  Languages__c?: m<string>
  Industry_List__c?: m<string>
  Public_Contact_Phone__c?: m<string>
  Public_Contact__c?: m<string>
  Youtube_Path__c?: m<string>
  ChildAccounts?: m<Account[]>
  AccountContactRoles?: m<object[]>
  Histories?: m<object[]>
  AccountPartnersFrom?: m<object[]>
  AccountPartnersTo?: m<object[]>
  Shares?: m<object[]>
  ActivityHistories?: m<object[]>
  Affiliate_Contracts__r?: m<object[]>
  Assets?: m<object[]>
  AttachedContentDocuments?: m<object[]>
  AttachedContentNotes?: m<object[]>
  Attachments?: m<Attachment[]>
  Cases?: m<object[]>
  CombinedAttachments?: m<object[]>
  Contacts?: m<Contact[]>
  Current_Facilitator__r?: m<Contact[]>
  ContentDocumentLinks?: m<object[]>
  Contracts?: m<object[]>
  DuplicateRecordItems?: m<object[]>
  Emails?: m<object[]>
  Events?: m<object[]>
  Event_MDFs__r?: m<object[]>
  Events__r?: m<object[]>
  Events_Organized__r?: m<object[]>
  Notes?: m<object[]>
  NotesAndAttachments?: m<object[]>
  OpenActivities?: m<object[]>
  Opportunities?: m<object[]>
  OpportunityPartnersTo?: m<object[]>
  PartnersFrom?: m<object[]>
  PartnersTo?: m<object[]>
  ProcessInstances?: m<object[]>
  ProcessSteps?: m<object[]>
  Shingo_Exhibitors__r?: m<object[]>
  Shingo_Recipients__r?: m<object[]>
  Shingo_Speakers__r?: m<object[]>
  Shingo_Sponsors__r?: m<object[]>
  Personas?: m<object[]>
  Speakers__r?: m<object[]>
  Tasks?: m<object[]>
  TopicAssignments?: m<object[]>
  Users?: m<object[]>
  Workshop_Evals__r?: m<object[]>
  Organizing_Affiliate__r?: m<Workshop__c[]>
}