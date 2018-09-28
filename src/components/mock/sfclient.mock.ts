import { SalesforceClient } from '@shingo/sf-api-client'
import { pick } from 'lodash'

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
  data: any[],
): SalesforceClient['search'] => async _query => ({ searchRecords: data })
