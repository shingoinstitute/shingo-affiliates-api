import { IsSalesforceId, SalesforceIdValidator } from './SalesforceId.validator'
import { validate } from 'class-validator'

class TestId {
  constructor(id: any) { this.value = id }
  @IsSalesforceId()
  value: string
}

const invalidIds = [
  'someId',
  1,
  () => 1,
  null,
  undefined,
  [1, 2, 3],
  { some: 'object' },
  '50130000000014Casd',
]

const validIds = [
  '50130000000014c',
  '50130000000014C',
  '001A0000006Vm9r',
  '001A0000006Vm9rIAC',
  '003A0000005QB3A',
  '003A0000005QB3AIAW',
  '003A0000008qb1s',
  '003A0000008qb1sIAA',
]

describe('IsSalesforceId decorator', () => {
  it('does not validate given invalid salesforce ids', () => {
    return Promise.all(
      invalidIds.map(v =>
        validate(new TestId(v)).then(errs =>
          expect(errs.length).toBeGreaterThan(0)
        )
      )
    )
  })

  it('validates given valid salesforce ids', () => {
    return Promise.all(
      validIds.map(v => validate(new TestId(v)).then(errs => expect(errs).toHaveLength(0)))
    )
  })
})

describe('SalesforceIdValidator validator pipe', () => {
  const pipe = new SalesforceIdValidator()
  it('throws given invalid salesforce ids', () => {
    return Promise.all(
      invalidIds.map(v =>
        expect(() => pipe.transform(v, {} as any)).toThrow()
      )
    )
  })

  it('validates given valid salesforce ids', () => {
    return Promise.all(
      validIds.map(v =>
        expect(() => pipe.transform(v, {} as any)).not.toThrow()
      )
    )
  })
})
