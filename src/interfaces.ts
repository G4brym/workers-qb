import { ConflictTypes, JoinTypes, OrderTypes } from './enums'
import { Raw } from './tools'

export interface Where {
  conditions: string | Array<string>
  // TODO: enable named parameters Record<string, string | boolean | number | null>
  params?: (string | boolean | number | null)[]
}

export interface Join {
  type?: string | JoinTypes
  table: string | Subquery
  on: string
}

export interface SelectOne {
  tableName: string
  fields: string | Array<string>
  where?: Where
  join?: Join | Array<Join>
  groupBy?: string | Array<string>
  having?: string
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  offset?: number
}

export interface SelectAll extends SelectOne {
  limit?: number
}

export interface Subquery extends SelectAll {
  alias?: string
}

export interface Insert {
  tableName: string
  data:
    | Record<string, string | boolean | number | null | Raw>
    | Array<Record<string, string | boolean | number | null | Raw>>
  returning?: string | Array<string>
  onConflict?: string | ConflictTypes
}

export interface Update {
  tableName: string
  data: Record<string, string | boolean | number | null | Raw>
  where: Where
  returning?: string | Array<string>
  onConflict?: string | ConflictTypes
}

export interface Delete {
  tableName: string
  where: Where
  returning?: string | Array<string>
}

export interface D1Result {
  changes?: number
  duration: number
  lastRowId?: string | number
  results?: Array<Record<string, string | boolean | number | null>>
  served_by: string
  success: boolean
}

export interface D1ResultOne {
  changes?: number
  duration: number
  lastRowId?: string | number
  results?: Record<string, string | boolean | number | null>
  served_by: string
  success: boolean
}

export interface PGResult {
  command: string
  lastRowId?: string | number
  rowCount: number
  results?: Array<Record<string, string | boolean | number | null>>
}

export interface PGResultOne {
  command: string
  lastRowId?: string | number
  rowCount: number
  results?: Record<string, string | boolean | number | null>
}
