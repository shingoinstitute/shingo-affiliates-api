import {
  Support_Page__c,
  visibleTo,
} from '../../components/support/support.component'
import { SupportController } from './support.controller'
import { AuthUser } from '../../guards/auth.guard'

const pages: Support_Page__c[] = [
  {
    Id: 'A00000000000',
    Title__c: 'How To Log In',
    Category__c: 'Authentication',
    Content__c: 'Some Content',
    Restricted_To__c: 'Anonymous',
  },
  {
    Id: 'A00000000001',
    Title__c: 'How to add a workshop',
    Category__c: 'Workshops',
    Content__c: 'Some Content',
    Restricted_To__c: 'Facilitators;Course Managers;Affiliate Managers',
  },
]

const user: AuthUser = {
  id: 2,
  email: 'abe.white@usu.edu',
  services: 'affiliate-portal',
  roles: [
    {
      id: 2,
      name: 'Affiliate Manager',
      service: 'affiliate-portal',
    },
  ],
  isEnabled: true,
  extId: '003m00000127OppAAE',
  resetToken: '',
  lastLogin: 'Thu, 27 Sep 2018 18:00:43 GMT',
  sfContact: {
    Id: '003m00000127OppAAE',
    IsDeleted: false,
    MasterRecordId: null,
    AccountId: '001m000000cRfixAAC',
    LastName: 'White',
    FirstName: 'Abraham',
    Salutation: 'Mr.',
    Name: 'Abraham White',
    RecordTypeId: '012A0000000zpqwIAA',
    OtherStreet: null,
    OtherCity: null,
    OtherState: null,
    OtherPostalCode: null,
    OtherCountry: null,
    OtherLatitude: null,
    OtherLongitude: null,
    OtherGeocodeAccuracy: null,
    OtherAddress: null,
    MailingStreet: null,
    MailingCity: null,
    MailingState: null,
    MailingPostalCode: null,
    MailingCountry: null,
    MailingLatitude: null,
    MailingLongitude: null,
    MailingGeocodeAccuracy: null,
    MailingAddress: null,
    Phone: null,
    Fax: null,
    MobilePhone: null,
    HomePhone: null,
    OtherPhone: null,
    AssistantPhone: null,
    ReportsToId: null,
    Email: 'abe.white@usu.edu',
    Title: null,
    Department: null,
    AssistantName: null,
    LeadSource: null,
    Birthdate: null,
    Description: null,
    OwnerId: '0051H000007hn6tQAA',
    HasOptedOutOfEmail: false,
    CreatedDate: '2018-08-01T18:12:59.000+0000',
    CreatedById: '0051H000007hn6tQAA',
    LastModifiedDate: '2018-08-01T18:12:59.000+0000',
    LastModifiedById: '0051H000007hn6tQAA',
    SystemModstamp: '2018-08-01T18:12:59.000+0000',
    LastActivityDate: null,
    LastCURequestDate: null,
    LastCUUpdateDate: null,
    LastViewedDate: '2018-09-27T18:17:41.000+0000',
    LastReferencedDate: '2018-09-27T18:17:41.000+0000',
    EmailBouncedReason: null,
    EmailBouncedDate: null,
    IsEmailBounced: false,
    PhotoUrl: null,
    Jigsaw: null,
    JigsawContactId: null,
    Suffix__c: null,
    Middle_Names__c: 'Douglas',
    Became_a_Research_Examiner__c: null,
    Mail_Preference__c: null,
    Instructor__c: false,
    Offered_Services__c: null,
    Shingo_Prize_Relationship__c: null,
    Plan__c: null,
    Do__c: null,
    Check__c: null,
    Act__c: null,
    Recipient__c: null,
    A_Number__c: null,
    Description__c: null,
    Media_Contact__c: false,
    Publication__c: null,
    Asst_Email__c: null,
    Other_Email__c: null,
    Contact_Quality__c: 80,
    Date_Last_Reviewed__c: null,
    Shirt_Size__c: null,
    Industry_Type__c: 'Services',
    Industry__c: 'Academic',
    Start_Date__c: null,
    End_Date__c: null,
    Biography__c: null,
    Photograph__c:
      'http://res.cloudinary.com/shingo/image/upload/c_fill,g_center,h_300,w_300/v1414874243/silhouette_vzugec.png',
    Facilitator_For__c: null,
    Qualified_Industry__c: null,
    Qualified_Language__c: null,
    Qualified_Regions__c: null,
    Qualified_Workshops__c: null,
    Has_Watched_Most_Recent_Webinar__c: false,
    Job_History__c: null,
  },
}

const supportServiceMock = {
  describe: async () => ({ fields: ['some field'] }),
  get: async (id: string, roles: string[]) => {
    const page = pages.find(p => p.Id === id)
    if (page && visibleTo(roles)(page)) return page
  },
  getAll: async (_roles: string[]) => pages,
  search: async (_search: string, _retrieve: string[], _roles: string[]) =>
    pages,
}

describe('SupportService', () => {
  let supportController: SupportController

  beforeEach(async () => {
    supportController = new SupportController(supportServiceMock as any)
  })

  describe('readAll', () => {
    it('gets all support pages using supportService', () => {
      return expect(supportController.readAll(user, false)).resolves.toEqual(
        pages,
      )
    })
  })

  describe('readCategory', () => {
    it('retrieves all support pages in the given category', () => {
      return expect(
        supportController.readCategory(user, 'workshops', false),
      ).resolves.toEqual([pages[1]])
    })
  })

  describe('describe', () => {
    it('describes the object using supportService', () => {
      return expect(supportController.describe(false)).resolves.toEqual({
        fields: ['some field'],
      })
    })
  })

  describe('read', () => {
    it('reads a support page by id using supportService', async () => {
      return expect(
        supportController.read(user, 'A00000000001', false),
      ).resolves.toEqual(pages[1])
    })

    it('throws if user does not have access to role', async () => {
      return expect(
        supportController.read({ ...user, roles: [] }, 'A00000000001', false),
      ).rejects.toThrow()
    })
  })

  describe('search', () => {
    it('searches for support pages using supportService', () => {
      return expect(
        supportController.search(user, 'some search', ['some retrieve'], false),
      ).resolves.toEqual(pages)
    })
  })
})
