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

  where(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync> {
    // Ensure _options has the necessary fields for subquery handling
    this._options.subQueryPlaceholders = this._options.subQueryPlaceholders ?? {}
    this._options.subQueryTokenNextId = this._options.subQueryTokenNextId ?? 0

    const existingConditions = (this._options.where?.conditions ?? []) as string[]
    const existingParams = (this._options.where?.params ?? []) as Primitive[]

    const currentInputConditions = Array.isArray(conditions) ? conditions : [conditions]
    const currentInputParams = params === undefined ? [] : Array.isArray(params) ? params : [params]

    const processedNewConditions: string[] = []
    const collectedPrimitiveParams: Primitive[] = []
    let paramIndex = 0

    for (const conditionStr of currentInputConditions) {
      if (!conditionStr.includes('?')) {
        processedNewConditions.push(conditionStr)
        continue
      }

      const conditionParts = conditionStr.split('?')
      let builtCondition = conditionParts[0]

      for (let j = 0; j < conditionParts.length - 1; j++) {
        if (paramIndex >= currentInputParams.length) {
          throw new Error('Mismatch between "?" placeholders and parameters in where clause.')
        }
        const currentParam = currentInputParams[paramIndex++]

        // Check if currentParam is a SelectAll object (subquery)
        // It should be an object, not null, have a 'tableName' property, and not be a 'Raw' object.
        const isSubQuery =
          typeof currentParam === 'object' &&
          currentParam !== null &&
          'tableName' in currentParam &&
          !currentParam.hasOwnProperty('_raw')

        if (isSubQuery) {
          const token = `__SUBQUERY_TOKEN_${this._options.subQueryTokenNextId++}__`
          this._options.subQueryPlaceholders[token] = currentParam as SelectAll
          builtCondition += `(${token})`
        } else {
          builtCondition += '?'
          collectedPrimitiveParams.push(currentParam)
        }
        builtCondition += conditionParts[j + 1]
      }
      processedNewConditions.push(builtCondition)
    }

    if (paramIndex < currentInputParams.length) {
      throw new Error('Too many parameters provided for the given "?" placeholders in where clause.')
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options, // subQueryPlaceholders and subQueryTokenNextId are already updated on _options
        where: {
          conditions: existingConditions.concat(processedNewConditions),
          params: existingParams.concat(collectedPrimitiveParams),
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

    let conditions: string | Array<string> = [whereInCondition]
    let params: Primitive[] = whereInParams
    if ((this._options.where as any)?.conditions) {
      conditions = (this._options.where as any)?.conditions.concat(conditions)
    }

    if ((this._options.where as any)?.params) {
      params = (this._options.where as any)?.params.concat(params)
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
