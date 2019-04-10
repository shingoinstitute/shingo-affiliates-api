import { SFInterfaces } from '../sf-interfaces'
import { KeysOfType, Matches, Equal, If, Omit } from './types'
import { copyObj } from './util'
import { produce, Draft } from 'immer'

export type TypescriptPrimitives =
  | string
  | number
  | boolean
  | symbol
  | bigint
  | null
  | undefined

/**
 * Scalar fields of an SObject
 */
export type SObjectScalarFields<T extends keyof SFInterfaces> = {
  [k in keyof SFInterfaces[T]]-?: NonNullable<
    SFInterfaces[T][k]
  > extends NonNullable<TypescriptPrimitives>
    ? k
    : never
}[keyof SFInterfaces[T]]

/**
 * Parent reference fields of an SObject
 */
export type SObjectParentFields<T extends keyof SFInterfaces> = {
  [k in keyof SFInterfaces[T]]-?: NonNullable<SFInterfaces[T][k]> extends {
    readonly Id: string
  }
    ? k
    : never
}[keyof SFInterfaces[T]]

/**
 * Child reference fields of an SObject
 */
export type SObjectChildFields<T extends keyof SFInterfaces> = {
  [k in keyof SFInterfaces[T]]-?: NonNullable<
    SFInterfaces[T][k]
  > extends Array<{ readonly Id: string }>
    ? k
    : never
}[keyof SFInterfaces[T]]

/** Used to keep a stack of parent objects in the SFQ */
interface Parent<
  T extends keyof SFInterfaces,
  parent extends [SObjectParentFields<T> | null, Parent<any, any, any>] | null,
  R
> {
  _parent: parent
  _table: T
  _R: R
}

/** Recursively constructs a parent query result by moving up the parent type */
type BuildResult<
  T extends keyof SFInterfaces,
  parent extends [SObjectParentFields<T> | null, Parent<any, any, any>] | null,
  R
> = {
  '1': R
  '0': BuildResult<
    NonNullable<parent>[1]['_table'],
    NonNullable<parent>[1]['_parent'],
    If<
      Matches<NonNullable<parent>[0], null>,
      { [k in NonNullable<NonNullable<parent>[0]>]?: R | null },
      { [k in NonNullable<NonNullable<parent>[0]>]: R }
    >
  >
}[Equal<parent, null>]

type Clauses = {
  where: string
  limit: number
  offset: number
  orderBy: { fields: string[]; dir?: 'ASC' | 'DESC'; nulls?: 'FIRST' | 'LAST' }
}

/** Runtime data for the SFQ, in a single object for easy cloning/structural sharing */
type Data<T extends keyof SFInterfaces> = Readonly<{
  table: T
  fields: ReadonlyArray<string>
  parentChain: ReadonlyArray<SObjectParentFields<T>>
  clauses: Partial<Clauses>
}>

/** Safely constructs a salesforce SOQL query */
export class SFQ<
  T extends keyof SFInterfaces,
  parent extends
    | [SObjectParentFields<T> | null, Parent<any, any, any>]
    | null = null,
  R = {}
> implements Parent<T, parent, R> {
  /** DON'T USE: phantom field to store table type */
  _table!: T
  /** DON'T USE: phantom field to store parent type */
  _parent!: parent
  /** DON'T USE: phantom field to store result type */
  _R!: R

  protected data: Data<T>

  get table() {
    return this.data.table
  }

  get fields() {
    return [...this.data.fields]
  }

  get clauses() {
    return copyObj(this.data.clauses)
  }

  private copy<Return = void>(
    draftFn: (this: Draft<Data<T>>, draft: Draft<Data<T>>) => Return
  ) {
    const data = produce(this.data, draftFn)
    const n = new SFQ(this.data.table)
    n.data = data as Data<T>
    return n
  }

  private getFields<Ks extends Array<SObjectScalarFields<T>>>(fields: Ks) {
    const parentStr = this.data.parentChain.join('.')
    const realFields = fields.map(f =>
      parentStr ? `${parentStr}.${f}` : `${f}`
    )

    return realFields
  }

  constructor(table: T) {
    this.data = { table, fields: [], parentChain: [], clauses: {} }
  }

  /**
   * Select scalar fields from the current context
   * @param fields the scalar fields
   */
  select<Ks extends Array<SObjectScalarFields<T>>>(
    ...fields: Ks
  ): SFQ<
    T,
    parent,
    R & BuildResult<T, parent, Pick<SFInterfaces[T], Ks[number]>>
  > {
    return this.copy(data => {
      data.fields.push(...this.getFields(fields))
    }) as any
  }

  /**
   * Shifts context to a parent field
   *
   * All fields selected until `done()` is called will be
   * prefixed by `${parent}.`
   *
   * Example
   * ```ts
   * const f = new SFQ('Account')
   *          .select('Id')
   *          .parent('MasterRecord')
   *          .select('Id').done()
   *          .select('CreatedById')
   *          .fields
   * f === ['Id', 'MasterRecord.Id', 'CreatedById']
   * ```
   * @param parent a parent field
   */
  parent<K extends SObjectParentFields<T>>(
    parent: K
  ): SFQ<
    KeysOfType<SFInterfaces, SFInterfaces[T][K]>,
    [If<Matches<SFInterfaces[T][K], null | undefined>, K | null, K>, this],
    R
  > {
    return this.copy(data => {
      ;((data.parentChain as unknown) as Array<SObjectParentFields<T>>).push(
        parent
      )
    }) as any
  }

  /**
   * Shifts context back one
   */
  done(): If<
    Equal<parent, null>,
    never,
    SFQ<NonNullable<parent>[1]['_table'], NonNullable<parent>[1]['_parent'], R>
  > {
    if (this.data.parentChain.length === 0)
      throw new Error('Cannot finish empty parent query')

    return this.copy(data => {
      data.parentChain.pop()
    }) as any
  }

  /**
   * Adds a where condition to the clauses
   *
   * Applies to all contexts
   * @param clause the where clause string
   */
  where(clause: string): this {
    return (this.copy(data => {
      data.clauses.where = clause
    }) as unknown) as this
  }

  /**
   * Adds a limit condition to the clauses
   *
   * Applies to all contexts
   * @param rows number of rows to limit to
   */
  limit(rows: number): this {
    return (this.copy(data => {
      data.clauses.limit = rows
    }) as unknown) as this
  }

  /**
   * Adds an offset condition to the clauses
   *
   * Applies to all contexts
   * @param rows number of rows to offset by
   */
  offset(rows: number): this {
    return (this.copy(data => {
      data.clauses.offset = rows
    }) as unknown) as this
  }

  /**
   * Adds an offset condition to the clauses
   *
   * Fields listed here use the current context
   * @param rows number of rows to offset by
   */
  orderBy<Ks extends Array<SObjectScalarFields<T>>>(
    fields: Ks,
    opts?: Omit<Clauses['orderBy'], 'fields'>
  ): this {
    const realFields = this.getFields(fields)
    return this.copy(data => {
      if (!data.clauses.orderBy)
        data.clauses.orderBy = { fields: realFields, ...opts }
      else
        data.clauses.orderBy = {
          fields: [...data.clauses.orderBy.fields, ...realFields],
          ...opts,
        }
    }) as any
  }

  private constructClauses() {
    let builder = ''
    if (this.data.clauses.where) builder += ` WHERE ${this.data.clauses.where}`
    if (this.data.clauses.limit != null)
      builder += ` LIMIT ${this.data.clauses.limit}`
    if (this.data.clauses.offset != null)
      builder += ` OFFSET ${this.data.clauses.offset}`
    if (this.data.clauses.orderBy) {
      const { fields, dir, nulls } = this.data.clauses.orderBy
      builder += ` ORDER BY ${fields.join(',')}`
      if (dir) builder += ` ${dir}`
      if (nulls) builder += ` NULLS ${nulls}`
    }
    return builder
  }

  /**
   * Calls the given function with the constructed query string
   * or returns the string if no function given
   *
   * @param exec an optional query function
   */
  query<Q extends Partial<SFInterfaces[T]> = R>(
    exec: (query: string) => Promise<any[]>
  ): If<Equal<parent, null>, Promise<Q[]>, never>
  query(): If<Equal<parent, null>, string, never>
  query<Q extends Partial<SFInterfaces[T]> = R>(
    exec?: (query: string) => Promise<any[]>
  ): string | Promise<Q[]> {
    if (this.data.parentChain.length > 0)
      throw new Error('Cannot execute unfinished Query')

    const queryStr = `SELECT ${this.data.fields.join(',')} FROM ${
      this.data.table
    }${this.constructClauses()}`

    return exec ? exec(queryStr) : queryStr
  }
}
