import {
  ArrayResult,
  CountResult,
  DefaultReturnObject,
  MaybeAsync,
  OneResult,
  Primitive,
  SelectAll,
  SelectOne,
} from './interfaces'
import { Query, QueryWithExtra } from './tools'

export class SelectBuilder<GenericResultWrapper, GenericResult = DefaultReturnObject, IsAsync extends boolean = true> {
  _debugger = false
  _options: Partial<SelectAll> = {}
  _fetchAll: (params: SelectAll) => QueryWithExtra<GenericResultWrapper, any, IsAsync>
  _fetchOne: (params: SelectOne) => QueryWithExtra<GenericResultWrapper, any, IsAsync>

  constructor(
    options: Partial<SelectAll>,
    fetchAll: (params: SelectAll) => QueryWithExtra<GenericResultWrapper, any, IsAsync>,
    fetchOne: (params: SelectOne) => QueryWithExtra<GenericResultWrapper, any, IsAsync>
  ) {
    this._options = options
    this._fetchAll = fetchAll
    this._fetchOne = fetchOne
  }

  setDebugger(state: boolean): void {
    this._debugger = state
  }

  tableName(tableName: SelectAll['tableName']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        tableName: tableName,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  fields(fields: SelectAll['fields']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('fields', this._options.fields, fields)
  }

  where(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    if (!Array.isArray(conditions)) {
      conditions = [conditions]
    }
    if (params === undefined) params = []
    if (!Array.isArray(params)) {
      params = [params]
    }

    if ((this._options.where as any)?.conditions) {
      conditions = (this._options.where as any).conditions.concat(conditions)
    }

    if ((this._options.where as any)?.params) {
      params = (this._options.where as any).params.concat(params)
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        where: {
          conditions: conditions,
          params: params,
        },
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  join(join: SelectAll['join']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('join', this._options.join, join)
  }

  groupBy(groupBy: SelectAll['groupBy']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('groupBy', this._options.groupBy, groupBy)
  }

  having(having: SelectAll['having']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('having', this._options.having, having)
  }

  orderBy(orderBy: SelectAll['orderBy']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('orderBy', this._options.orderBy, orderBy)
  }

  offset(offset: SelectAll['offset']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        offset: offset,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  limit(limit: SelectAll['limit']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        limit: limit,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  _parseArray(fieldName: string, option: any, value: any): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    let val = []
    if (!Array.isArray(value)) {
      val.push(value)
    } else {
      val = value
    }

    if (option && Array.isArray(option)) {
      val = [...option, ...val]
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        [fieldName]: val as Array<string>,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  getQueryAll(): Query<ArrayResult<GenericResultWrapper, GenericResult>, IsAsync> {
    return this._fetchAll(this._options as SelectAll)
  }

  getQueryOne(): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync> {
    return this._fetchOne(this._options as SelectAll)
  }

  execute(): MaybeAsync<IsAsync, ArrayResult<GenericResultWrapper, GenericResult>> {
    return this._fetchAll(this._options as SelectAll).execute()
  }

  all(): MaybeAsync<IsAsync, ArrayResult<GenericResultWrapper, GenericResult>> {
    return this._fetchAll(this._options as SelectAll).execute()
  }

  one(): MaybeAsync<IsAsync, OneResult<GenericResultWrapper, GenericResult>> {
    return this._fetchOne(this._options as SelectOne).execute()
  }

  count(): MaybeAsync<IsAsync, CountResult<GenericResultWrapper>> {
    return this._fetchOne(this._options as SelectOne).count()
  }
}
