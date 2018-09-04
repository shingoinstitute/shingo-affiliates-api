import { BooleanTransformer } from './boolean.transformer'

const invalid = [
  'a',
  'b',
  'tru',
  'truen\'t',
  'falsen\'t',
  'yesn\'t',
  {},
  () => 'hi',
  [],
]

const valid = [
  'true',
  'false',
]

describe('Boolean transformer pipe', () => {
  const pipe = new BooleanTransformer()
  it('throws given invalid boolean strings', () => {
    return Promise.all(
      invalid.map(v =>
        expect(() => pipe.transform(v as any, {} as any)).toThrow()
      )
    )
  })

  it('validates given valid boolean strings', () => {
    return Promise.all(
      valid.map(v =>
        expect(() => pipe.transform(v, {} as any)).not.toThrow()
      )
    )
  })
})
