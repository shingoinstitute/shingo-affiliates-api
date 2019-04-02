import { SFInterfaces, Account, Contact } from '../sf-interfaces'
import { KeysOfType, Matches, Equal, If } from './types'
import { SalesforceService } from '../components/salesforce/new-salesforce.component'

export type TypescriptPrimitives = string | number | boolean | symbol | bigint | null | undefined

export type SObjectScalarFields<T extends keyof SFInterfaces> =
    { [k in keyof SFInterfaces[T]]-?:
      NonNullable<SFInterfaces[T][k]> extends NonNullable<TypescriptPrimitives> ? k : never
    }[keyof SFInterfaces[T]]
export type SObjectParentFields<T extends keyof SFInterfaces> =
    { [k in keyof SFInterfaces[T]]-?:
      NonNullable<SFInterfaces[T][k]> extends { readonly Id: string } ? k : never
    }[keyof SFInterfaces[T]]
export type SObjectChildFields<T extends keyof SFInterfaces> =
    { [k in keyof SFInterfaces[T]]-?:
      NonNullable<SFInterfaces[T][k]> extends Array<{ readonly Id: string }> ? k : never
    }[keyof SFInterfaces[T]]

export type ParentSelection<T extends keyof SFInterfaces> =
    { [k in SObjectParentFields<T>]-?:
        { parent: k, selection: PO_FieldSelection<KeysOfType<SFInterfaces, SFInterfaces[T][k]>> }
    }[SObjectParentFields<T>]

/** parent only field selection, since child queries can't contain child queries */
type PO_FieldSelection<T extends keyof SFInterfaces> = SObjectScalarFields<T> | ParentSelection<T>
export type FieldSelection<T extends keyof SFInterfaces> = Array<SObjectScalarFields<T> | ParentSelection<T>>
// type QueryFields<T extends keyof SFInterfaces> = Array<SObjectFields[T]

/** Recursively constructs a parent query result by moving up the parent type */
type BuildResult<T extends keyof SFInterfaces,
  parent extends [SObjectParentFields<T> | null, SFQ<any, any, any>] | null,
  R
  > = {
    '1': R,
    '0': BuildResult<
      NonNullable<parent>[1]['table'],
      NonNullable<parent>[1]['_parent'],
      If<
        Matches<NonNullable<parent>[0], null>,
        { [k in NonNullable<NonNullable<parent>[0]>]?: R | null },
        { [k in NonNullable<NonNullable<parent>[0]>]: R }
      >
    >
  }[Equal<parent, null>]

/** Safely constructs a salesforce SOQL query */
class SFQ<T extends keyof SFInterfaces, parent extends [SObjectParentFields<T> | null, SFQ<any, any, any>] | null = null, R = {}> {
  /** DON'T USE: phantom field to store parent type */
  _parent!: parent
  /** DON'T USE: phantom field to store result type */
  _R!: R

  private fields: string[] = []
  private parentChain: Array<SObjectParentFields<T>> = []

  constructor(readonly table: T) { }

  select<Ks extends Array<SObjectScalarFields<T>>>(...fields: Ks): SFQ<T, parent, R & BuildResult<T, parent, Pick<SFInterfaces[T], Ks[number]>>> {
    const parentStr = this.parentChain.join('.')
    const realFields = fields.map(f => parentStr ? `${parentStr}.${f}` : f)
    this.fields.push(...realFields as string[])
    return this as any
  }

  parent<K extends SObjectParentFields<T>>(parent: K): SFQ<KeysOfType<SFInterfaces, SFInterfaces[T][K]>, [If<Matches<SFInterfaces[T][K], null | undefined>, K | null, K>, this], R> {
    this.parentChain.push(parent)
    return this as any
  }

  done(): If<Equal<parent, null>, never, SFQ<NonNullable<parent>[1]['table'], NonNullable<parent>[1]['_parent'], R>> {
    if (this.parentChain.length === 0)
      throw new Error('Cannot finish empty parent query')

    this.parentChain.pop()
    return this as any
  }

  query(opts?: { clauses?: string, stringOnly?: false }): If<
    Equal<parent, null>,
    (<Q extends Partial<SFInterfaces[T]>=R>(sfService: SalesforceService) => Promise<Q[]>),
    never
  >
  query(opts: { clauses?: string, stringOnly: true }): If<Equal<parent, null>, string, never>
  query({ clauses, stringOnly = false }: { clauses?: string, stringOnly?: boolean } = {}): If<
    Equal<parent, null>,
    string | (<Q extends Partial<SFInterfaces[T]>=R>(sfService: SalesforceService) => Promise<Q[]>),
    never
    > {
    if (this.parentChain.length > 0)
      throw new Error('Cannot execute unfinished Query')

    return (
      stringOnly
        ? `SELECT ${this.fields.join(',')} FROM ${this.table}${clauses ? ' WHERE ' + clauses : ''}`
        : ((sfService: SalesforceService) =>
          sfService.query<R>({ table: this.table, fields: this.fields, clauses })) as any
    )
  }
}

const x = new SFQ('Contact').select('Id').parent('Account').select('CreatedById').done().query()
