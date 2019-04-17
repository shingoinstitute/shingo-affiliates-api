export { Account } from './Account.sf'
export { Attachment } from './Attachment.sf'
export { Contact } from './Contact.sf'
export { RecordType } from './RecordType.sf'
export { Support_Page__c } from './Support_Page__c.sf'
export {
  WorkshopFacilitatorAssociation__c,
} from './WorkshopFacilitatorAssociation__c.sf'
export { Workshop__c } from './Workshop__c.sf'
export interface SFInterfaces {
  Account: import('./Account.sf').default
  Attachment: import('./Attachment.sf').default
  Contact: import('./Contact.sf').default
  RecordType: import('./RecordType.sf').default
  Support_Page__c: import('./Support_Page__c.sf').default
  WorkshopFacilitatorAssociation__c: import('./WorkshopFacilitatorAssociation__c.sf').default
  Workshop__c: import('./Workshop__c.sf').default
}
