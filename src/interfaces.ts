import { ConflictTypes, FetchTypes, JoinTypes, OrderTypes } from './enums'
import { Raw } from './tools'
import { Merge } from './typefest'

export type Primitive = null | string | number | boolean | bigint | Raw

export type QueryLoggerMeta = {
  duration?: number
}

export type QueryBuilderOptions<IsAsync extends boolean = true> = {
  logger?: (query: RawQuery, meta: QueryLoggerMeta) => MaybeAsync<IsAsync, void>
}

export type DefaultObject = Record<string, Primitive>
export type DefaultReturnObject = Record<string, null | string | number | boolean | bigint>

export type WhereClause = {
  conditions: Array<string>
  params: Array<Primitive>
}

// The Where type for individual calls can still be flexible,
// but internally SelectOne and SelectAll will use WhereClause.
export type WhereInput =
  | {
      conditions: string | Array<string>
      // TODO: enable named parameters with DefaultObject
      params?: Primitive | Primitive[]
    }
  | string
  | Array<string>

export type Join = {
  type?: string | JoinTypes
  table: string | SelectAll
  on: string
  alias?: string
}

export type SelectOne = {
  tableName: string
  fields?: string | Array<string>
  where?: WhereClause // Changed from Where to WhereClause
  join?: Join | Array<Join>
  groupBy?: string | Array<string>
  having?: string | Array<string>
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  offset?: number
}

export type RawQuery = {
  query: string
  args?: Primitive[]
  fetchType?: FetchTypes
}

export type RawQueryFetchOne = Omit<RawQuery, 'fetchType'> & {
  fetchType: FetchTypes.ONE
}

export type RawQueryFetchAll = Omit<RawQuery, 'fetchType'> & {
  fetchType: FetchTypes.ALL
}

export type RawQueryWithoutFetching = Omit<RawQuery, 'fetchType'>

export type SelectAll = SelectOne & {
  limit?: number
  lazy?: boolean
}

export type ConflictUpsert = {
  column: string | Array<string>
  data: DefaultObject
  where?: WhereInput
}

export type Insert = {
  tableName: string
  data: DefaultObject | Array<DefaultObject>
  returning?: string | Array<string>
  onConflict?: string | ConflictTypes | ConflictUpsert
}

export type InsertOne = Omit<Insert, 'data' | 'returning'> & {
  data: DefaultObject
  returning: string | Array<string>
}

export type InsertMultiple = Omit<Insert, 'data' | 'returning'> & {
  data: Array<DefaultObject>
  returning: string | Array<string>
}

export type InsertWithoutReturning = Omit<Insert, 'returning'>

export type test<I extends Insert = Insert> = I

export type Update = {
  tableName: string
  data: DefaultObject
  where?: WhereInput
  returning?: string | Array<string>
  onConflict?: string | ConflictTypes
}

export type UpdateReturning = Omit<Update, 'returning'> & {
  returning: string | Array<string>
}
export type UpdateWithoutReturning = Omit<Update, 'returning'>

export type Delete = {
  tableName: string
  where: WhereInput // This field is optional, but is kept required in type to warn users of delete without where
  returning?: string | Array<string>
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  limit?: number
  offset?: number
}

export type DeleteReturning = Omit<Delete, 'returning'> & {
  returning: string | Array<string>
}
export type DeleteWithoutReturning = Omit<Delete, 'returning'>

export type D1Meta = {
  changed_db: boolean
  changes: number
  duration: number
  last_row_id: string | number
  rows_read: number
  rows_written: number
  served_by: string
  size_after: number
}

export type D1Result = {
  // These 4 fields are deprecated, and only kept here for retro compatibility, users should use the meta field bellow
  changes?: number
  duration: number
  last_row_id?: string | number
  served_by: string

  meta?: D1Meta
  success: boolean
}

export type PGResult = {
  command: string
  lastRowId?: string | number
  rowCount: number
}

export type IterableResult<ResultWrapper, Result, IsAsync extends boolean> = IsAsync extends true
  ? Promise<Merge<ResultWrapper, { results?: AsyncIterable<Result> }>>
  : Merge<ResultWrapper, { results?: Iterable<Result> }>

export type FullArrayResult<ResultWrapper, Result, IsAsync extends boolean> = IsAsync extends true
  ? Promise<Merge<ResultWrapper, { results?: Array<Result> }>>
  : Merge<ResultWrapper, { results?: Array<Result> }>

export type ArrayResult<
  ResultWrapper,
  Result,
  IsAsync extends boolean,
  IsLazy extends boolean = false,
> = IsLazy extends true
  ? IterableResult<ResultWrapper, Result, IsAsync>
  : FullArrayResult<ResultWrapper, Result, IsAsync>

export type OneResult<ResultWrapper, Result> = Merge<ResultWrapper, { results?: Result }>

export type CountResult<GenericResultWrapper> = OneResult<GenericResultWrapper, { total: number }>

export type AsyncType<T> = Promise<T>
export type SyncType<T> = T
export type MaybeAsync<IsAsync extends boolean, T> = IsAsync extends true ? AsyncType<T> : SyncType<T>
