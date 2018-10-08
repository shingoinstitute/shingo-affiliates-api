import { SalesforceClient } from '@shingo/sf-api-client'
import { pick } from 'lodash'
// tslint:disable-next-line:no-implicit-dependencies
import { SuccessResult } from 'jsforce'

export const mockQuery = (
  data: Record<string, Array<Record<string, any>>>,
): SalesforceClient['query'] => async query => {
  const objects = data[query.table]
  if (!objects) throw new Error()

  const records: any[] = objects.map(r => pick(r, query.fields))
  return { records, done: true, totalSize: records.length }
}

export const mockRetrieve = (
  data: Record<string, Array<Record<string, any>>>,
): SalesforceClient['retrieve'] => async query => {
  const objects = data[query.object]
  if (!objects) throw new Error()

  const records: any[] = objects.filter(r => query.ids.includes(r.Id))
  return records
}

export const mockDescribe = (
  data: Record<string, any>,
): SalesforceClient['describe'] => async query => data[query]

export const mockSearch = (
  data: Record<string, Record<string, Array<Record<string, any>>>>,
): SalesforceClient['search'] => async query => {
  const object = query.retrieve.split('(')[0]
  const searchRecords = data[query.search][object]
  return { searchRecords } as any
}

export const mockCreate = (
  data: SuccessResult[],
): SalesforceClient['create'] => async _query => data

export const mockUpdate = (
  initialState: Record<string, Array<Record<string, any>>>,
): SalesforceClient['update'] => async query => {
  const objects = initialState[query.object]
  const records = query.records

  const matchedObjects = records
    .map(r => {
      const obj = objects.find(o => o.Id === (r as any).Id)
      if (obj) {
        Object.assign(obj, r)
        return obj
      }
    })
    .filter((r): r is Exclude<typeof r, undefined> => !!r)

  return matchedObjects.map(o => ({ success: true as true, id: o.Id }))
}
