import {
  Connection,
  QueryResult,
  SuccessResult,
  ErrorResult,
  RecordResult,
} from 'jsforce'
import { SFQueryResult, deepClean, copyObj } from '../../util'
import { flatten } from 'fp-ts/lib/Array'
import { Provider } from '@nestjs/common'
import debug from 'debug'
import { SFInterfaces } from '../../sf-interfaces'

const logsf = debug('salesforce')

const mklog = (
  open: string,
  close: string,
  openArgs: any[] = [],
  closeArgs: any[] = []
) => async <T>(result: Promise<T>) => {
  logsf(open, ...openArgs)
  const r = await result
  logsf(close + ' - %O', ...closeArgs, r)
  return r
}

export interface QueryRequest {
  fields: string[]
  table: string
  clauses?: string
}

export interface RecordsRequest<T> {
  object: string
  records: T[]
}

export interface IdRequest {
  object: string
  ids: string[]
}

export interface UpsertRequest<T> {
  object: string
  records: T[]
  extId: string
}

export interface SearchRequest {
  search: string
  retrieve: string
}

const isQueryResult = (q: unknown): q is QueryResult<unknown> =>
  typeof q === 'object' &&
  q !== null &&
  typeof (q as any).totalSize === 'number' &&
  typeof (q as any).records !== 'undefined' &&
  typeof (q as any).done === 'boolean'

export const stripQueryResult = <T>(s: QueryResult<T>): T[] => {
  return (s.records || []).map(r => {
    for (const key in r) {
      if (r.hasOwnProperty(key)) {
        const val = r[key]
        if (isQueryResult(val)) {
          ;(r as any)[key] = stripQueryResult(val)
        }
      }
    }

    return r
  })
}

export class SalesforceMutateError extends Error {
  name = 'SalesforceMutateError'
  errors: Array<
    string | { statusCode?: string; message?: string; fields?: string[] }
  >
  success: string[]
  constructor(
    errors: ErrorResult[],
    success: SuccessResult[],
    message?: string
  ) {
    super(message)
    this.errors = flatten(errors.map(e => e.errors))
    this.success = success.map(s => s.id)
  }
}

export const handleRecordResults = (message?: string) => (
  rs: RecordResult[]
): SuccessResult[] => {
  const fails = rs.filter((r): r is ErrorResult => !r.success)
  const success = rs.filter((r): r is SuccessResult => r.success)

  if (fails.length > 0) {
    throw new SalesforceMutateError(fails, success, message)
  }

  return rs as SuccessResult[]
}

const OMIT_FIELDS = [
  'LastModifiedDate',
  'IsDeleted',
  'LastViewedDate',
  'LastReferencedDate',
  'SystemModstamp',
  'CreatedById',
  'CreatedDate',
  'LastModifiedById',
  'JigsawCompanyId',
  'PhotoUrl',
  'MasterRecordId',
  'IsEmailBounced',
  'OtherAddress',
  'LastCUUpdateDate',
  'Contact_Quality__c',
  'MailingAddress',
  'LastCURequestDate',
  'LastActivityDate',
  'JigsawContactId',
  'password',
  'Account',
  'Facilitator_For__r',
  'id',
  'role',
  'RecordType',
]

// TODO: Remove this once the portal doesn't send unknown/invalid keys on objects
// portal should only send the minimum object needed for a change
// which means we won't have to worry about sending invalid data to salesforce
export const getRecords = (
  req: { records: object[] },
  toOmit: string[] = []
): object[] => copyObj(req.records, toOmit as any) as object[]

/**
 * Authenticates a connection to salesforce and calls a function with the logged in connection
 * @param username Salesforce username
 * @param password Salesforce password
 * @param connection JSForce connection object
 * @param fn The function to run
 */
export const runQuery = (
  username: string,
  password: string,
  connection: Connection
) => <T>(fn: (conn: Connection) => Promise<T>) =>
  connection
    .login(username, password)
    .then(() => fn(connection))
    .then(res => {
      connection.logout()
      return res
    })

// tslint:disable-next-line:max-classes-per-file
export class SalesforceService {
  private queryRunner: ReturnType<typeof runQuery>

  constructor(
    {
      SF_URL,
      SF_ENV,
      SF_USER,
      SF_PASS,
    }: {
      SF_URL: string
      SF_ENV: string
      SF_USER: string
      SF_PASS: string
    },
    private conn = new Connection({
      loginUrl: SF_URL,
      instanceUrl: SF_ENV,
    })
  ) {
    this.queryRunner = runQuery(SF_USER, SF_PASS, this.conn)
  }

  query<
    A extends {
      table: keyof SFInterfaces
      fields: Array<keyof SFInterfaces[A['table']]>
    }
  >(queryRequest: A): Promise<SFQueryResult<A>[]>
  query<T = never>(queryRequest: string): Promise<T[]>
  query<T = never>(queryRequest: QueryRequest): Promise<T[]>
  query<T = never>(queryRequest: string | QueryRequest): Promise<T[]> {
    const queryString =
      typeof queryRequest === 'string'
        ? queryRequest
        : `SELECT ${queryRequest.fields.join(',')} FROM ${queryRequest.table}${
            queryRequest.clauses ? ' WHERE ' + queryRequest.clauses : ''
          }`
    const log = mklog(`QUERY:${queryString}`, `QUERY RESULT:${queryString}`)
    return this.queryRunner(async conn => {
      const res = await log(conn.query<T>(queryString))
      // TODO: maybe remove this deepClean once the portal doesn't send unknown/invalid
      // keys - the unnecessary copy and traversal will add a lot of time
      // for large objects
      return deepClean(stripQueryResult(res), 'attributes')
    })
  }

  retrieve<T = never>({ object, ids }: IdRequest): Promise<T[]> {
    const log = mklog(
      `RETRIEVE:${object}@${ids.join()}`,
      `RETRIEVE RESULT:${object}@${ids.join()}`
    )
    return this.queryRunner(async conn => {
      const res = await log(conn.sobject<T>(object).retrieve(ids))
      return deepClean(res.filter(Boolean), 'attributes')
    })
  }

  // TODO: make this type safe - we could generate a typescript interface
  // from the describe that only includes fields marked as creatable
  // this function could require that the records array be of that type
  // we would need to require that objects must match exactly - no extra fields
  // typescript currently doesn't have support for that (there may be some community workarounds)
  create<T extends object = never>(recRequest: RecordsRequest<T>) {
    const records = getRecords(recRequest, OMIT_FIELDS) as T[]
    const log = mklog(
      `CREATE:${recRequest.object} - %O`,
      `CREATE RESULT:${recRequest.object}`,
      [records]
    )
    return this.queryRunner(conn =>
      log(conn.sobject<T>(recRequest.object).create(records)).then(
        handleRecordResults('Unable to create all requested records')
      )
    )
  }

  update<T extends object = never>(recRequest: RecordsRequest<T>) {
    const records = getRecords(recRequest, OMIT_FIELDS)
    const log = mklog(
      `UPDATE:${recRequest.object} - %O`,
      `UPDATE RESULT:${recRequest.object}`,
      [records]
    )
    return this.queryRunner(conn =>
      log(conn.sobject<T>(recRequest.object).update(records)).then(
        handleRecordResults('Unable to update all requested records')
      )
    )
  }

  delete({ object, ids }: IdRequest) {
    const log = mklog(
      `DELETE:${object}@${ids.join()}`,
      `DELETE RESULT:${object}@${ids.join()}`
    )
    return this.queryRunner(conn =>
      log(conn.sobject(object).delete(ids)).then(
        handleRecordResults('Unable to delete all requested records')
      )
    )
  }

  upsert<T extends object = never>(request: UpsertRequest<T>) {
    const records = getRecords(request)
    const log = mklog(
      `UPSERT:${request.object}@${request.extId} - %O`,
      `UPSERT RESULT:${request.object}@${request.extId} - %O`,
      [records]
    )

    return this.queryRunner(conn =>
      log(
        conn.sobject<T>(request.object).upsert(records as T[], request.extId)
      ).then(handleRecordResults('Unable to upsert all requested records'))
    )
  }

  describe(object: string) {
    const log = mklog(`DESCRIBE:${object}`, `DESCRIBE RESULT:${object}`)
    return this.queryRunner(conn => log(conn.sobject(object).describe()))
  }

  search<T = unknown>({ search, retrieve }: SearchRequest) {
    const query = `FIND ${search} IN ALL FIELDS RETURNING ${retrieve}`
    const log = mklog(`SEARCH:${query}`, `SEARCH RESULT:${query}`)
    return this.queryRunner(conn =>
      // FIXME: jsforce typings are incorrect, submit a pull-request to definitely-typed
      log((conn as any).search(query) as Promise<{ searchRecords: T[] }>).then(
        v => deepClean(v, 'attributes')
      )
    )
  }
}

export default SalesforceService

export const salesforceServiceFactory = () => {
  if (
    !(
      process.env.SF_ENV &&
      process.env.SF_URL &&
      process.env.SF_USER &&
      process.env.SF_PASS
    )
  ) {
    console.error('Salesforce environment variables missing')
    process.exit(1)
  }
  return new SalesforceService(process.env as any)
}

export const salesforceServiceProvider: Provider = {
  provide: SalesforceService,
  useFactory: salesforceServiceFactory,
}
