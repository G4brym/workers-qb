import { ConflictTypes, FetchTypes, OrderTypes } from './enums'
import {
  ArrayResult,
  ConflictUpsert,
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
  SelectOne,
  Update,
  UpdateReturning,
  UpdateWithoutReturning,
  Where,
} from './interfaces'
import { asyncLoggerWrapper, defaultLogger } from './logger'
import { MigrationOptions, asyncMigrationsBuilder } from './migrations'
import { SelectBuilder } from './modularBuilder'
import { Query, QueryWithExtra, Raw } from './tools'

export class QueryBuilder<GenericResultWrapper, IsAsync extends boolean = true> {
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

  select<GenericResult = DefaultReturnObject>(
    tableName: string
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
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

  fetchOne<GenericResult = DefaultReturnObject>(
    params: SelectOne
  ): QueryWithExtra<GenericResultWrapper, OneResult<GenericResultWrapper, GenericResult>, IsAsync> {
    return new QueryWithExtra(
      (q) => {
        return this.execute(q)
      },
      this._select({ ...params, limit: 1 }),
      this._select({
        ...params,
        fields: 'count(*) as total',
        offset: undefined,
        groupBy: undefined,
        limit: 1,
      }),
      typeof params.where === 'object' && !Array.isArray(params.where) && params.where?.params
        ? Array.isArray(params.where?.params)
          ? params.where?.params
          : [params.where?.params]
        : undefined,
      FetchTypes.ONE
    )
  }

  fetchAll<GenericResult = DefaultReturnObject, P extends SelectAll = SelectAll>(
    params: P
  ): QueryWithExtra<
    GenericResultWrapper,
    ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false>,
    IsAsync
  > {
    return new QueryWithExtra(
      (q) => {
        return params.lazy
          ? (this.lazyExecute(q) as unknown as MaybeAsync<
              IsAsync,
              ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false>
            >)
          : this.execute(q)
      },
      this._select({ ...params, lazy: undefined }),
      this._select({
        ...params,
        fields: 'count(*) as total',
        offset: undefined,
        groupBy: undefined,
        limit: 1,
        lazy: undefined,
      }),
      typeof params.where === 'object' && !Array.isArray(params.where) && params.where?.params
        ? Array.isArray(params.where?.params)
          ? params.where?.params
          : [params.where?.params]
        : undefined,
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

  insert<GenericResult = DefaultReturnObject>(
    params: InsertOne
  ): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>
  insert<GenericResult = DefaultReturnObject>(
    params: InsertMultiple
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  insert<GenericResult = DefaultReturnObject>(params: InsertWithoutReturning): Query<GenericResultWrapper, IsAsync>
  insert<GenericResult = DefaultReturnObject>(params: Insert): unknown {
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

  update<GenericResult = DefaultReturnObject>(
    params: UpdateReturning
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  update<GenericResult = DefaultReturnObject>(params: UpdateWithoutReturning): Query<GenericResultWrapper, IsAsync>
  update<GenericResult = DefaultReturnObject>(params: Update): unknown {
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

  delete<GenericResult = DefaultReturnObject>(
    params: DeleteReturning
  ): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>
  delete<GenericResult = DefaultReturnObject>(params: DeleteWithoutReturning): Query<GenericResultWrapper, IsAsync>
  delete<GenericResult = DefaultReturnObject>(params: Delete): unknown {
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

  protected _select(params: SelectAll): string {
    return (
      `SELECT ${this._fields(params.fields)}
       FROM ${params.tableName}` +
      this._join(params.join) +
      this._where(params.where) +
      this._groupBy(params.groupBy) +
      this._having(params.having) +
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

  protected _where(value?: Where): string {
    if (!value) return ''
    let conditions = value

    if (typeof value === 'object' && !Array.isArray(value)) {
      conditions = value.conditions
    }

    if (typeof conditions === 'string') return ` WHERE ${conditions.toString()}`

    if ((conditions as Array<string>).length === 1) return ` WHERE ${(conditions as Array<string>)[0]!.toString()}`

    if ((conditions as Array<string>).length > 1) {
      return ` WHERE (${(conditions as Array<string>).join(') AND (')})`
    }

    return ''
  }

  protected _join(value?: Join | Array<Join>): string {
    if (!value) return ''

    if (!Array.isArray(value)) {
      value = [value]
    }

    const joinQuery: Array<string> = []
    value.forEach((item: Join) => {
      const type = item.type ? `${item.type} ` : ''
      joinQuery.push(
        `${type}JOIN ${typeof item.table === 'string' ? item.table : `(${this._select(item.table)})`}${
          item.alias ? ` AS ${item.alias}` : ''
        } ON ${item.on}`
      )
    })

    return ' ' + joinQuery.join(' ')
  }

  protected _groupBy(value?: string | Array<string>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` GROUP BY ${value}`

    return ` GROUP BY ${value.join(', ')}`
  }

  protected _having(value?: string | Array<string>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` HAVING ${value}`

    return ` HAVING ${value.join(' AND ')}`
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
