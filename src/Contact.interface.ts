export interface Contact {
  Account: object
  AccountId: string
  ReportsTo: Contact
  Id: string
  LastName: string
  FirstName: string
  Salutation: string
  Name: string
  Suffix__c: string
  Middle_Names__c: string
  Mail_Preference__c: string
  Instructor__c: boolean
  Description__c: string
  Biography__c: string
}
