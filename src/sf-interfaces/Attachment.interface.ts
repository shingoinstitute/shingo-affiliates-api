import { Account } from './Account.interface'
import { Contact } from './Contact.interface'
import { WorkshopFacilitatorAssociation__c } from './WorkshopFacilitatorAssociation__c.interface'
import { Workshop__c } from './Workshop__c.interface'

type m<T> = T | null | undefined
export interface Attachment {
  Id: string
  IsDeleted: boolean
  ParentId: string
  Parent:
    | Account
    | Contact
    | Workshop__c
    | WorkshopFacilitatorAssociation__c
    | object
  Name: string
  IsPrivate: boolean
  ContentType?: m<string>
  BodyLength?: m<number>
  Body: string
  OwnerId: string
  CreatedDate: string
  CreatedById: string
  CreatedBy: object
  LastModifiedDate: string
  LastModifiedById: string
  LastModifiedBy: object
  SystemModstamp: string
  Description?: m<string>
}
