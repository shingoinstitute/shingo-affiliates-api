import {
  Connection,
  QueryResult,
  SuccessResult,
  ErrorResult,
  RecordResult,
} from 'jsforce'
import { Omit } from '../util'
import { flatten } from '../util/fp'
import { Provider } from '@nestjs/common'

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
    message?: string,
  ) {
    super(message)
    this.errors = flatten(errors.map(e => e.errors))
    this.success = success.map(s => s.id)
  }
}

export const handleRecordResults = (message?: string) => (
  rs: RecordResult[],
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

const omit = <T, K extends keyof T>(
  o: T,
  exclude: K[],
  depth = 0,
): Omit<T, K> => {
  const ret = {} as any

  for (const k in o) {
    if (!exclude.includes((k as unknown) as K)) {
      ret[k] =
        typeof o[k] === 'object' && o[k] != null && depth !== 0
          ? omit(o[k] as any, exclude, depth - 1)
          : o[k]
    }
  }

  return ret as Omit<T, K>
}

export const getRecords = (
  req: { records: object[] },
  toOmit: string[] = [],
): object[] =>
  req.records.map(record => {
    const val = record
    return typeof val === 'object' ? omit(val, toOmit as any) : val
  })

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
  connection: Connection,
) => <T>(fn: ((conn: Connection) => Promise<T>)) =>
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
    }),
  ) {
    this.queryRunner = runQuery(SF_USER, SF_PASS, this.conn)
  }

  // TODO: make this typesafe using our describe interfaces
  query<T = never>(queryRequest: QueryRequest): Promise<T[]> {
    let queryString = `SELECT ${queryRequest.fields.join(',')} FROM ${
      queryRequest.table
    }`
    if (queryRequest.clauses) queryString += ' WHERE ' + queryRequest.clauses
    return this.queryRunner(async conn => {
      const res = await conn.query<T>(queryString)
      return stripQueryResult(res)
    })
  }

  retrieve<T = never>(idRequest: {
    object: string
    ids: string[]
  }): Promise<T[]> {
    return this.queryRunner(async conn => {
      const res = await conn
        .sobject<T>(idRequest.object)
        .retrieve(idRequest.ids)
      return res.filter(Boolean)
    })
  }

  // TODO: make this type safe - we could generate a typescript interface
  // from the describe that only includes fields marked as creatable
  // this function could require that the records array be of that type
  // we would need to require that objects must match exactly - no extra fields
  // typescript currently doesn't have support for that (there may be some community workarounds)
  create<T extends object = never>(recRequest: RecordsRequest<T>) {
    const records = getRecords(recRequest, OMIT_FIELDS) as T[]
    return this.queryRunner(conn =>
      conn
        .sobject<T>(recRequest.object)
        .create(records)
        .then(handleRecordResults('Unable to create all requested records')),
    )
  }

  update<T extends object = never>(recordsRequest: RecordsRequest<T>) {
    const records = getRecords(recordsRequest, OMIT_FIELDS)
    return this.queryRunner(conn => {
      return conn
        .sobject<T>(recordsRequest.object)
        .update(records)
        .then(handleRecordResults('Unable to update all requested records'))
    })
  }

  delete(idRequest: IdRequest) {
    return this.queryRunner(conn =>
      conn
        .sobject(idRequest.object)
        .delete(idRequest.ids)
        .then(handleRecordResults('Unable to delete all requested records')),
    )
  }

  upsert<T extends object = never>(request: UpsertRequest<T>) {
    const records = getRecords(request)

    return this.queryRunner(conn =>
      conn
        .sobject<T>(request.object)
        .upsert(records as T[], request.extId)
        .then(handleRecordResults('Unable to upsert all requested records')),
    )
  }

  describe(object: string) {
    return this.queryRunner(conn => conn.sobject(object).describe())
  }

  search<T = unknown>(searchRequest: SearchRequest) {
    return this.queryRunner(conn => {
      // FIXME: jsforce typings are incorrect
      return (conn as any).search(
        `FIND ${searchRequest.search} IN ALL FIELDS RETURNING ${
          searchRequest.retrieve
        }`,
      ) as Promise<{ searchRecords: T[] }>
    })
  }
}

export const salesforceServiceProvider: Provider = {
  provide: SalesforceService,
  useFactory: () => {
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
  },
}
