import { ConflictTypes, FetchTypes, JoinTypes, OrderTypes } from './enums'
import { Raw } from './tools'
import { IsEqual, Merge, Primitive, Simplify } from './typefest'

export type DefaultObject = Record<string, Primitive>

export type Where =
  | {
      conditions: string | Array<string>
      // TODO: enable named parameters Record<string, string | boolean | number | null>
      params?: (string | boolean | number | null | Raw)[]
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
  having?: string
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  offset?: number
}

export type RawQuery = {
  query: string
  args?: (string | number | boolean | null | Raw)[]
  fetchType?: FetchTypes
}

export type SelectAll = SelectOne & {
  limit?: number
}

export type ConflictUpsert = {
  column: string | Array<string>
  data: Record<string, string | boolean | number | null | Raw>
  where?: Where
}

export type Insert = {
  tableName: string
  data:
    | Record<string, string | boolean | number | null | Raw>
    | Array<Record<string, string | boolean | number | null | Raw>>
  returning?: string | Array<string>
  onConflict?: string | ConflictTypes | ConflictUpsert
}

export type Update = {
  tableName: string
  data: Record<string, string | boolean | number | null | Raw>
  where?: Where
  returning?: string | Array<string>
  onConflict?: string | ConflictTypes
}

export type Delete = {
  tableName: string
  where: Where // This field is optional, but is kept required in type to warn users of delete without where
  returning?: string | Array<string>
}

export type D1Result = {
  changes?: number
  duration: number
  last_row_id?: string | number
  served_by: string
  success: boolean
}

export type PGResult = {
  command: string
  lastRowId?: string | number
  rowCount: number
}

export type ArrayResult<ResultWrapper, Result> = Merge<ResultWrapper, { results?: Array<Result> }>
export type OneResult<ResultWrapper, Result> = Merge<ResultWrapper, { results?: Result }>
export type EitherResult<ResultWrapper, Result> = Merge<ResultWrapper, { results?: Array<Result> | Result }>

// Types bellow are WIP to improve even more type hints for raw and insert queries
export type GetFetchValue<T> = T extends { fetchType?: infer U } ? U : never
export type SwitchFetch<P, A, B> = IsEqual<P, FetchTypes.ALL> extends true
  ? ArrayResult<A, B>
  : IsEqual<P, FetchTypes.ONE> extends true
  ? OneResult<A, B>
  : A

export type FindResult<P, A, B> = Simplify<SwitchFetch<GetFetchValue<P>, A, B>>

// raw<GenericResult=DefaultObject, P extends RawQuery = RawQuery>(params: P): Query<FindResult<P, GenericResultWrapper, GenericResult>> {
//
// }
