import { ConflictTypes, FetchTypes, JoinTypes, OrderTypes } from './enums'
import { Raw } from './tools'
import { Merge } from './typefest'

export type Primitive = null | string | number | boolean | bigint | Raw

export type QueryLoggerMeta = {
  duration?: number
}

export type QueryBuilderOptions = {
  logger?: (query: RawQuery, meta: QueryLoggerMeta) => void | Promise<void>
}

export type DefaultObject = Record<string, Primitive>
export type DefaultReturnObject = Record<string, null | string | number | boolean | bigint>

export type Where =
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
  where?: Where
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
}

export type ConflictUpsert = {
  column: string | Array<string>
  data: DefaultObject
  where?: Where
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
  where?: Where
  returning?: string | Array<string>
  onConflict?: string | ConflictTypes
}

export type UpdateReturning = Omit<Update, 'returning'> & {
  returning: string | Array<string>
}
export type UpdateWithoutReturning = Omit<Update, 'returning'>

export type Delete = {
  tableName: string
  where: Where // This field is optional, but is kept required in type to warn users of delete without where
  returning?: string | Array<string>
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

export type ArrayResult<ResultWrapper, Result> = Merge<ResultWrapper, { results?: Array<Result> }>
export type OneResult<ResultWrapper, Result> = Merge<ResultWrapper, { results?: Result }>

export type CountResult<GenericResultWrapper> = OneResult<GenericResultWrapper, { total: number }>
