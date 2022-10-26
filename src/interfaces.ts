import { OrderTypes } from './enums'

export interface Where {
  conditions: string | Array<string>
  // TODO: enable named parameters Record<string, string | boolean | number | null>
  params?: (string | boolean | number | null)[]
}

export interface SelectOne {
  tableName: string
  fields: string | Array<string>
  where?: Where
  groupBy?: string | Array<string>
  having?: string
  orderBy?: string | Array<string> | Record<string, string | OrderTypes>
  offset?: number
}

export interface SelectAll extends SelectOne {
  limit?: number
}

export interface Insert {
  tableName: string
  data: Record<string, string | boolean | number | null>
  returning?: string | Array<string>
}

export interface Update {
  tableName: string
  data: Record<string, string | boolean | number | null>
  where: Where
  returning?: string | Array<string>
}

export interface Delete {
  tableName: string
  where: Where
  returning?: string | Array<string>
}

export interface Result {
  changes?: number
  duration: number
  lastRowId?: number
  results?: Array<Record<string, string | boolean | number | null>>
  served_by: string
  success: boolean
}

export interface ResultOne {
  changes?: number
  duration: number
  lastRowId?: number
  results?: Record<string, string | boolean | number | null>
  served_by: string
  success: boolean
}
