import { Param } from '../decorators/ParamOptions.interface'

// tslint:disable-next-line:variable-name
export const RefineTag = Symbol('__RefineTag')
// tslint:disable-next-line:variable-name
export const RefineBaseTypeTag = Symbol('__RefineBaseType')
/**
 * Refined is essentially newtype
 * We create a new type that has the same runtime representation as its inner type,
 * however the inner type is not assignable to the new type.
 * This differs from newtype-ts in that a newtype is also assignable to its carrier type
 *
 * Example:
 * ```ts
 * type PositiveNumber = Refined<number, 'Positive'>
 * const x: PositiveNumber = 5  // will not work, since type of 5 is number
 * const y: PositiveNumber = unsafeCoerce<PositiveNumber>(5) // works, since we coerced 5 to type PositiveNumber
 * ```
 */
export type Refined<U, T> = U & {
  readonly [RefineTag]: T
  readonly [RefineBaseTypeTag]: U
}

export type RefineBaseType<T, K> = T extends Refined<any, K>
  ? T[typeof RefineBaseTypeTag]
  : never

export type QueryKey = 'Query'
export type BodyKey = 'Body'
export type FileKey = 'File'
export type UserKey = 'User'
export type UrlParamKey = 'UrlParam'
export type RouteMetadataKey = 'RouteMetadata'

export type Body<T> = Refined<T, BodyKey>
export interface FilesExtraBase {
  name: string
  max: number
}
export type Files<T, name extends string, max extends number = 1> = Refined<
  T,
  FileKey & { name: name; max: max }
>
export type Query<T, k extends string> = Param<T, { query: k }>
export type CurrUser<T> = Refined<T, UserKey>
export type UrlParam<T, k extends string> = Refined<T, UrlParamKey & k>
// void is typescript's Unit type. null or undefined also work
export type RouteMetadata<Data extends RouteDataType> = Refined<
  void,
  RouteMetadataKey & Data
>

export type QueryData<T> = RefinedExtra<T, QueryKey>
export type UrlParamData<T> = RefinedExtra<T, UrlParamKey>
export type RouteMetadataData<T> = RefinedExtra<T, RouteMetadataKey>

export type HttpMethod = 'POST' | 'GET' | 'PUT' | 'DELETE'
// tslint:disable-next-line:interface-over-type-literal
export type RouteDataType = {
  route: string
  auth: boolean | string[]
  method: HttpMethod
}

/**
 * Extract any extra information attatched to the phantom field for a given refinement key
 */
export type RefinedExtra<T, Tag extends string> = T extends {
  readonly [RefineTag]: Tag & infer N
}
  ? N
  : never

export {
  Param,
  ParamKey,
  ParamData,
} from '../decorators/ParamOptions.interface'
// export { RefreshParam, RefreshData } from '../decorators/refresh.decorator'
