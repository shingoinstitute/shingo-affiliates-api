import { Contact } from './Contact.interface'
import { Account } from './Account.interface'
import { WorkshopFacilitatorAssociation__c } from './WorkshopFacilitatorAssociation__c.interface'

type m<T> = T | null | undefined

// tslint:disable-next-line:class-name
export interface Workshop__c {
  Id: string
  IsDeleted: boolean
  Name?: m<string>
  CreatedDate: string
  CreatedById: string
  LastModifiedDate: string
  LastModifiedById: string
  SystemModstamp: string
  LastViewedDate?: m<string>
  LastReferencedDate?: m<string>
  Billing_Contact__c?: m<string>
  Course_Manager__c?: m<string>
  Course_Manager__r?: m<Contact>
  End_Date__c: string
  Event_City__c?: m<string>
  Event_Country__c?: m<string>
  Organizing_Affiliate__c: string
  Organizing_Affiliate__r: Account
  Public__c: boolean
  Registration_Website__c?: m<string>
  Start_Date__c: string
  Status__c?: m<
    | 'Proposed'
    | 'Verified'
    | 'Action Pending'
    | 'Ready To Be Invoiced'
    | 'Invoiced, Not Paid'
    | 'Archived'
    | 'Cancelled'
  >
  Workshop_Type__c?: m<'Discover' | 'Improve' | 'Enable' | 'Align' | 'Build'>
  Host_Site__c?: m<string>
  Language__c?: m<string>

  AttachedContentDocuments?: m<object[]>
  AttachedContentNotes?: m<object[]>
  Attachments?: m<object[]>
  CombinedAttachments?: m<object[]>
  ContentDocumentLinks?: m<object[]>
  DuplicateRecordItems?: m<object[]>
  Emails?: m<object[]>
  Notes?: m<object[]>
  NotesAndAttachments?: m<object[]>
  ProcessInstances?: m<object[]>
  ProcessSteps?: m<object[]>
  TopicAssignments?: m<object[]>
  Instructors__r?: m<WorkshopFacilitatorAssociation__c[]>
  Attendees__r?: m<object[]>
}
