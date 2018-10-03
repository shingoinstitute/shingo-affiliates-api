import { RecordType } from './RecordType.interface'
import { Account } from './Account.interface'
import { Attachment } from './Attachment.interface'
import { WorkshopFacilitatorAssociation__c } from './WorkshopFacilitatorAssociation__c.interface'
import { Workshop__c } from './Workshop__c.interface'

type m<T> = null | undefined | T
export interface Contact {
  Id: string
  IsDeleted: boolean
  MasterRecordId?: m<string>
  MasterRecord?: m<Contact>
  AccountId?: m<string>
  Account?: m<Account>
  LastName: string
  FirstName?: m<string>
  Salutation?: m<string>
  Name: string
  RecordTypeId?: m<string>
  RecordType?: m<RecordType>
  OtherStreet?: m<string>
  OtherCity?: m<string>
  OtherState?: m<string>
  OtherPostalCode?: m<string>
  OtherCountry?: m<string>
  OtherLatitude?: m<number>
  OtherLongitude?: m<number>
  OtherGeocodeAccuracy?: m<string>
  MailingStreet?: m<string>
  MailingCity?: m<string>
  MailingState?: m<string>
  MailingPostalCode?: m<string>
  MailingCountry?: m<string>
  MailingLatitude?: m<number>
  MailingLongitude?: m<number>
  MailingGeocodeAccuracy?: m<string>
  Phone?: m<string>
  Fax?: m<string>
  MobilePhone?: m<string>
  HomePhone?: m<string>
  OtherPhone?: m<string>
  AssistantPhone?: m<string>
  ReportsToId?: m<string>
  ReportsTo?: m<Contact>
  Email?: m<string>
  Title?: m<string>
  Department?: m<string>
  AssistantName?: m<string>
  LeadSource?: m<string>
  Birthdate?: m<string>
  Description?: m<string>
  OwnerId: string
  Owner: object
  HasOptedOutOfEmail: boolean
  CreatedDate: string
  CreatedById: string
  CreatedBy: object
  LastModifiedDate: string
  LastModifiedById: string
  LastModifiedBy: object
  SystemModstamp: string
  LastActivityDate?: m<string>
  LastCURequestDate?: m<string>
  LastCUUpdateDate?: m<string>
  LastViewedDate?: m<string>
  LastReferencedDate?: m<string>
  EmailBouncedReason?: m<string>
  EmailBouncedDate?: m<string>
  IsEmailBounced: boolean
  PhotoUrl?: m<string>
  Jigsaw?: m<string>
  JigsawContactId?: m<string>
  JigsawContact?: m<object>
  Suffix__c?: m<string>
  Middle_Names__c?: m<string>
  Became_a_Research_Examiner__c?: m<string>
  Mail_Preference__c?: m<'Other (home)' | 'Mail (office)'>
  Instructor__c: boolean
  Offered_Services__c?: m<string>
  Shingo_Prize_Relationship__c?: m<string>
  Plan__c?: m<string>
  Do__c?: m<string>
  Check__c?: m<string>
  Act__c?: m<string>
  Recipient__c?: m<string>
  A_Number__c?: m<string>
  Description__c?: m<string>
  Media_Contact__c: boolean
  Publication__c?: m<'Automotive' | 'General' | 'Healthcare' | 'Manufacturing'>
  Asst_Email__c?: m<string>
  Other_Email__c?: m<string>
  Contact_Quality__c?: m<number>
  Date_Last_Reviewed__c?: m<string>
  Shirt_Size__c?: m<
    'XXS' | 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'XXXXL'
  >
  Industry_Type__c?: m<string>
  Industry__c?: m<string>
  Start_Date__c?: m<string>
  End_Date__c?: m<string>
  Biography__c?: m<string>
  Photograph__c?: m<string>
  Facilitator_For__c?: m<string>
  Facilitator_For__r?: m<Account>
  Qualified_Industry__c?: m<string>
  Qualified_Language__c?: m<string>
  Qualified_Regions__c?: m<string>
  Qualified_Workshops__c?: m<string>
  Has_Watched_Most_Recent_Webinar__c: boolean
  Job_History__c?: m<string>

  AcceptedEventRelations?: m<object[]>
  Accounts__r?: m<Account[]>
  Sponsor_Accounts__r?: m<Account[]>
  Accounts1__r?: m<Account[]>
  AccountContactRoles?: m<object[]>
  ActivityHistories?: m<object[]>
  Assessments__r?: m<object[]>
  Assessments1__r?: m<object[]>
  Assets?: m<object[]>
  AttachedContentDocuments?: m<object[]>
  AttachedContentNotes?: m<object[]>
  Attachments?: m<Attachment[]>
  CampaignMembers?: m<object[]>
  Cases?: m<object[]>
  CaseContactRoles?: m<object[]>
  CombinedAttachments?: m<object[]>
  Histories?: m<object[]>
  Shares?: m<object[]>
  ContentDocumentLinks?: m<object[]>
  ContractsSigned?: m<object[]>
  ContractContactRoles?: m<object[]>
  DeclinedEventRelations?: m<object[]>
  DuplicateRecordItems?: m<object[]>
  EmailMessageRelations?: m<object[]>
  EmailStatuses?: m<object[]>
  Events?: m<object[]>
  EventRelations?: m<object[]>
  Event_MDFs__r?: m<object[]>
  Registrations__r?: m<object[]>
  Events1__r?: m<object[]>
  Events2__r?: m<object[]>
  Shingo_Events_Organized__r?: m<object[]>
  Events__r?: m<object[]>
  FacilitatorLeadAssociations__r?: m<object[]>
  Insight_Organizations__r?: m<object[]>
  Instructor_Certification__r?: m<object[]>
  Notes?: m<object[]>
  NotesAndAttachments?: m<object[]>
  OpenActivities?: m<object[]>
  OpportunityContactRoles?: m<object[]>
  ProcessInstances?: m<object[]>
  ProcessSteps?: m<object[]>
  Publication_Awards__r?: m<object[]>
  Publication_Awards1__r?: m<object[]>
  Research_Awards__r?: m<object[]>
  SCOPE_Users__r?: m<object[]>
  Shingo_Event_Registrations__r?: m<object[]>
  Shingo_Events__r?: m<object[]>
  Shingo_Exhibitors__r?: m<object[]>
  Shingo_Registrations__r?: m<object[]>
  Shingo_Speakers__r?: m<object[]>
  Personas?: m<object[]>
  Speakers__r?: m<object[]>
  Tasks?: m<object[]>
  TopicAssignments?: m<object[]>
  UndecidedEventRelations?: m<object[]>
  Venues1__r?: m<object[]>
  Venues2__r?: m<object[]>
  Venues__r?: m<object[]>
  Workshops__r?: m<WorkshopFacilitatorAssociation__c[]>
  Workshops_Attended__r?: m<object[]>
  Workshop_Evals__r?: m<object[]>
  Course_Manager_Of__r?: m<Workshop__c[]>
}
