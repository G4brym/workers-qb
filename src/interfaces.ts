import { ConflictTypes, FetchTypes, JoinTypes, OrderTypes } from './enums'
import { SelectBuilder } from './modularBuilder'
import { Raw } from './tools'
import { Merge } from './typefest'

export type Primitive =
  | null
  | string
  | number
  | boolean
  | bigint
  | Raw
  | SelectAll<any>
  | SelectBuilder<any, any, any>

export type QueryLoggerMeta = {
  duration?: number
}

export type QueryBuilderOptions<IsAsync extends boolean = true> = {
  logger?: (query: RawQuery, meta: QueryLoggerMeta) => MaybeAsync<IsAsync, void>
}

export type DefaultObject = Record<string, Primitive>
export type DefaultReturnObject = Record<string, null | string | number | boolean | bigint>

// A generic type for field names that provides hints but allows any string.
export type Field<Schema extends DatabaseSchema, TableName extends TableNameType<Schema>> = (string & {}) | keyof Schema[TableName]
export type FieldChange<Schema extends DatabaseSchema, TableName extends TableNameType<Schema>> = Partial<Schema[TableName]> & { [K in keyof Schema[TableName]]?: Raw }


export type TableNameType<Schema> = (string & {}) | keyof Schema

export type Where =
  | {
      conditions: string | Array<string>
      // TODO: enable named parameters with DefaultObject
      params?: Primitive | Primitive[]
    }
  | string
  | Array<string>

export type Join<Schema extends DatabaseSchema> = {
  type?: string | JoinTypes
  table: string | SelectAll<Schema> | SelectBuilder<any, any, any>
  on: string
  alias?: string
}

export type SelectOne<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = {
  tableName: TableName
  fields?: Field<Schema, TableName> | Field<Schema, TableName>[]
  where?: Where
  join?: Join<Schema> | Array<Join<Schema>>
  groupBy?: Field<Schema, TableName>[]
  having?: Where
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  offset?: number
  subQueryPlaceholders?: Record<string, SelectAll<Schema>>
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

export type SelectAll<Schema extends DatabaseSchema> = SelectOne<Schema> & {
  limit?: number
  lazy?: boolean
}

export type ConflictUpsert<Schema extends DatabaseSchema, TableName extends TableNameType<Schema>> = {
  column: Field<Schema, TableName> | Field<Schema, TableName>[]
  data: Partial<FieldChange<Schema, TableName>>
  where?: Where
}

export type Insert<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = {
  tableName: TableName
  data:
    | FieldChange<Schema, TableName>
    | FieldChange<Schema, TableName>[]
  returning?: Field<Schema, TableName>[]
  onConflict?: string | ConflictTypes | ConflictUpsert<Schema, TableName>
}

export type InsertOne<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = Omit<
  Insert<Schema, TableName>,
  'data' | 'returning'
> & {
  data: Partial<Schema[TableName]> & { [K in keyof Schema[TableName]]?: Raw }
  returning: Field<Schema, TableName>[]
}

export type InsertMultiple<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = Omit<
  Insert<Schema, TableName>,
  'data' | 'returning'
> & {
  data: (Partial<Schema[TableName]> & { [K in keyof Schema[TableName]]?: Raw })[]
  returning: Field<Schema, TableName>[]
}

export type InsertWithoutReturning<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = Omit<
  Insert<Schema, TableName>,
  'returning'
>

export type Update<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = {
  tableName: TableName
  data: Partial<Schema[TableName]> & { [K in keyof Schema[TableName]]?: Raw }
  where?: Where
  returning?: Field<Schema, TableName>[]
  onConflict?: string | ConflictTypes
}

export type UpdateReturning<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = Omit<Update<Schema, TableName>, 'returning'> & {
  returning: Field<Schema, TableName>[]
}
export type UpdateWithoutReturning<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = Omit<
  Update<Schema, TableName>,
  'returning'
>

export type Delete<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = {
  tableName: TableName
  where: Where // This field is optional, but is kept required in type to warn users of delete without where
  returning?: Field<Schema, TableName>[]
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  limit?: number
  offset?: number
}

export type DeleteReturning<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = Omit<Delete<Schema, TableName>, 'returning'> & {
  returning: Field<Schema, TableName>[]
}
export type DeleteWithoutReturning<Schema extends DatabaseSchema, TableName extends TableNameType<Schema> = string> = Omit<
  Delete<Schema, TableName>,
  'returning'
>

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

export type DatabaseField = string | number | boolean | bigint;
export type DatabaseSchema = Record<string, Record<string, DatabaseField>>;
