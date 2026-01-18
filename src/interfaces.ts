import { ConflictTypes, FetchTypes, JoinTypes, OrderTypes } from './enums'
import { SelectBuilder } from './modularBuilder'
import { ColumnName, TableName, TableSchema } from './schema'
import { Raw } from './tools'
import { Merge } from './typefest'

export type Primitive =
  | null
  | string
  | number
  | boolean
  | bigint
  | ArrayBuffer
  | Raw
  | SelectAll
  | SelectBuilder<any, any, any>

export type QueryLoggerMeta = {
  duration?: number
}

export type QueryBuilderOptions<IsAsync extends boolean = true> = {
  logger?: (query: RawQuery, meta: QueryLoggerMeta) => MaybeAsync<IsAsync, void>
}

export type DefaultObject = Record<string, Primitive>
export type DefaultReturnObject = Record<string, null | string | number | boolean | bigint | ArrayBuffer>

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
  table: string | SelectAll | SelectBuilder<any, any, any>
  on: string
  alias?: string
}

export type SelectOne = {
  tableName: string
  fields?: string | Array<string>
  where?: Where
  join?: Join | Array<Join>
  groupBy?: string | Array<string>
  having?: Where
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  offset?: number
  subQueryPlaceholders?: Record<string, SelectAll>
  subQueryTokenNextId?: number
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
  rowsRead?: number
  rowsWritten?: number

  meta?: D1Meta
  success: boolean
}

export type DOResult = {
  rowsRead: number
  rowsWritten: number
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

// ============================================================================
// Schema-Aware Types
// ============================================================================

/**
 * Schema-aware SELECT parameters.
 * When a schema is provided, tableName and fields get autocomplete.
 */
export type TypedSelectOne<
  S extends TableSchema,
  T extends TableName<S>,
  F extends ColumnName<S, T> = ColumnName<S, T>,
> = {
  tableName: T
  fields?: F[] | F | '*'
  where?: Where
  join?: Join | Array<Join>
  groupBy?: ColumnName<S, T> | ColumnName<S, T>[] | string | string[]
  having?: Where
  orderBy?: Partial<Record<ColumnName<S, T>, OrderTypes | string>> | string | string[]
  offset?: number
}

/**
 * Schema-aware SELECT ALL parameters (includes limit and lazy).
 */
export type TypedSelectAll<
  S extends TableSchema,
  T extends TableName<S>,
  F extends ColumnName<S, T> = ColumnName<S, T>,
> = TypedSelectOne<S, T, F> & {
  limit?: number
  lazy?: boolean
}

/**
 * Schema-aware INSERT parameters.
 */
export type TypedInsert<S extends TableSchema, T extends TableName<S>> = {
  tableName: T
  data: Partial<S[T]> | Array<Partial<S[T]>>
  returning?: ColumnName<S, T>[] | ColumnName<S, T> | '*'
  onConflict?: string | ConflictTypes | ConflictUpsert
}

/**
 * Schema-aware UPDATE parameters.
 */
export type TypedUpdate<S extends TableSchema, T extends TableName<S>> = {
  tableName: T
  data: Partial<S[T]>
  where?: Where
  returning?: ColumnName<S, T>[] | ColumnName<S, T> | '*'
  onConflict?: string | ConflictTypes
}

/**
 * Schema-aware DELETE parameters.
 */
export type TypedDelete<S extends TableSchema, T extends TableName<S>> = {
  tableName: T
  where: Where
  returning?: ColumnName<S, T>[] | ColumnName<S, T> | '*'
  orderBy?: Partial<Record<ColumnName<S, T>, OrderTypes | string>> | string | string[]
  limit?: number
  offset?: number
}

/**
 * Infer the result type based on selected fields.
 * If fields is '*' or undefined, returns full table type.
 * If fields is an array, returns Pick of those fields.
 */
export type InferResult<S extends TableSchema, T extends TableName<S>, F> = F extends '*'
  ? S[T]
  : F extends ColumnName<S, T>[]
    ? Pick<S[T], F[number]>
    : F extends ColumnName<S, T>
      ? Pick<S[T], F>
      : S[T]
