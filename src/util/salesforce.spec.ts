import { SFQ } from './salesforce'

describe('SFQ', () => {
  it('allows selecting fields from a given table/SObject', () => {
    const x = new SFQ('Account').select('Id', 'CreatedById', 'CreatedDate')
    expect(x.fields).toEqual(['Id', 'CreatedById', 'CreatedDate'])
    expect(x.table).toBe('Account')
  })

  it('allows selecting parent fields through the parent() method', () => {
    const x = new SFQ('Account')
      .select('Id')
      .parent('MasterRecord')
      .select('Id', 'CreatedById', 'CreatedDate')
      .done()
    expect(x.fields).toEqual([
      'Id',
      'MasterRecord.Id',
      'MasterRecord.CreatedById',
      'MasterRecord.CreatedDate',
    ])
    expect(x.table).toBe('Account')
  })

  it('returns a new instance for each of the fluent methods', () => {
    const orig = new SFQ('Account')
    const baseSel = orig.select('Id', 'CreatedById', 'CreatedDate')
    const parent = baseSel.parent('MasterRecord')
    const parentSel = parent.select('Id').done()
    const where = parentSel.where('Id = 1')
    const limit = where.limit(5)
    const offset = limit.offset(5)
    const orderBy = offset.orderBy(['Id'], { dir: 'ASC', nulls: 'FIRST' })

    const arr = [
      orig as any,
      baseSel,
      parent,
      parentSel,
      where,
      limit,
      offset,
      orderBy,
    ]
    expect(
      arr.some((el, eIdx) => arr.some((o, oIdx) => eIdx !== oIdx && o === el))
    ).toBe(false)
  })

  it('calls a function with the constructed query string on query', () => {
    const q = new SFQ('Account')
      .select('Id', 'CreatedById', 'CreatedDate')
      .parent('MasterRecord')
      .select('Id')
      .done()
      .where('Id = 1')
      .limit(5)
      .offset(5)
      .orderBy(['Id'], { dir: 'ASC', nulls: 'FIRST' })

    const fn = jest.fn()

    q.query(fn)
    expect(fn).toHaveBeenCalledWith(
      'SELECT Id,CreatedById,CreatedDate,MasterRecord.Id FROM Account WHERE Id = 1 LIMIT 5 OFFSET 5 ORDER BY Id ASC NULLS FIRST'
    )
  })
})
