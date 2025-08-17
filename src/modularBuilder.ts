import {
  ArrayResult,
  CountResult, DatabaseSchema,
  DefaultReturnObject,
  MaybeAsync,
  OneResult,
  Primitive,
  SelectAll,
  SelectOne, TableNameType,
} from './interfaces'
import { Query, QueryWithExtra } from './tools'

export interface SelectExecuteOptions {
  lazy?: boolean
}

export class SelectBuilder<
  GenericResultWrapper,
  GenericResult = DefaultReturnObject,
  IsAsync extends boolean = true,
  Schema extends DatabaseSchema = {},
  TableName extends TableNameType<Schema> = string,
> {
  _debugger = false
  _options: Partial<SelectAll<Schema>> = {}
  _fetchAll: (params: SelectAll<Schema>) => QueryWithExtra<GenericResultWrapper, any, IsAsync>
  _fetchOne: (params: SelectOne<Schema>) => QueryWithExtra<GenericResultWrapper, any, IsAsync>

  constructor(
    options: Partial<SelectAll<Schema>>,
    fetchAll: (params: SelectAll<Schema>) => QueryWithExtra<GenericResultWrapper, any, IsAsync>,
    fetchOne: (params: SelectOne<Schema>) => QueryWithExtra<GenericResultWrapper, any, IsAsync>
  ) {
    this._options = options
    this._fetchAll = fetchAll
    this._fetchOne = fetchOne
  }

  setDebugger(state: boolean): void {
    this._debugger = state
  }

  tableName(
    tableName: SelectAll<Schema>['tableName']
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
      {
        ...this._options,
        tableName: tableName,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  fields(
    fields: SelectAll<Schema>['fields']
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    return this._parseArray('fields', this._options.fields, fields)
  }

  where(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    // Ensure _options has the necessary fields for subquery handling
    const subQueryPlaceholders = this._options.subQueryPlaceholders ?? {}
    let subQueryTokenNextId = this._options.subQueryTokenNextId ?? 0

    const existingConditions =
      this._options.where && typeof this._options.where === 'object' && 'conditions' in this._options.where
        ? (this._options.where.conditions as string[])
        : []
    const existingParams =
      this._options.where &&
      typeof this._options.where === 'object' &&
      'params' in this._options.where &&
      this._options.where.params
        ? (this._options.where.params as Primitive[])
        : []

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
      let builtCondition = conditionParts[0] ?? ''

      for (let j = 0; j < conditionParts.length - 1; j++) {
        if (paramIndex >= currentInputParams.length) {
          throw new Error('Mismatch between "?" placeholders and parameters in where clause.')
        }
        const currentParam = currentInputParams[paramIndex++]

        const isSubQuery =
          (typeof currentParam === 'object' &&
            currentParam !== null &&
            ('tableName' in currentParam || 'getOptions' in currentParam) &&
            !currentParam.hasOwnProperty('_raw')) ||
          currentParam instanceof SelectBuilder

        if (isSubQuery) {
          const token = `__SUBQUERY_TOKEN_${subQueryTokenNextId++}__`
          subQueryPlaceholders[token] =
            currentParam instanceof SelectBuilder
              ? (currentParam.getOptions() as SelectAll<Schema>)
              : 'getOptions' in currentParam && typeof currentParam.getOptions === 'function'
                ? (currentParam.getOptions() as SelectAll<Schema>)
                : (currentParam as SelectAll<Schema>)
          builtCondition += token
        } else {
          builtCondition += '?'
          if (currentParam !== undefined) {
            collectedPrimitiveParams.push(currentParam)
          }
        }
        builtCondition += conditionParts[j + 1] ?? ''
      }
      processedNewConditions.push(builtCondition)
    }

    if (paramIndex < currentInputParams.length) {
      throw new Error('Too many parameters provided for the given "?" placeholders in where clause.')
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
      {
        ...this._options,
        subQueryPlaceholders,
        subQueryTokenNextId,
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
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    let whereInCondition: string
    let whereInParams: Primitive[]

    const seperateWithComma = (prev: string, next: string) => prev + ', ' + next

    // if we have no values, we no-op
    if (values.length === 0) {
      return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
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

      whereInCondition += [...new Array(values.length).keys()].map(() => valuesString).reduce(seperateWithComma)
      whereInCondition += ')'
      // finally, flatten the list since the whereInParams are in a single list
      whereInParams = values.flat()
    }

    return this.where(whereInCondition, whereInParams)
  }

  join(
    join: SelectAll<Schema>['join']
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    const joins = Array.isArray(join) ? join : [join]
    const processedJoins = joins.map((j) => {
      if (j && typeof j.table === 'object') {
        if (j.table instanceof SelectBuilder) {
          return { ...j, table: j.table.getOptions() }
        }
      }
      return j
    })
    return this._parseArray('join', this._options.join, processedJoins)
  }

  groupBy(
    groupBy: SelectAll<Schema>['groupBy']
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    return this._parseArray('groupBy', this._options.groupBy, groupBy)
  }

  having(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    const subQueryPlaceholders = this._options.subQueryPlaceholders ?? {}
    let subQueryTokenNextId = this._options.subQueryTokenNextId ?? 0

    const existingConditions =
      this._options.having && typeof this._options.having === 'object' && 'conditions' in this._options.having
        ? (this._options.having.conditions as string[])
        : []
    const existingParams =
      this._options.having &&
      typeof this._options.having === 'object' &&
      'params' in this._options.having &&
      this._options.having.params
        ? (this._options.having.params as Primitive[])
        : []

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
      let builtCondition = conditionParts[0] ?? ''

      for (let j = 0; j < conditionParts.length - 1; j++) {
        if (paramIndex >= currentInputParams.length) {
          throw new Error('Mismatch between "?" placeholders and parameters in having clause.')
        }
        const currentParam = currentInputParams[paramIndex++]
        const isSubQuery =
          (typeof currentParam === 'object' &&
            currentParam !== null &&
            ('tableName' in currentParam || 'getOptions' in currentParam) &&
            !currentParam.hasOwnProperty('_raw')) ||
          currentParam instanceof SelectBuilder

        if (isSubQuery) {
          const token = `__SUBQUERY_TOKEN_${subQueryTokenNextId++}__`
          subQueryPlaceholders[token] =
            currentParam instanceof SelectBuilder
              ? (currentParam.getOptions() as SelectAll<Schema>)
              : 'getOptions' in currentParam && typeof currentParam.getOptions === 'function'
                ? (currentParam.getOptions() as SelectAll<Schema>)
                : (currentParam as SelectAll<Schema>)
          builtCondition += token
        } else {
          builtCondition += '?'
          if (currentParam !== undefined) {
            collectedPrimitiveParams.push(currentParam)
          }
        }
        builtCondition += conditionParts[j + 1] ?? ''
      }
      processedNewConditions.push(builtCondition)
    }

    if (paramIndex < currentInputParams.length) {
      throw new Error('Too many parameters provided for the given "?" placeholders in having clause.')
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
      {
        ...this._options,
        subQueryPlaceholders,
        subQueryTokenNextId,
        having: {
          conditions: existingConditions.concat(processedNewConditions),
          params: existingParams.concat(collectedPrimitiveParams),
        },
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  orderBy(
    orderBy: SelectAll<Schema>['orderBy']
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    return this._parseArray('orderBy', this._options.orderBy, orderBy)
  }

  offset(
    offset: SelectAll<Schema>['offset']
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
      {
        ...this._options,
        offset: offset,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  limit(
    limit: SelectAll<Schema>['limit']
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
      {
        ...this._options,
        limit: limit,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  _parseArray(
    fieldName: string,
    option: any,
    value: any
  ): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName> {
    let val = []
    if (!Array.isArray(value)) {
      val.push(value)
    } else {
      val = value
    }

    if (option && Array.isArray(option)) {
      val = [...option, ...val]
    }

    return new SelectBuilder<GenericResultWrapper, GenericResult, IsAsync, Schema, TableName>(
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
    } as SelectAll<Schema>)
  }

  getQueryOne(): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync> {
    return this._fetchOne(this._options as SelectAll<Schema>)
  }

  execute<P extends SelectExecuteOptions = SelectExecuteOptions>(
    options?: P
  ): ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false> {
    return this._fetchAll({
      ...this._options,
      ...options,
    } as SelectAll<Schema>).execute()
  }

  all<P extends SelectExecuteOptions = SelectExecuteOptions>(
    options?: P
  ): ArrayResult<GenericResultWrapper, GenericResult, IsAsync, P extends { lazy: true } ? true : false> {
    return this._fetchAll({
      ...this._options,
      ...options,
    } as SelectAll<Schema>).execute()
  }

  one(): MaybeAsync<IsAsync, OneResult<GenericResultWrapper, GenericResult>> {
    return this._fetchOne(this._options as SelectOne<Schema>).execute()
  }

  count(): MaybeAsync<IsAsync, CountResult<GenericResultWrapper>> {
    return this._fetchOne(this._options as SelectOne<Schema>).count()
  }

  getOptions(): SelectAll<Schema> {
    return this._options as SelectAll<Schema>
  }
}
