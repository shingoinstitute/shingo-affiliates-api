import { Contact } from './Contact.interface'
import { Workshop__c } from './Workshop__c.interface'
import { Attachment } from './Attachment.interface'

type m<T> = T | null | undefined

// tslint:disable-next-line:class-name
export interface WorkshopFacilitatorAssociation__c {
  Id: string
  OwnerId: string
  IsDeleted: boolean
  Name: string
  CreatedDate: string
  CreatedById: string
  LastModifiedDate: string
  LastModifiedById: string
  SystemModstamp: string
  Instructor__c?: m<string>
  Instructor__r?: m<Contact>
  Workshop__c?: m<string>
  Workshop__r?: m<Workshop__c>
  AttachedContentDocuments?: m<object[]>
  AttachedContentNotes?: m<object[]>
  Attachments?: m<Attachment[]>
  CombinedAttachments?: m<object[]>
  ContentDocumentLinks?: m<object[]>
  DuplicateRecordItems?: m<object[]>
  Emails?: m<object[]>
  Notes?: m<object[]>
  NotesAndAttachments?: m<object[]>
  ProcessInstances?: m<object[]>
  ProcessSteps?: m<object[]>
  TopicAssignments?: m<object[]>
  Shares?: m<object[]>
}
