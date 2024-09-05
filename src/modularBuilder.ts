import { ArrayResult, CountResult, DefaultReturnObject, OneResult, Primitive, SelectAll, SelectOne } from './interfaces'
import { Query, QueryWithExtra } from './tools'

export class SelectBuilder<GenericResultWrapper, GenericResult = DefaultReturnObject> {
  _debugger = false
  private _options: Partial<SelectAll> = {}
  private _fetchAll: (params: SelectAll) => QueryWithExtra<GenericResultWrapper>
  private _fetchOne: (params: SelectOne) => QueryWithExtra<GenericResultWrapper>

  constructor(
    options: Partial<SelectAll>,
    fetchAll: (params: SelectAll) => QueryWithExtra<GenericResultWrapper>,
    fetchOne: (params: SelectOne) => QueryWithExtra<GenericResultWrapper>
  ) {
    this._options = options
    this._fetchAll = fetchAll
    this._fetchOne = fetchOne
  }

  setDebugger(state: boolean): void {
    this._debugger = state
  }

  tableName(tableName: SelectAll['tableName']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return new SelectBuilder<GenericResultWrapper, GenericResult>(
      {
        ...this._options,
        tableName: tableName,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  fields(fields: SelectAll['fields']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return this._parseArray('fields', this._options.fields, fields)
  }

  where(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<GenericResultWrapper, GenericResult> {
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

    return new SelectBuilder<GenericResultWrapper, GenericResult>(
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

  join(join: SelectAll['join']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return this._parseArray('join', this._options.join, join)
  }

  groupBy(groupBy: SelectAll['groupBy']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return this._parseArray('groupBy', this._options.groupBy, groupBy)
  }

  having(having: SelectAll['having']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return this._parseArray('having', this._options.having, having)
  }

  orderBy(orderBy: SelectAll['orderBy']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return this._parseArray('orderBy', this._options.orderBy, orderBy)
  }

  offset(offset: SelectAll['offset']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return new SelectBuilder<GenericResultWrapper, GenericResult>(
      {
        ...this._options,
        offset: offset,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  limit(limit: SelectAll['limit']): SelectBuilder<GenericResultWrapper, GenericResult> {
    return new SelectBuilder<GenericResultWrapper, GenericResult>(
      {
        ...this._options,
        limit: limit,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  private _parseArray(fieldName: string, option: any, value: any): SelectBuilder<GenericResultWrapper, GenericResult> {
    let val = []
    if (!Array.isArray(value)) {
      val.push(value)
    } else {
      val = value
    }

    if (option && Array.isArray(option)) {
      val = [...option, ...val]
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult>(
      {
        ...this._options,
        [fieldName]: val as Array<string>,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  getQueryAll(): Query<ArrayResult<GenericResultWrapper, GenericResult>> {
    return this._fetchAll(this._options as SelectAll)
  }

  getQueryOne(): Query<OneResult<GenericResultWrapper, GenericResult>> {
    return this._fetchOne(this._options as SelectAll)
  }

  async execute(): Promise<ArrayResult<GenericResultWrapper, GenericResult>> {
    return this._fetchAll(this._options as SelectAll).execute()
  }

  async all(): Promise<ArrayResult<GenericResultWrapper, GenericResult>> {
    return this._fetchAll(this._options as SelectAll).execute()
  }

  async one(): Promise<OneResult<GenericResultWrapper, GenericResult>> {
    return this._fetchOne(this._options as SelectOne).execute()
  }

  async count(): Promise<CountResult<GenericResultWrapper>> {
    return this._fetchOne(this._options as SelectOne).count()
  }
}
