import { ConflictTypes, FetchTypes, OrderTypes } from './enums'
import {
  ArrayResult,
  ConflictUpsert, DatabaseSchema,
  DefaultObject,
  DefaultReturnObject,
  Delete,
  DeleteReturning,
  DeleteWithoutReturning,
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
  SelectOne, TableNameType,
  Update,
  UpdateReturning,
  UpdateWithoutReturning,
  Where,
} from './interfaces'
import { asyncLoggerWrapper, defaultLogger } from './logger'
import { MigrationOptions, asyncMigrationsBuilder } from './migrations'
import { SelectBuilder } from './modularBuilder'
import { Query, QueryWithExtra, Raw } from './tools'

export class QueryBuilder<
  GenericResultWrapper,
  IsAsync extends boolean = true,
  Schema extends DatabaseSchema = {},
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
    tableName: TableNameType<Schema>
    schema: string
    ifNotExists?: boolean
  }): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync> {
    return new Query(
      (q) => {
        return this.execute(q)
      },
      `CREATE TABLE ${params.ifNotExists ? 'IF NOT EXISTS' : ''} ${params.tableName as string}
      ( ${params.schema})`
    )
  }

  dropTable<GenericResult = undefined>(params: {
    tableName: TableNameType<Schema>
    ifExists?: boolean
  }): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync> {
    return new Query(
      (q) => {
        return this.execute(q)
      },
      `DROP TABLE ${params.ifExists ? 'IF EXISTS' : ''} ${params.tableName as string}`
    )
  }

  select<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    tableName: TableName
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
      {
        tableName: tableName,
      },
      (params: SelectAll<Schema>) => {
        return this.fetchAll<GenericResult>(params)
      },
      (params: SelectOne<Schema>) => {
        return this.fetchOne<GenericResult>(params)
      }
    )
  }

  fetchOne<GenericResult = DefaultReturnObject>(
    params: SelectOne<Schema>
  ): QueryWithExtra<GenericResultWrapper, OneResult<GenericResultWrapper, GenericResult>, IsAsync> {
    const queryArgs: any[] = []
    const countQueryArgs: any[] = [] // Separate args for count query

    // Ensure subQueryPlaceholders are passed to the count query as well, if they exist on params
    const selectParamsForCount: SelectAll<Schema> = {
      ...params,
      fields: ['count(*) as total'],
      offset: undefined,
      groupBy: undefined,
      limit: 1,
    }
    if (params.subQueryPlaceholders) {
      selectParamsForCount.subQueryPlaceholders = params.subQueryPlaceholders
    }

    const mainSql = this._select({ ...params, limit: 1 } as SelectAll<Schema>, queryArgs)
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

  fetchAll<
    GenericResult = DefaultReturnObject,
    P extends SelectAll<Schema> = SelectAll<Schema>,
  >(
    params: P
  ): QueryWithExtra<
    GenericResultWrapper,
    ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false>,
    IsAsync
  > {
    const queryArgs: any[] = []
    const countQueryArgs: any[] = [] // Separate args for count query

    const mainQueryParams = { ...params, lazy: undefined }

    // Ensure subQueryPlaceholders are passed to the count query as well
    const countQueryParams: SelectAll<Schema> = {
      ...params,
      fields: ['count(*) as total'],
      offset: undefined,
      groupBy: undefined,
      limit: 1,
      lazy: undefined,
    }
    if (params.subQueryPlaceholders) {
      countQueryParams.subQueryPlaceholders = params.subQueryPlaceholders
    }

    const mainSql = this._select(mainQueryParams, queryArgs)
    const countSql = this._select(countQueryParams, countQueryArgs)

    return new QueryWithExtra(
      (q) => {
        return params.lazy
          ? (this.lazyExecute(q) as unknown as MaybeAsync<
              IsAsync,
              ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false>
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

  insert<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: InsertOne<Schema, TableName>
  ): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>
  insert<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: InsertMultiple<Schema, TableName>
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  insert<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: InsertWithoutReturning<Schema, TableName>
  ): Query<GenericResultWrapper, IsAsync>
  insert<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: Insert<Schema, TableName>
  ): unknown {
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

  update<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: UpdateReturning<Schema, TableName>
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  update<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: UpdateWithoutReturning<Schema, TableName>
  ): Query<GenericResultWrapper, IsAsync>
  update<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: Update<Schema, TableName>
  ): unknown {
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

  delete<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: DeleteReturning<Schema, TableName>
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  delete<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: DeleteWithoutReturning<Schema, TableName>
  ): Query<GenericResultWrapper, IsAsync>
  delete<GenericResult = DefaultReturnObject, TableName extends TableNameType<Schema> = string>(
    params: Delete<Schema, TableName>
  ): unknown {
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

  protected _onConflict<TableName extends TableNameType<Schema> = string>(
    resolution?: string | ConflictTypes | ConflictUpsert<Schema, TableName>
  ): string {
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

        return ` ON CONFLICT (${(resolution.column as string[]).join(', ')}) DO ${_update_query}`
      }

      return `OR ${resolution} `
    }
    return ''
  }

  protected _insert<TableName extends TableNameType<Schema> = string>(params: Insert<Schema, TableName>): string {
    const rows = []

    let data: Array<DefaultObject>
    if (!Array.isArray(params.data)) {
      data = [params.data]
    } else {
      data = params.data
    }

    if (!data || !data[0] || data.length === 0) {
      throw new Error('Insert data is undefined')
    }

    const columns = Object.keys(data[0]).join(', ')
    let index = 1

    let orConflict = '',
      onConflict = ''
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
      `INSERT ${orConflict} INTO ${params.tableName as string} (${columns})` +
      ` VALUES ${rows.join(', ')}` +
      onConflict +
      this._returning(params.returning as string[])
    )
  }

  protected _update<TableName extends TableNameType<Schema> = string>(params: Update<Schema, TableName>): string {
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
      if ((value as any) instanceof Raw) {
        // Raw parameters should not increase the index, as they are not a real parameter
        set.push(`${key} = ${value.content}`)
      } else {
        set.push(`${key} = ?${whereParamsLength + index}`)
        index += 1
      }
    }

    return (
      `UPDATE ${this._onConflict(params.onConflict)}${params.tableName as string}
       SET ${set.join(', ')}` +
      whereString +
      this._returning(params.returning as string[])
    )
  }

  protected _delete<TableName extends TableNameType<Schema> = string>(params: Delete<Schema, TableName>): string {
    return (
      `DELETE
            FROM ${params.tableName as string}` +
      this._where(params.where) +
      this._returning(params.returning as string[]) +
      this._orderBy(params.orderBy) +
      this._limit(params.limit) +
      this._offset(params.offset)
    )
  }

  protected _select<TableName extends TableNameType<Schema> = string>(
    params: SelectAll<Schema, TableName>,
    queryArgs?: any[]
  ): string {
    const isTopLevelCall = queryArgs === undefined
    if (isTopLevelCall) {
      queryArgs = []
    }

    // This assertion tells TypeScript that queryArgs is definitely assigned after the block above.
    const currentQueryArgs = queryArgs!

    const context = {
      subQueryPlaceholders: params.subQueryPlaceholders,
      queryArgs: currentQueryArgs,
      toSQLCompiler: this._select.bind(this),
    }

    return (
      `SELECT ${this._fields(params.fields as string[])}
       FROM ${params.tableName as string}` +
      this._join(params.join, context) +
      this._where(params.where, context) +
      this._groupBy(params.groupBy as string[]) +
      this._having(params.having, context) +
      this._orderBy(params.orderBy) +
      this._limit(params.limit) +
      this._offset(params.offset)
    )
  }

  protected _fields(value?: string | Array<string>): string {
    if (!value) return '*'
    if (typeof value === 'string') return value

    return value.join(', ')
  }

  protected _where(
    value: Where | undefined,
    context?: {
      subQueryPlaceholders?: Record<string, SelectAll<Schema, any>>
      queryArgs: any[]
      // Allow toSQLCompiler to be undefined for calls not originating from _select, though practically it should always be provided.
      toSQLCompiler?: (params: SelectAll<Schema, any>, queryArgs: any[]) => string
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

    for (const conditionStr of conditionStrings) {
      // Regex to split by token or by '?'
      const parts = conditionStr.split(/(__SUBQUERY_TOKEN_\d+__|\?)/g).filter(Boolean)
      let builtCondition = ''

      for (const part of parts) {
        if (part === '?') {
          if (primitiveParamIndex >= primitiveParams.length) {
            throw new Error(
              'SQL generation error: Not enough primitive parameters for "?" placeholders in WHERE clause.'
            )
          }
          currentContext.queryArgs.push(primitiveParams[primitiveParamIndex++])
          builtCondition += '?'
        } else if (part.startsWith('__SUBQUERY_TOKEN_') && part.endsWith('__')) {
          if (!currentContext.subQueryPlaceholders || !currentContext.toSQLCompiler) {
            throw new Error('SQL generation error: Subquery context not provided for token processing.')
          }
          const subQueryParams = currentContext.subQueryPlaceholders[part]
          if (!subQueryParams) {
            throw new Error(`SQL generation error: Subquery token ${part} not found in placeholders.`)
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
      throw new Error(
        'SQL generation error: Too many primitive parameters provided for "?" placeholders in WHERE clause.'
      )
    }

    if (processedConditions.length === 0) return ''
    if (processedConditions.length === 1) {
      return ` WHERE ${processedConditions[0]}`
    }
    return ` WHERE (${processedConditions.join(') AND (')})`
  }

  protected _join(
    value: Join<Schema> | Array<Join<Schema>> | undefined,
    context: {
      // subQueryPlaceholders are not directly used by _join for its own structure,
      // but toSQLCompiler will need them if item.table is a SelectAll object
      // that itself has subQueryPlaceholders.
      subQueryPlaceholders?: Record<string, SelectAll<Schema, any>>
      queryArgs: any[]
      toSQLCompiler: (params: SelectAll<Schema, any>, queryArgs: any[]) => string
    }
  ): string {
    if (!value) return ''

    let joinArray: Join<Schema>[]
    if (!Array.isArray(value)) {
      joinArray = [value]
    } else {
      joinArray = value
    }

    const joinQuery: Array<string> = []
    joinArray.forEach((item: Join<Schema>) => {
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
        tableSql = `(${context.toSQLCompiler(item.table as SelectAll<Schema, any>, context.queryArgs)})`
      }
      joinQuery.push(`${type}JOIN ${tableSql}${item.alias ? ` AS ${item.alias}` : ''} ON ${item.on}`)
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
      subQueryPlaceholders?: Record<string, SelectAll<Schema, any>>
      queryArgs: any[]
      toSQLCompiler?: (params: SelectAll<Schema, any>, queryArgs: any[]) => string
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

    for (const conditionStr of conditionStrings) {
      // Regex to split by token or by '?'
      const parts = conditionStr.split(/(__SUBQUERY_TOKEN_\d+__|\?)/g).filter(Boolean)
      let builtCondition = ''

      for (const part of parts) {
        if (part === '?') {
          if (primitiveParamIndex >= primitiveParams.length) {
            throw new Error(
              'SQL generation error: Not enough primitive parameters for "?" placeholders in HAVING clause.'
            )
          }
          currentContext.queryArgs.push(primitiveParams[primitiveParamIndex++])
          builtCondition += '?'
        } else if (part.startsWith('__SUBQUERY_TOKEN_') && part.endsWith('__')) {
          if (!currentContext.subQueryPlaceholders || !currentContext.toSQLCompiler) {
            throw new Error('SQL generation error: Subquery context not provided for token processing.')
          }
          const subQueryParams = currentContext.subQueryPlaceholders[part]
          if (!subQueryParams) {
            throw new Error(`SQL generation error: Subquery token ${part} not found in placeholders.`)
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
      throw new Error(
        'SQL generation error: Too many primitive parameters provided for "?" placeholders in HAVING clause.'
      )
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
      } else {
        return obj
      }
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
