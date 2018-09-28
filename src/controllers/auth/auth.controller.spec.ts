import { Test } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthClient, authservices } from '@shingo/auth-api-client'
import { ForbiddenException } from '@nestjs/common'
import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthUser } from '../../guards/auth.guard'
import { Arguments } from '../../util'
import { mockLogger } from '../../factories/logger.mock'
import {
  mockLogin,
  mockGetUser,
  mockLoginAs,
  mockUpdateUser,
} from '../../components/mock/authclient.mock'

describe('AuthController', () => {
  let authController: AuthController
  let authService: AuthClient

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthClient,
          // very unlikely to be a service running on this port,
          // so if any method is not mocked we definitely will fail
          useFactory: () => new AuthClient('localhost:65535'),
        },
        {
          provide: SalesforceClient,
          useFactory: () => new SalesforceClient('localhost:65535'),
        },
      ],
    })
      .overrideProvider('LoggerService')
      .useValue(mockLogger)
      .compile()

    authController = module.get<AuthController>(AuthController)
    authService = module.get<AuthClient>(AuthClient)
  })

  describe('login', () => {
    const abeUser = {
      id: 1,
      email: 'abe.white@usu.edu',
      services: 'affiliate-portal',
      roles: [
        {
          id: 2,
          name: 'Affiliate-Manager',
          service: 'affiliate-portal',
        },
      ],
      isEnabled: true,
      extId: 'someId',
      resetToken: '',
      lastLogin: 'Thur, 27 Sep 2018 18:00:43 GMT',
    }

    const credential = { email: 'abe.white@usu.edu', password: 'Password123' }

    it('returns a logged in user', async () => {
      jest
        .spyOn(authService, 'login')
        .mockImplementation(mockLogin([credential]))

      jest
        .spyOn(authService, 'getUser')
        .mockImplementation(
          mockGetUser({ "user.email='abe.white@usu.edu'": abeUser }),
        )

      return expect(await authController.login(credential)).toEqual({
        ...abeUser,
        jwt: abeUser.email,
      })
    })

    it('throws a forbidden exception with invalid email or password', () => {
      jest
        .spyOn(authService, 'login')
        .mockImplementation(mockLogin([credential]))

      jest
        .spyOn(authService, 'getUser')
        .mockImplementation(
          mockGetUser({ "user.email='abe.white@usu.edu'": abeUser }),
        )

      return Promise.all([
        expect(
          authController.login({ ...credential, password: 'asdfasd' }),
        ).rejects.toThrowError(ForbiddenException),

        expect(
          authController.login({ ...credential, email: 'a@a.com' }),
        ).rejects.toThrowError(ForbiddenException),
      ])
    })

    it('throws a forbidden exception if services does not contain affiliate-portal', () => {
      jest
        .spyOn(authService, 'login')
        .mockImplementation(mockLogin([credential]))

      jest.spyOn(authService, 'getUser').mockImplementation(
        mockGetUser({
          "user.email='abe.white@usu.edu'": { ...abeUser, services: 'asdfa' },
        }),
      )

      return expect(authController.login(credential)).rejects.toThrowError(
        ForbiddenException,
      )
    })
  })

  describe('valid', () => {
    it('just returns the injected user object', () => {
      const user: AuthUser = {
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

      return expect(authController.valid(user)).resolves.toEqual(user)
    })
  })

  describe('loginas', () => {
    const users: Arguments<typeof mockLoginAs>[0] = [
      { id: 1, jwt: 'jwt-admin-1', permissionFor: [2, 3] },
      { id: 2, jwt: 'jwt-2', permissionFor: [] },
      { id: 3, jwt: 'jwt-3', permissionFor: [] },
    ]

    it('gets the jwt for a requested user', async () => {
      jest.spyOn(authService, 'loginAs').mockImplementation(mockLoginAs(users))
      return expect(
        authController.loginAs({ id: 1 } as any, { userId: 2 }),
      ).resolves.toEqual('jwt-2')
    })
  })

  describe('changepassword', () => {
    const users: Array<Required<authservices.User>> = [
      {
        id: 1,
        email: 'abe.white@usu.edu',
        services: 'affiliate-portal',
        roles: [
          {
            id: 2,
            name: 'Affiliate-Manager',
            service: 'affiliate-portal',
          },
        ],
        isEnabled: true,
        extId: 'someId',
        resetToken: '',
        lastLogin: 'Thur, 27 Sep 2018 18:00:43 GMT',
        password: 'Password123',
        permissions: [],
        _TagEmpty: false,
      },
    ]

    it('updates only the password', () => {
      jest.spyOn(authService, 'login').mockImplementation(mockLogin(users))

      jest
        .spyOn(authService, 'updateUser')
        .mockImplementation(mockUpdateUser(users))

      const oldUser = { ...users[0] }
      const body = { password: 'some-password' }

      return expect(authController.changePassword(users[0] as any, body))
        .resolves.toEqual({ jwt: users[0].email })
        .then(() => expect(users[0]).toEqual({ ...oldUser, ...body }))
    })
  })
})
