import { Test } from '@nestjs/testing'
import { RecordTypeService } from './RecordType.component'
import SalesforceService from '../salesforce/new-salesforce.component'
jest.mock('../salesforce/new-salesforce.component.ts')

describe('RecordType', () => {
  let recordType: RecordTypeService
  let sfService: SalesforceService

  beforeEach(async () => {
    ;(SalesforceService as jest.Mock<SalesforceService>).mockClear()

    const module = await Test.createTestingModule({
      controllers: [RecordTypeService],
      providers: [SalesforceService],
    }).compile()

    sfService = module.get<SalesforceService>(SalesforceService)
    recordType = module.get<RecordTypeService>(RecordTypeService)
  })

  describe('get', () => {
    it('gets the id associated with the given DeveloperName and caches the result', () => {
      const fn = jest
        .fn()
        .mockImplementation(() => Promise.resolve([{ Id: 'Id' }]))
      jest.spyOn(sfService, 'query').mockImplementation(fn)

      expect(recordType.get('Licensed_Affiliate')).resolves.toBe('Id')
      expect(fn).toHaveBeenCalledWith(
        `SELECT Id FROM RecordType WHERE DeveloperName = 'Licensed_Affiliate'`
      )
      expect(recordType.get('Licensed_Affiliate')).resolves.toBe('Id')
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
})
