import { SupportService, Support_Page__c } from './support.component'
import { SalesforceClient } from '@shingo/sf-api-client'
import { Test } from '@nestjs/testing'
import { LoggerServiceProvider } from '../../providers'
import { CacheService } from '../cache/cache.component'
import { CacheServiceMock } from '../cache/cache.component.mock'
import { pick } from 'lodash'

const mockQuery = (
  data: Record<string, Array<Record<string, any>>>,
): SalesforceClient['query'] => async query => {
  const objects = data[query.table]
  if (!objects) throw new Error()

  const records: any[] = objects.map(r => pick(r, query.fields))
  return { records, done: true, totalSize: records.length }
}

const mockRetrieve = (
  data: Record<string, Array<Record<string, any>>>,
): SalesforceClient['retrieve'] => async query => {
  const objects = data[query.object]
  if (!objects) throw new Error()

  const records: any[] = objects.filter(r => query.ids.includes(r.Id))
  return records
}

const mockDescribe = (
  data: Record<string, any>,
): SalesforceClient['describe'] => async query => data[query]

const mockSearch = (
  data: any[],
): SalesforceClient['search'] => async _query => ({ searchRecords: data })

describe('SupportService', () => {
  let supportService: SupportService
  let sfService: SalesforceClient

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SupportService],
      providers: [
        LoggerServiceProvider,
        {
          provide: SalesforceClient,
          useFactory: () => new SalesforceClient('localhost:65535'),
        },
      ],
    })
      .overrideProvider(CacheService)
      .useClass(CacheServiceMock)
      .compile()

    supportService = module.get<SupportService>(SupportService)
    sfService = module.get<SalesforceClient>(SalesforceClient)
  })

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

  describe('getAll', () => {
    it('returns an array of support pages for role', () => {
      jest
        .spyOn(sfService, 'query')
        .mockImplementation(mockQuery({ Support_Page__c: pages }))

      return expect(supportService.getAll('Anonymous')).resolves.toEqual([
        pages[0],
      ])
    })
  })

  describe('get', () => {
    it('retrieves a single support page with the given id', () => {
      jest
        .spyOn(sfService, 'retrieve')
        .mockImplementation(mockRetrieve({ Support_Page__c: pages }))

      return expect(supportService.get('A00000000001')).resolves.toEqual(
        pages[1],
      )
    })
  })

  describe('describe', () => {
    it('describes the object using sfservice', () => {
      const supportPageDescribe = { fields: ['somefield'] }
      jest
        .spyOn(sfService, 'describe')
        .mockImplementation(
          mockDescribe({ Support_Page__c: supportPageDescribe }),
        )

      return expect(supportService.describe()).resolves.toEqual(
        supportPageDescribe,
      )
    })
  })

  describe('search', () => {
    it('searches for support pages using sfservice, restricted to some role', () => {
      jest.spyOn(sfService, 'search').mockImplementation(mockSearch(pages))

      return expect(
        supportService.search('Some Search', ['Some retrieve'], 'Anonymous'),
      ).resolves.toEqual([pages[0]])
    })
  })
})
