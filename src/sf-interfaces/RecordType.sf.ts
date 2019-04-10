export interface RecordType {
  readonly "Id": string
  "Name": string
  "DeveloperName": string
  readonly "NamespacePrefix"?: string | null | undefined
  "Description"?: string | null | undefined
  "BusinessProcessId"?: string | null | undefined
  "SobjectType": "Account" | "ActiveScratchOrg" | "Assessment__c" | "Asset" | "AssetRelationship" | "AssistantProgress" | "Campaign" | "CampaignMember" | "Case" | "Change_Mangement__c" | "Checkout__c" | "ComponentResponseCache" | "Computer__c" | "Contact" | "ContactRequest" | "ContentFolderDistribution" | "ContentVersion" | "Contract" | "Core_Shingo_Survey__c" | "CustomSettingNameIndex" | "dlrs__LookupChild__c" | "dlrs__LookupChildAReallyReallyReallyBigBigName__c" | "dlrs__LookupParent__c" | "dlrs__LookupRollupSummary__c" | "dlrs__LookupRollupSummaryLog__c" | "dlrs__LookupRollupSummaryScheduleItems__c" | "Do_It__c" | "Domain__c" | "DuplicateErrorLog" | "DuplicateRecordItem" | "DuplicateRecordSet" | "Equipment__c" | "Event" | "FacilitatorLeadAssociation__c" | "Failed_Check_In__c" | "FileInspectionResult" | "FileSearchActivity" | "FlowRecordRelation" | "FlowStageRelation" | "Idea" | "Image" | "InboundSocialPost" | "Insight_Application__c" | "Insight_Lead__c" | "Insight_Respondent_Survey__c" | "Instructor_Evaluation__c" | "Key__c" | "Lead" | "ListEmail" | "ListEmailIndividualRecipient" | "ListEmailRecipientSource" | "ListEmailSentResult" | "Macro" | "MacroAction" | "MacroInstruction" | "ManagedContentBlock" | "ManagedContentBlockVersion" | "NamespaceRegistry" | "Opportunity" | "OrgDeleteRequest" | "PCI_Computer__c" | "PersonalizationResource" | "Pricebook2" | "Product2" | "Publication_Award__c" | "QuickText" | "Recipient__c" | "Recommendation" | "RecommendationReaction" | "RecordAction" | "RecordOrigin" | "RequestsForAccessSIQ" | "Research_Award__c" | "Scorecard" | "ScorecardAssociation" | "ScorecardMetric" | "ScratchOrgInfo" | "SearchActivity" | "SearchPromotionRule" | "SessionSpeakerAssociation__c" | "SetupAssistantAnswer" | "SetupAssistantProgress" | "SetupFlowProgress" | "Shingo_Agenda_Day__c" | "Shingo_Attendee__c" | "Shingo_Event__c" | "Shingo_Event_Hotel_Association__c" | "Shingo_Event_Recipient_Association__c" | "Shingo_Event_Sponsor_Association__c" | "Shingo_Event_Venue__c" | "Shingo_Exhibitor__c" | "Shingo_Hotel__c" | "Shingo_Price__c" | "Shingo_Recipient__c" | "Shingo_Room__c" | "Shingo_Session__c" | "Shingo_Session_Speaker_Association__c" | "Shingo_Speaker__c" | "Shingo_Sponsor__c" | "Shingo_Travel_Info__c" | "Shingo_Venue__c" | "Shingo_Word__c" | "SiqUserBlacklist" | "SocialPost" | "Solution" | "Sponsor_Ad__c" | "StreamActivityAccess" | "Support_Page__c" | "SyncTransactionLog" | "Task" | "TrainedEmployee__c" | "Training__c" | "UserEmailPreferredPerson" | "UserNavItem" | "Webinar__c" | "WebinarAttendee__c" | "Workshop__c" | "Workshop_Attendee__c" | "Workshop_Evaluation__c" | "WorkshopFacilitatorAssociation__c"
  "IsActive": boolean
  readonly "CreatedById": string
  readonly "CreatedDate": string
  readonly "LastModifiedById": string
  readonly "LastModifiedDate": string
  readonly "SystemModstamp": string
  readonly "CreatedBy": object
  readonly "LastModifiedBy": object
}
export default RecordType
export const name = "RecordType"
export type name = typeof name
