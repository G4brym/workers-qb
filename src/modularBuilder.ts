import {
  ArrayResult,
  CountResult,
  DefaultReturnObject,
  MaybeAsync,
  OneResult,
  Primitive,
  SelectAll,
  SelectOne,
  WhereClause,
} from './interfaces'
import { JsonExpression, Query, QueryWithExtra, Raw } from './tools'

export interface SelectExecuteOptions {
  lazy?: boolean
}

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

  // Overload signatures for the where method
  where(
    condition: string,
    params?: Primitive | Primitive[]
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>
  where(
    conditions: Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>
  where(
    field: string | JsonExpression,
    operator: string,
    value: Primitive
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>
  where(
    arg1: string | Array<string> | JsonExpression,
    arg2?: Primitive | Primitive[] | string,
    arg3?: Primitive
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    const currentWhere: WhereClause = this._options.where || { conditions: [], params: [] }
    const newConditions = [...currentWhere.conditions]
    const newParams = [...currentWhere.params]

    if (arg3 !== undefined && typeof arg2 === 'string') {
      // Overload: where(field: string | JsonExpression, operator: string, value: Primitive)
      const fieldOrJsonExpr = arg1 as string | JsonExpression
      const operator = arg2
      const value = arg3

      if ((fieldOrJsonExpr as JsonExpression).isJsonExpression) {
        const jsonExpr = fieldOrJsonExpr as JsonExpression
        newConditions.push(`${jsonExpr.expression} ${operator} ?`)
        newParams.push(...jsonExpr.bindings, value)
      } else {
        // Assuming fieldOrJsonExpr is a string (field name)
        // We should also handle if it's a Raw instance for safety, though less common here
        let fieldStr = fieldOrJsonExpr as string
        if((fieldOrJsonExpr as Raw).isRaw) {
          fieldStr = (fieldOrJsonExpr as Raw).content;
        }
        newConditions.push(`${fieldStr} ${operator} ?`)
        newParams.push(value)
      }
    } else {
      // Overload: where(conditions: string | Array<string>, params?: Primitive | Primitive[])
      let conditionsArg = arg1 as string | Array<string>
      let paramsArg = (arg2 || []) as Primitive | Primitive[]

      if (!Array.isArray(conditionsArg)) {
        conditionsArg = [conditionsArg]
      }
      if (!Array.isArray(paramsArg)) {
        paramsArg = [paramsArg]
      }

      newConditions.push(...conditionsArg)
      newParams.push(...paramsArg)
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        where: {
          conditions: newConditions,
          params: newParams,
        },
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  whereIn<T extends string | Array<string>, P extends T extends Array<string> ? Primitive[][] : Primitive[]>(
    fields: T,
    values: P
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    let whereInCondition: string
    let whereInParams: Primitive[]

    const seperateWithComma = (prev: string, next: string) => prev + ', ' + next

    // if we have no values, we no-op
    if (values.length === 0) {
      return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
        {
          ...this._options,
        },
        this._fetchAll,
        this._fetchOne
      )
    }

    if (!Array.isArray(fields)) {
      // at this point, we know that it's a string
      whereInCondition = `(${fields}) IN (VALUES `

      whereInCondition += values.map(() => '(?)').reduce(seperateWithComma)
      whereInCondition += ')'
      // if it's not an array, we can assume that values is whereInParams[]
      whereInParams = values as Primitive[]
    } else {
      // NOTE(lduarte): we assume that this is const throughout the values list, if it's not, oh well garbage in, garbage out
      const fieldLength = fields.length

      whereInCondition = `(${fields.map((val) => val).reduce(seperateWithComma)}) IN (VALUES `

      const valuesString = `(${[...new Array(fieldLength).keys()].map(() => '?').reduce(seperateWithComma)})`

      whereInCondition += [...new Array(fieldLength).keys()].map(() => valuesString).reduce(seperateWithComma)
      whereInCondition += ')'
      // finally, flatten the list since the whereInParams are in a single list
      whereInParams = values.flat()
    }

    const currentWhere: WhereClause = this._options.where || { conditions: [], params: [] };
    const newConditions = [...currentWhere.conditions, whereInCondition];
    const newParams = [...currentWhere.params, ...whereInParams];

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        where: {
          conditions: newConditions,
          params: newParams,
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

  getQueryAll<P extends SelectExecuteOptions = SelectExecuteOptions>(
    options?: P
  ): Query<
    ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false>,
    IsAsync
  > {
    return this._fetchAll({
      ...this._options,
      ...options,
    } as SelectAll)
  }

  getQueryOne(): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync> {
    return this._fetchOne(this._options as SelectAll)
  }

  execute<P extends SelectExecuteOptions = SelectExecuteOptions>(
    options?: P
  ): ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false> {
    return this._fetchAll({
      ...this._options,
      ...options,
    } as SelectAll).execute()
  }

  all<P extends SelectExecuteOptions = SelectExecuteOptions>(
    options?: P
  ): ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false> {
    return this._fetchAll({
      ...this._options,
      ...options,
    } as SelectAll).execute()
  }

  one(): MaybeAsync<IsAsync, OneResult<GenericResultWrapper, GenericResult>> {
    return this._fetchOne(this._options as SelectOne).execute()
  }

  count(): MaybeAsync<IsAsync, CountResult<GenericResultWrapper>> {
    return this._fetchOne(this._options as SelectOne).count()
  }
}
