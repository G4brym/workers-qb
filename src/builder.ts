import { ConflictTypes, FetchTypes, JoinTypes, OrderTypes } from './enums'
import { MissingDataError, MissingSubqueryContextError, ParameterMismatchError, SubqueryTokenError } from './errors'
import {
  AfterQueryHook,
  ArrayResult,
  BeforeQueryHook,
  ConflictUpsert,
  DefaultObject,
  DefaultReturnObject,
  Delete,
  DeleteReturning,
  DeleteWithoutReturning,
  InferResult,
  Insert,
  InsertMultiple,
  InsertOne,
  InsertWithoutReturning,
  Join,
  MaybeAsync,
  OneResult,
  QueryBuilderOptions,
  QueryLoggerMeta,
  RawQuery,
  RawQueryFetchAll,
  RawQueryFetchOne,
  RawQueryWithoutFetching,
  SelectAll,
  SelectOne,
  TypedDelete,
  TypedInsert,
  TypedSelectAll,
  TypedSelectOne,
  TypedUpdate,
  Update,
  UpdateReturning,
  UpdateWithoutReturning,
  Where,
} from './interfaces'
import { asyncLoggerWrapper, defaultLogger } from './logger'
import { SelectBuilder } from './modularBuilder'
import { ColumnName, TableName, TableSchema } from './schema'
import { Query, QueryWithExtra, Raw } from './tools'

export class QueryBuilder<
  Schema extends TableSchema = {},
  GenericResultWrapper = unknown,
  IsAsync extends boolean = true,
> {
  protected options: QueryBuilderOptions<IsAsync>
  loggerWrapper = asyncLoggerWrapper

  constructor(options?: QueryBuilderOptions<IsAsync>) {
    this.options = options || {}
  }

  setDebugger(state: boolean): void {
    if (state === true) {
      if (this.options.logger) {
        // a logger already exists, so it shouldn't be overwritten
        return
      }

      this.options.logger = defaultLogger
    } else {
      this.options.logger = undefined
    }
  }

  /**
   * Register a hook to be called before each query execution.
   * The hook can modify the query or throw to cancel execution.
   *
   * @param hook - The hook function to call before query execution
   *
   * @example
   * qb.beforeQuery((query, type) => {
   *   // Add tenant filter to all SELECT/UPDATE/DELETE queries
   *   if (type !== 'INSERT' && type !== 'RAW') {
   *     query.query = query.query.replace('WHERE', `WHERE tenant_id = ${tenantId} AND`)
   *   }
   *   return query
   * })
   */
  beforeQuery(hook: BeforeQueryHook<IsAsync>): this {
    this.options.beforeQuery = hook
    return this
  }

  /**
   * Register a hook to be called after each query execution.
   * The hook receives the result and can modify it or perform side effects.
   *
   * @param hook - The hook function to call after query execution
   *
   * @example
   * qb.afterQuery((result, query, duration) => {
   *   metrics.record(query.query, duration)
   *   return result
   * })
   */
  afterQuery(hook: AfterQueryHook<IsAsync>): this {
    this.options.afterQuery = hook
    return this
  }

  execute(query: Query<any, IsAsync>): MaybeAsync<IsAsync, any> {
    throw new Error('Execute method not implemented')
  }

  batchExecute(queryArray: Query<any, IsAsync>[]): MaybeAsync<IsAsync, any[]> {
    throw new Error('Batch execute method not implemented')
  }

  lazyExecute(query: Query<any, IsAsync>): IsAsync extends true ? Promise<AsyncIterable<any>> : Iterable<any> {
    throw new Error('Execute lazyExecute not implemented')
  }

  createTable<GenericResult = undefined>(params: {
    tableName: string
    schema: string
    ifNotExists?: boolean
  }): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync> {
    return new Query(
      (q) => {
        return this.execute(q)
      },
      `CREATE TABLE ${params.ifNotExists ? 'IF NOT EXISTS' : ''} ${params.tableName}
      ( ${params.schema})`
    )
  }

  dropTable<GenericResult = undefined>(params: {
    tableName: string
    ifExists?: boolean
  }): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync> {
    return new Query(
      (q) => {
        return this.execute(q)
      },
      `DROP TABLE ${params.ifExists ? 'IF EXISTS' : ''} ${params.tableName}`
    )
  }

  // Schema-aware overload: when Schema is defined, tableName is restricted to table names
  select<T extends TableName<Schema>>(tableName: T): SelectBuilder<Schema, GenericResultWrapper, Schema[T], IsAsync>
  // Fallback overload: when Schema is empty or explicit result type is provided
  select<GenericResult = DefaultReturnObject>(
    tableName: string
  ): SelectBuilder<{}, GenericResultWrapper, GenericResult, IsAsync>
  select<T extends string, GenericResult = DefaultReturnObject>(
    tableName: T
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        tableName: tableName,
      },
      (params: SelectAll) => {
        return this.fetchAll<GenericResult>(params)
      },
      (params: SelectOne) => {
        return this.fetchOne<GenericResult>(params)
      }
    )
  }

  // Schema-aware overload: when Schema is defined
  fetchOne<T extends TableName<Schema>, F extends ColumnName<Schema, T> = ColumnName<Schema, T>>(
    params: TypedSelectOne<Schema, T, F>
  ): QueryWithExtra<
    GenericResultWrapper,
    OneResult<GenericResultWrapper, InferResult<Schema, T, F[] | undefined>>,
    IsAsync
  >
  // Fallback overload: when Schema is empty or explicit result type is provided
  fetchOne<GenericResult = DefaultReturnObject>(
    params: SelectOne
  ): QueryWithExtra<GenericResultWrapper, OneResult<GenericResultWrapper, GenericResult>, IsAsync>
  // Implementation signature - uses any for compatibility with both overloads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchOne(params: any): QueryWithExtra<GenericResultWrapper, any, IsAsync> {
    const queryArgs: any[] = []
    const countQueryArgs: any[] = [] // Separate args for count query

    // Ensure subQueryPlaceholders are passed to the count query as well, if they exist on params
    const selectParamsForCount: SelectAll = {
      ...params,
      fields: 'count(*) as total',
      offset: undefined,
      groupBy: undefined,
      limit: 1,
    }
    if ((params as SelectAll).subQueryPlaceholders) {
      selectParamsForCount.subQueryPlaceholders = (params as SelectAll).subQueryPlaceholders
    }

    const mainSql = this._select({ ...params, limit: 1 } as SelectAll, queryArgs)
    const countSql = this._select(selectParamsForCount, countQueryArgs)

    return new QueryWithExtra(
      (q) => {
        return this.execute(q)
      },
      mainSql,
      countSql,
      queryArgs, // Use the populated queryArgs from the main _select call
      FetchTypes.ONE
    )
  }

  // Schema-aware overload: when Schema is defined
  fetchAll<
    T extends TableName<Schema>,
    F extends ColumnName<Schema, T> = ColumnName<Schema, T>,
    P extends TypedSelectAll<Schema, T, F> = TypedSelectAll<Schema, T, F>,
  >(
    params: P
  ): QueryWithExtra<
    GenericResultWrapper,
    ArrayResult<
      GenericResultWrapper,
      InferResult<Schema, T, F[] | undefined>,
      IsAsync,
      P extends { lazy: true } ? true : false
    >,
    IsAsync
  >
  // Fallback overload: when Schema is empty or explicit result type is provided
  fetchAll<GenericResult = DefaultReturnObject, P extends SelectAll = SelectAll>(
    params: P
  ): QueryWithExtra<
    GenericResultWrapper,
    ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false>,
    IsAsync
  >
  // Implementation signature - accepts any object with tableName
  fetchAll<GenericResult = DefaultReturnObject, P extends SelectAll = SelectAll>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any
  ): QueryWithExtra<
    GenericResultWrapper,
    ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false>,
    IsAsync
  > {
    const queryArgs: any[] = []
    const countQueryArgs: any[] = [] // Separate args for count query

    const mainQueryParams = { ...params, lazy: undefined }

    // Ensure subQueryPlaceholders are passed to the count query as well
    const countQueryParams: SelectAll = {
      ...params,
      fields: 'count(*) as total',
      offset: undefined,
      groupBy: undefined,
      limit: 1,
      lazy: undefined,
    }
    if ((params as SelectAll).subQueryPlaceholders) {
      countQueryParams.subQueryPlaceholders = (params as SelectAll).subQueryPlaceholders
    }

    const mainSql = this._select(mainQueryParams as SelectAll, queryArgs)
    const countSql = this._select(countQueryParams, countQueryArgs)

    return new QueryWithExtra(
      (q) => {
        return (params as SelectAll).lazy
          ? (this.lazyExecute(q) as unknown as MaybeAsync<
              IsAsync,
              ArrayResult<GenericResultWrapper, any, IsAsync, P extends { lazy: true } ? true : false>
            >)
          : this.execute(q)
      },
      mainSql,
      countSql,
      queryArgs, // Use the populated queryArgs from the main _select call
      FetchTypes.ALL
    )
  }

  raw<GenericResult = DefaultReturnObject>(
    params: RawQueryFetchOne
  ): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>
  raw<GenericResult = DefaultReturnObject>(
    params: RawQueryFetchAll
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  raw<GenericResult = DefaultReturnObject>(params: RawQueryWithoutFetching): Query<GenericResultWrapper, IsAsync>
  raw<GenericResult = DefaultReturnObject>(params: RawQuery): unknown {
    return new Query<any, IsAsync>(
      (q) => {
        return this.execute(q)
      },
      params.query,
      params.args,
      params.fetchType
    )
  }

  // Schema-aware overload: when Schema is defined
  insert<T extends TableName<Schema>>(params: TypedInsert<Schema, T>): Query<GenericResultWrapper, IsAsync>
  // Legacy overloads for backwards compatibility
  insert<GenericResult = DefaultReturnObject>(
    params: InsertOne
  ): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>
  insert<GenericResult = DefaultReturnObject>(
    params: InsertMultiple
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  insert<GenericResult = DefaultReturnObject>(params: InsertWithoutReturning): Query<GenericResultWrapper, IsAsync>
  // Implementation signature - accepts any object with tableName
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert<GenericResult = DefaultReturnObject>(params: any): Query<any, IsAsync> {
    let args: any[] = []

    if (typeof params.onConflict === 'object') {
      if (
        typeof params.onConflict?.where === 'object' &&
        !Array.isArray(params.onConflict?.where) &&
        params.onConflict?.where?.params
      ) {
        // 1 - on conflict where parameters
        args = args.concat(params.onConflict.where?.params)
      }

      if (params.onConflict.data) {
        // 2 - on conflict data parameters
        args = args.concat(this._parse_arguments(params.onConflict.data))
      }
    }

    // 3 - insert data parameters
    if (Array.isArray(params.data)) {
      for (const row of params.data) {
        args = args.concat(this._parse_arguments(row))
      }
    } else {
      args = args.concat(this._parse_arguments(params.data))
    }

    const fetchType = Array.isArray(params.data) ? FetchTypes.ALL : FetchTypes.ONE

    return new Query<any, IsAsync>(
      (q) => {
        return this.execute(q)
      },
      this._insert(params),
      args,
      fetchType
    )
  }

  // Schema-aware overload: when Schema is defined
  update<T extends TableName<Schema>>(params: TypedUpdate<Schema, T>): Query<GenericResultWrapper, IsAsync>
  // Legacy overloads for backwards compatibility
  update<GenericResult = DefaultReturnObject>(
    params: UpdateReturning
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  update<GenericResult = DefaultReturnObject>(params: UpdateWithoutReturning): Query<GenericResultWrapper, IsAsync>
  // Implementation signature - accepts any object with tableName
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update<GenericResult = DefaultReturnObject>(params: any): Query<any, IsAsync> {
    let args = this._parse_arguments(params.data)

    if (typeof params.where === 'object' && !Array.isArray(params.where) && params.where?.params) {
      if (Array.isArray(params.where?.params)) {
        args = params.where?.params.concat(args)
      } else {
        args = [params.where?.params].concat(args)
      }
    }

    return new Query<any, IsAsync>(
      (q) => {
        return this.execute(q)
      },
      this._update(params),
      args,
      FetchTypes.ALL
    )
  }

  // Schema-aware overload: when Schema is defined
  delete<T extends TableName<Schema>>(params: TypedDelete<Schema, T>): Query<GenericResultWrapper, IsAsync>
  // Legacy overloads for backwards compatibility
  delete<GenericResult = DefaultReturnObject>(
    params: DeleteReturning
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  delete<GenericResult = DefaultReturnObject>(params: DeleteWithoutReturning): Query<GenericResultWrapper, IsAsync>
  // Implementation signature - accepts any object with tableName
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete<GenericResult = DefaultReturnObject>(params: any): Query<any, IsAsync> {
    return new Query<any, IsAsync>(
      (q) => {
        return this.execute(q)
      },
      this._delete(params),
      typeof params.where === 'object' && !Array.isArray(params.where) && params.where?.params
        ? Array.isArray(params.where?.params)
          ? params.where?.params
          : [params.where?.params]
        : undefined,
      FetchTypes.ALL
    )
  }

  protected _parse_arguments(row: DefaultObject): Array<any> {
    // Raw parameters are placed directly in the query, and keeping them here would result in more parameters that are
    // expected in the query and could result in weird results or outright errors when using PostgreSQL
    return Object.values(row).filter((value) => {
      return !(value instanceof Raw)
    })
  }

  protected _onConflict(resolution?: string | ConflictTypes | ConflictUpsert): string {
    if (resolution) {
      if (typeof resolution === 'object') {
        if (!Array.isArray(resolution.column)) {
          resolution.column = [resolution.column]
        }

        const _update_query = this.update({
          tableName: '_REPLACE_',
          data: resolution.data,
          where: resolution.where,
        }).query.replace(' _REPLACE_', '') // Replace here is to lint the query

        return ` ON CONFLICT (${resolution.column.join(', ')}) DO ${_update_query}`
      }

      return `OR ${resolution} `
    }
    return ''
  }

  protected _insert(params: Insert): string {
    const rows = []

    let data: Array<DefaultObject>
    if (!Array.isArray(params.data)) {
      data = [params.data]
    } else {
      data = params.data
    }

    if (!data || !data[0] || data.length === 0) {
      throw new MissingDataError('INSERT', 'data')
    }

    const columns = Object.keys(data[0]).join(', ')
    let index = 1

    let orConflict = ''
    let onConflict = ''
    if (params.onConflict && typeof params.onConflict === 'object') {
      onConflict = this._onConflict(params.onConflict)

      if (
        typeof params.onConflict?.where === 'object' &&
        !Array.isArray(params.onConflict?.where) &&
        params.onConflict?.where?.params
      ) {
        if (Array.isArray(params.onConflict.where?.params)) {
          index += (params.onConflict.where?.params).length
        } else {
          index += 1
        }
      }

      if (params.onConflict.data) {
        index += this._parse_arguments(params.onConflict.data).length
      }
    } else {
      orConflict = this._onConflict(params.onConflict)
    }

    for (const row of data) {
      const values: Array<string> = []
      Object.values(row).forEach((value) => {
        if (value instanceof Raw) {
          // Raw parameters should not increase the index, as they are not a real parameter
          values.push(value.content)
        } else {
          values.push(`?${index}`)
          index += 1
        }
      })

      rows.push(`(${values.join(', ')})`)
    }

    return (
      `INSERT ${orConflict} INTO ${params.tableName} (${columns})` +
      ` VALUES ${rows.join(', ')}` +
      onConflict +
      this._returning(params.returning)
    )
  }

  protected _update(params: Update): string {
    const whereParamsLength: number =
      typeof params.where === 'object' && !Array.isArray(params.where) && params.where?.params
        ? Array.isArray(params.where?.params)
          ? Object.keys(params.where?.params).length
          : 1
        : 0

    let whereString = this._where(params.where)

    let parameterIndex = 1
    if (whereString && whereString.match(/(?<!\d)\?(?!\d)/)) {
      // if the user is using unnumbered parameters in where, replace '?' in whereString with numbered parameters
      whereString = whereString.replace(/\?/g, () => `?${parameterIndex++}`)
    }

    const set: Array<string> = []
    let index = 1
    for (const [key, value] of Object.entries(params.data)) {
      if (value instanceof Raw) {
        // Raw parameters should not increase the index, as they are not a real parameter
        set.push(`${key} = ${value.content}`)
      } else {
        set.push(`${key} = ?${whereParamsLength + index}`)
        index += 1
      }
    }

    return (
      `UPDATE ${this._onConflict(params.onConflict)}${params.tableName}
       SET ${set.join(', ')}` +
      whereString +
      this._returning(params.returning)
    )
  }

  protected _delete(params: Delete): string {
    return (
      `DELETE
            FROM ${params.tableName}` +
      this._where(params.where) +
      this._returning(params.returning) +
      this._orderBy(params.orderBy) +
      this._limit(params.limit) +
      this._offset(params.offset)
    )
  }

  protected _select(params: SelectAll, queryArgs?: any[]): string {
    let newQueryArgs = queryArgs
    const isTopLevelCall = queryArgs === undefined
    if (isTopLevelCall) {
      newQueryArgs = []
    }

    // This assertion tells TypeScript that newQueryArgs is definitely assigned after the block above.
    const currentQueryArgs = newQueryArgs!

    const context = {
      subQueryPlaceholders: params.subQueryPlaceholders,
      queryArgs: currentQueryArgs,
      toSQLCompiler: this._select.bind(this),
    }

    // Build CTE clause (WITH ...) if present
    let cteClause = ''
    if (params.cteDefinitions && params.cteDefinitions.length > 0) {
      const cteParts: string[] = []
      for (const cte of params.cteDefinitions) {
        const cteColumns = cte.columns ? `(${cte.columns.join(', ')})` : ''
        const cteSql = this._select(cte.query, currentQueryArgs)
        cteParts.push(`${cte.name}${cteColumns} AS (${cteSql})`)
      }
      cteClause = `WITH ${cteParts.join(', ')} `
    }

    let sql =
      cteClause +
      `SELECT ${this._distinct(params.distinct)}${this._fields(params.fields)}
       FROM ${params.tableName}` +
      this._join(params.join, context) +
      this._where(params.where, context) +
      this._groupBy(params.groupBy) +
      this._having(params.having, context)

    // Handle set operations (UNION, INTERSECT, EXCEPT)
    // Note: ORDER BY, LIMIT, OFFSET apply to the combined result
    if (params.setOperations && params.setOperations.length > 0) {
      for (const setOp of params.setOperations) {
        const setQuerySql = this._select(setOp.query, currentQueryArgs)
        sql += ` ${setOp.type} ${setQuerySql}`
      }
    }

    sql += this._orderBy(params.orderBy) + this._limit(params.limit) + this._offset(params.offset)

    return sql
  }

  protected _distinct(value?: boolean | Array<string>): string {
    if (!value) return ''
    if (value === true) return 'DISTINCT '
    // DISTINCT ON (columns) - PostgreSQL only
    return `DISTINCT ON (${value.join(', ')}) `
  }

  protected _fields(value?: string | Array<string>): string {
    if (!value) return '*'
    if (typeof value === 'string') return value

    return value.join(', ')
  }

  protected _where(
    value: Where | undefined,
    context?: {
      subQueryPlaceholders?: Record<string, SelectAll>
      queryArgs: any[]
      // Allow toSQLCompiler to be undefined for calls not originating from _select, though practically it should always be provided.
      toSQLCompiler?: (params: SelectAll, queryArgs: any[]) => string
    }
  ): string {
    if (!value) return ''

    // Ensure context is initialized for standalone _where calls (e.g., in _delete, _update)
    const currentContext = context ?? { queryArgs: [] }

    let conditionStrings: string[]
    let primitiveParams: any[] = []

    if (typeof value === 'object' && !Array.isArray(value)) {
      conditionStrings = Array.isArray(value.conditions) ? value.conditions : [value.conditions]
      if (value.params) {
        primitiveParams = Array.isArray(value.params) ? value.params : [value.params]
      }
    } else if (Array.isArray(value)) {
      conditionStrings = value
    } else {
      // Assuming value is a single string condition
      conditionStrings = [value as string]
    }

    if (conditionStrings.length === 0) return ''

    let primitiveParamIndex = 0
    const processedConditions: string[] = []

    // Track which numbered params have been seen (for reuse like ?1 appearing multiple times)
    const seenNumberedParams: Record<string, boolean> = {}

    for (const conditionStr of conditionStrings) {
      // Regex to split by token, numbered param (?1, ?2), or bare ?
      // Order matters: \?\d+ before \? to match numbered params first
      const parts = conditionStr.split(/(__SUBQUERY_TOKEN_\d+__|\?\d+|\?)/g).filter(Boolean)
      let builtCondition = ''

      for (const part of parts) {
        if (part === '?') {
          // Unnumbered param - consume sequentially
          if (primitiveParamIndex >= primitiveParams.length) {
            // Count total placeholders for better error message
            const totalPlaceholders = conditionStrings.join(' ').split('?').length - 1
            throw new ParameterMismatchError({
              clause: 'WHERE',
              query: conditionStrings.join(' AND '),
              expectedParams: totalPlaceholders,
              receivedParams: primitiveParams.length,
            })
          }
          currentContext.queryArgs.push(primitiveParams[primitiveParamIndex++])
          builtCondition += '?'
        } else if (/^\?\d+$/.test(part)) {
          // Numbered param like ?1, ?2 - only consume on first occurrence
          const paramNum = part.slice(1)
          if (!seenNumberedParams[paramNum]) {
            seenNumberedParams[paramNum] = true
            if (primitiveParamIndex >= primitiveParams.length) {
              throw new ParameterMismatchError({
                clause: 'WHERE',
                query: conditionStrings.join(' AND '),
                expectedParams: Object.keys(seenNumberedParams).length + 1,
                receivedParams: primitiveParams.length,
              })
            }
            currentContext.queryArgs.push(primitiveParams[primitiveParamIndex++])
          }
          builtCondition += part // Preserve the ?N in output
        } else if (part.startsWith('__SUBQUERY_TOKEN_') && part.endsWith('__')) {
          if (!currentContext.subQueryPlaceholders || !currentContext.toSQLCompiler) {
            throw new MissingSubqueryContextError()
          }
          const subQueryParams = currentContext.subQueryPlaceholders[part]
          if (!subQueryParams) {
            throw new SubqueryTokenError(part)
          }
          // The subquery's SQL is generated, and its arguments are added to the main query's argument list.
          const subQuerySql = currentContext.toSQLCompiler(subQueryParams, currentContext.queryArgs)
          builtCondition += `(${subQuerySql})`
        } else {
          builtCondition += part
        }
      }
      processedConditions.push(builtCondition)
    }

    if (primitiveParamIndex < primitiveParams.length && primitiveParams.length > 0) {
      // Check primitiveParams.length to avoid error if no params were expected
      throw new ParameterMismatchError({
        clause: 'WHERE',
        query: conditionStrings.join(' AND '),
        expectedParams: primitiveParamIndex,
        receivedParams: primitiveParams.length,
      })
    }

    if (processedConditions.length === 0) return ''
    if (processedConditions.length === 1) {
      return ` WHERE ${processedConditions[0]}`
    }
    return ` WHERE (${processedConditions.join(') AND (')})`
  }

  protected _join(
    value: Join | Array<Join> | undefined,
    context: {
      // subQueryPlaceholders are not directly used by _join for its own structure,
      // but toSQLCompiler will need them if item.table is a SelectAll object
      // that itself has subQueryPlaceholders.
      subQueryPlaceholders?: Record<string, SelectAll>
      queryArgs: any[]
      toSQLCompiler: (params: SelectAll, queryArgs: any[]) => string
    }
  ): string {
    if (!value) return ''

    let joinArray: Join[]
    if (!Array.isArray(value)) {
      joinArray = [value]
    } else {
      joinArray = value
    }

    const joinQuery: Array<string> = []
    joinArray.forEach((item: Join) => {
      const type = item.type ? `${item.type} ` : ''
      let tableSql: string
      if (typeof item.table === 'string') {
        tableSql = item.table
      } else if (item.table instanceof SelectBuilder) {
        tableSql = `(${context.toSQLCompiler(item.table.getOptions(), context.queryArgs)})`
      } else {
        // Subquery in JOIN. item.table is SelectAll in this case.
        // The toSQLCompiler (this._select) will handle any '?' or tokens within this subquery,
        // and push its arguments to context.queryArgs.
        tableSql = `(${context.toSQLCompiler(item.table, context.queryArgs)})`
      }
      // NATURAL joins don't use ON clause
      if (item.type === JoinTypes.NATURAL || item.type === 'NATURAL') {
        joinQuery.push(`${type}JOIN ${tableSql}${item.alias ? ` AS ${item.alias}` : ''}`)
      } else {
        joinQuery.push(`${type}JOIN ${tableSql}${item.alias ? ` AS ${item.alias}` : ''} ON ${item.on}`)
      }
    })

    return ' ' + joinQuery.join(' ')
  }

  protected _groupBy(value?: string | Array<string>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` GROUP BY ${value}`

    return ` GROUP BY ${value.join(', ')}`
  }

  protected _having(
    value: Where | undefined, // Using Where type as Having structure is similar for conditions/params
    context: {
      subQueryPlaceholders?: Record<string, SelectAll>
      queryArgs: any[]
      toSQLCompiler?: (params: SelectAll, queryArgs: any[]) => string
    }
  ): string {
    if (!value) return ''

    // Ensure context is initialized for standalone _where calls (e.g., in _delete, _update)
    const currentContext = context ?? { queryArgs: [] }

    let conditionStrings: string[]
    let primitiveParams: any[] = []

    if (typeof value === 'object' && !Array.isArray(value)) {
      conditionStrings = Array.isArray(value.conditions) ? value.conditions : [value.conditions]
      if (value.params) {
        primitiveParams = Array.isArray(value.params) ? value.params : [value.params]
      }
    } else if (Array.isArray(value)) {
      conditionStrings = value
    } else {
      // Assuming value is a single string condition
      conditionStrings = [value as string]
    }

    if (conditionStrings.length === 0) return ''

    let primitiveParamIndex = 0
    const processedConditions: string[] = []

    // Track which numbered params have been seen (for reuse like ?1 appearing multiple times)
    const seenNumberedParams: Record<string, boolean> = {}

    for (const conditionStr of conditionStrings) {
      // Regex to split by token, numbered param (?1, ?2), or bare ?
      // Order matters: \?\d+ before \? to match numbered params first
      const parts = conditionStr.split(/(__SUBQUERY_TOKEN_\d+__|\?\d+|\?)/g).filter(Boolean)
      let builtCondition = ''

      for (const part of parts) {
        if (part === '?') {
          // Unnumbered param - consume sequentially
          if (primitiveParamIndex >= primitiveParams.length) {
            const totalPlaceholders = conditionStrings.join(' ').split('?').length - 1
            throw new ParameterMismatchError({
              clause: 'HAVING',
              query: conditionStrings.join(' AND '),
              expectedParams: totalPlaceholders,
              receivedParams: primitiveParams.length,
            })
          }
          currentContext.queryArgs.push(primitiveParams[primitiveParamIndex++])
          builtCondition += '?'
        } else if (/^\?\d+$/.test(part)) {
          // Numbered param like ?1, ?2 - only consume on first occurrence
          const paramNum = part.slice(1)
          if (!seenNumberedParams[paramNum]) {
            seenNumberedParams[paramNum] = true
            if (primitiveParamIndex >= primitiveParams.length) {
              throw new ParameterMismatchError({
                clause: 'HAVING',
                query: conditionStrings.join(' AND '),
                expectedParams: Object.keys(seenNumberedParams).length + 1,
                receivedParams: primitiveParams.length,
              })
            }
            currentContext.queryArgs.push(primitiveParams[primitiveParamIndex++])
          }
          builtCondition += part // Preserve the ?N in output
        } else if (part.startsWith('__SUBQUERY_TOKEN_') && part.endsWith('__')) {
          if (!currentContext.subQueryPlaceholders || !currentContext.toSQLCompiler) {
            throw new MissingSubqueryContextError()
          }
          const subQueryParams = currentContext.subQueryPlaceholders[part]
          if (!subQueryParams) {
            throw new SubqueryTokenError(part)
          }
          // The subquery's SQL is generated, and its arguments are added to the main query's argument list.
          const subQuerySql = currentContext.toSQLCompiler(subQueryParams, currentContext.queryArgs)
          builtCondition += `(${subQuerySql})`
        } else {
          builtCondition += part
        }
      }
      processedConditions.push(builtCondition)
    }

    if (primitiveParamIndex < primitiveParams.length && primitiveParams.length > 0) {
      // Check primitiveParams.length to avoid error if no params were expected
      throw new ParameterMismatchError({
        clause: 'HAVING',
        query: conditionStrings.join(' AND '),
        expectedParams: primitiveParamIndex,
        receivedParams: primitiveParams.length,
      })
    }

    if (processedConditions.length === 0) return ''
    if (processedConditions.length === 1) {
      return ` HAVING ${processedConditions[0]}`
    }
    return ` HAVING (${processedConditions.join(') AND (')})`
  }

  protected _orderBy(value?: string | Array<string> | Record<string, string | OrderTypes>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` ORDER BY ${value}`

    const order: Array<Record<string, string> | string> = []
    if (Array.isArray(value)) {
      for (const val of value) {
        // @ts-ignore
        order.push(val)
      }
    } else {
      order.push(value)
    }

    const result = order.map((obj) => {
      if (typeof obj === 'object') {
        const objs: Array<string> = []
        Object.entries(obj).forEach(([key, item]) => {
          objs.push(`${key} ${item}`)
        })
        return objs.join(', ')
      }
      return obj
    })

    return ` ORDER BY ${result.join(', ')}`
  }

  protected _limit(value?: number): string {
    if (!value) return ''

    return ` LIMIT ${value}`
  }

  protected _offset(value?: number): string {
    if (!value) return ''

    return ` OFFSET ${value}`
  }

  protected _returning(value?: string | Array<string>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` RETURNING ${value}`

    return ` RETURNING ${value.join(', ')}`
  }
}
