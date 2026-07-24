import { FetchTypes } from './enums'
import { CountResult, MaybeAsync, Primitive, QueryLoggerMeta, RawQuery } from './interfaces'

const RAW_QUESTION_MARK = '\u001fworkers_qb_raw_question_mark\u001f'
const PARAMETER_PATTERN = /\u001eworkers_qb_parameter:(\d+):(\d+)\u001e/g
const INTERNAL_TOKEN_PATTERN = /\u001fworkers_qb_raw_question_mark\u001f|\u001eworkers_qb_parameter:(\d+):(\d+)\u001e/g

export function renderRawSql(value: string): string {
  return value.replaceAll('?', RAW_QUESTION_MARK)
}

export function renderRaw(value: Raw): string {
  return renderRawSql(value.content)
}

export function renderParameter(index: number, displayIndex?: number): string {
  return `\u001eworkers_qb_parameter:${index}:${displayIndex ?? 0}\u001e`
}

function restoreRawQuestionMarks(query: string): string {
  return query.replaceAll(RAW_QUESTION_MARK, '?')
}

function renderPublicQuery(query: string): string {
  return restoreRawQuestionMarks(
    query.replace(PARAMETER_PATTERN, (_, _index, displayIndex) => (displayIndex === '0' ? '?' : `?${displayIndex}`))
  )
}

function preserveInternalTokens(statement: string, publicQuery: string, replacement: string): string {
  let prefixLength = 0
  while (
    prefixLength < publicQuery.length &&
    prefixLength < replacement.length &&
    publicQuery[prefixLength] === replacement[prefixLength]
  ) {
    prefixLength += 1
  }

  let suffixLength = 0
  while (
    suffixLength < publicQuery.length - prefixLength &&
    suffixLength < replacement.length - prefixLength &&
    publicQuery[publicQuery.length - suffixLength - 1] === replacement[replacement.length - suffixLength - 1]
  ) {
    suffixLength += 1
  }

  const replacements: Array<{ start: number; end: number; token: string }> = []
  let statementOffset = 0
  let publicOffset = 0

  for (const match of statement.matchAll(INTERNAL_TOKEN_PATTERN)) {
    const tokenStart = match.index
    publicOffset += tokenStart - statementOffset

    const token = match[0]
    const publicToken = token === RAW_QUESTION_MARK ? '?' : match[2] === '0' ? '?' : `?${match[2]}`
    const publicEnd = publicOffset + publicToken.length

    if (publicEnd <= prefixLength) {
      replacements.push({ start: publicOffset, end: publicEnd, token })
    } else if (publicOffset >= publicQuery.length - suffixLength) {
      const replacementStart = replacement.length - (publicQuery.length - publicOffset)
      replacements.push({ start: replacementStart, end: replacementStart + publicToken.length, token })
    }

    statementOffset = tokenStart + token.length
    publicOffset = publicEnd
  }

  let result = replacement
  for (const item of replacements.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, item.start) + item.token + result.slice(item.end)
  }
  return result
}

export class Raw {
  public isRaw = true
  public content: string
  constructor(content: string) {
    this.content = content
  }
}

export class Query<Result = any, IsAsync extends boolean = true> {
  public executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>
  private _query: string
  private statement: string
  public arguments?: Primitive[]
  public fetchType?: FetchTypes

  constructor(
    executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>,
    query: string,
    args?: Primitive[],
    fetchType?: FetchTypes
  ) {
    this.executeMethod = executeMethod
    this.statement = trimQuery(query)
    this._query = renderPublicQuery(this.statement)
    this.arguments = args
    this.fetchType = fetchType
  }

  execute(): MaybeAsync<IsAsync, Result> {
    return this.executeMethod(this)
  }

  get query(): string {
    return this._query
  }

  set query(query: string) {
    const replacement = trimQuery(query)
    this.statement = preserveInternalTokens(this.statement, this._query, replacement)
    this._query = replacement
  }

  getStatement(): string {
    return this.statement
  }

  toStatement(dialect: 'postgres' | 'sqlite'): string {
    let statement = this.statement.replace(PARAMETER_PATTERN, (_, index) =>
      dialect === 'postgres' ? `$${index}` : `?${index}`
    )

    if (dialect === 'postgres') {
      const maxNumbered = Math.max(
        0,
        ...[...statement.matchAll(/[?$](\d+)/g)].map((match) => Number.parseInt(match[1]!, 10))
      )
      let paramIndex = maxNumbered
      statement = statement.replace(/\?(\d+)?/g, (_, index) => (index !== undefined ? `$${index}` : `$${++paramIndex}`))
    }

    return restoreRawQuestionMarks(statement)
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

    let debugSql = this.statement.replace(PARAMETER_PATTERN, (_, index) =>
      formatDebugParam(this.arguments?.[Number.parseInt(index, 10) - 1])
    )
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

    return restoreRawQuestionMarks(debugSql)
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
