import { SalesforceClient } from '@shingo/sf-api-client'
import { AuthClient, authservices } from '@shingo/auth-api-client'
import { Test } from '@nestjs/testing'
import { AffiliatesService } from './affiliates.component'
import { CacheService } from '../cache/cache.component'
import { CacheServiceMock } from '../cache/cache.component.mock'
import { mockLogger } from '../../factories/logger.mock'
import { mockQuery } from '../mock/sfclient.mock'
import { mockGetRoles } from '../mock/authclient.mock'

describe('AffiliatesService', () => {
  let sfService: SalesforceClient
  let authService: AuthClient
  let affiliatesService: AffiliatesService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AffiliatesService],
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
      .overrideProvider(CacheService)
      .useClass(CacheServiceMock)
      .overrideProvider('LoggerService')
      .useValue(mockLogger)
      .compile()

    authService = module.get<AuthClient>(AuthClient)
    sfService = module.get<SalesforceClient>(SalesforceClient)
    affiliatesService = module.get<AffiliatesService>(AffiliatesService)
  })

  const accounts = [
    {
      Id: 'A000000000',
      Name: 'Account 1',
      Summary__c: 'Some Summary',
      Logo__c: 'https://path.to.logo.jpg',
      Website: 'https://path.to.website',
      Languages__c: 'English',
    },
    {
      Id: 'A000000001',
      Name: 'Account 1',
      Summary__c: 'Some Summary',
      Logo__c: 'https://path.to.logo.jpg',
      Website: 'https://path.to.website',
      Languages__c: 'English',
    },
  ]

  const roles: Array<Required<authservices.Role>> = [
    {
      id: 0,
      name: 'Course Manager -- A000000001',
      permissions: [],
      users: [],
      service: 'affiliate-portal',
      _TagEmpty: false,
    },
    {
      id: 2,
      name: 'Course Manager -- A012300001',
      permissions: [],
      users: [],
      service: 'affiliate-portal',
      _TagEmpty: false,
    },
  ]

  describe('getAll', () => {
    it("gets all Accounts where DeveloperName is 'Licensed_Affiliate' and filters to those who have a Course Manager role", () => {
      jest
        .spyOn(sfService, 'query')
        .mockImplementation(mockQuery({ Account: accounts }))

      jest
        .spyOn(authService, 'getRoles')
        .mockImplementation(
          mockGetRoles({ "role.name LIKE 'Course Manager -- %'": roles }),
        )

      return expect(affiliatesService.getAll()).resolves.toEqual([accounts[1]])
    })
  })
})
