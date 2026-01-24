import { FetchTypes } from './enums'
import { CountResult, MaybeAsync, Primitive, QueryLoggerMeta, RawQuery } from './interfaces'

export class Raw {
  public isRaw = true
  public content: any
  constructor(content: any) {
    this.content = content
  }
}

export class Query<Result = any, IsAsync extends boolean = true> {
  public executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>
  public query: string
  public arguments?: Primitive[]
  public fetchType?: FetchTypes

  constructor(
    executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>,
    query: string,
    args?: Primitive[],
    fetchType?: FetchTypes
  ) {
    this.executeMethod = executeMethod
    this.query = trimQuery(query)
    this.arguments = args
    this.fetchType = fetchType
  }

  execute(): MaybeAsync<IsAsync, Result> {
    return this.executeMethod(this)
  }

  toObject(): RawQuery {
    return {
      query: this.query,
      args: this.arguments,
      fetchType: this.fetchType,
    }
  }

  /**
   * Returns the SQL query string and parameters without executing.
   * Useful for debugging and logging.
   *
   * @example
   * const { sql, params } = qb.select('users').where('id = ?', 1).getQueryAll().toSQL()
   * // sql: "SELECT * FROM users WHERE id = ?"
   * // params: [1]
   */
  toSQL(): { sql: string; params: Primitive[] } {
    return {
      sql: this.query,
      params: this.arguments ?? [],
    }
  }

  /**
   * Returns the SQL query with parameters interpolated for debugging purposes.
   * WARNING: This should NEVER be used to execute queries as it bypasses parameterization.
   *
   * @example
   * const debugSql = qb.select('users').where('id = ?', 1).getQueryAll().toDebugSQL()
   * // "SELECT * FROM users WHERE id = 1"
   */
  toDebugSQL(): string {
    if (!this.arguments || this.arguments.length === 0) {
      return this.query
    }

    let debugSql = this.query
    const params = [...this.arguments]

    // Replace numbered parameters first (?1, ?2, etc.)
    debugSql = debugSql.replace(/\?(\d+)/g, (_, num) => {
      const index = Number.parseInt(num, 10) - 1
      return formatDebugParam(params[index])
    })

    // Then replace unnumbered parameters
    let paramIndex = 0
    debugSql = debugSql.replace(/\?(?!\d)/g, () => {
      return formatDebugParam(params[paramIndex++])
    })

    return debugSql
  }
}

/**
 * Format a parameter value for debug SQL output.
 */
function formatDebugParam(value: Primitive | undefined): string {
  if (value === undefined) return '?'
  if (value === null) return 'NULL'
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value instanceof ArrayBuffer) return "'[ArrayBuffer]'"
  return String(value)
}

export class QueryWithExtra<GenericResultWrapper, Result = any, IsAsync extends boolean = true> extends Query<
  Result,
  IsAsync
> {
  private countQuery: string

  constructor(
    executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>,
    query: string,
    countQuery: string,
    args?: Primitive[],
    fetchType?: FetchTypes
  ) {
    super(executeMethod, query, args, fetchType)
    this.countQuery = countQuery
  }

  count(): MaybeAsync<IsAsync, CountResult<GenericResultWrapper>> {
    return this.executeMethod(
      new Query(this.executeMethod, this.countQuery, this.arguments, FetchTypes.ONE)
    ) as MaybeAsync<IsAsync, CountResult<GenericResultWrapper>>
  }
}

export function trimQuery(query: string): string {
  return query.replace(/\s\s+/g, ' ')
}
