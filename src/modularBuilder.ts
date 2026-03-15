import { FetchTypes, JoinTypes, SetOperationType } from './enums'
import { InvalidConfigurationError, ParameterMismatchError } from './errors'
import {
  ArrayResult,
  CountResult,
  DefaultReturnObject,
  MaybeAsync,
  OneResult,
  PaginatedResult,
  PaginationMeta,
  Primitive,
  SelectAll,
  SelectOne,
} from './interfaces'
import { TableSchema } from './schema'
import { Query, QueryWithExtra } from './tools'

export interface PaginateOptions {
  page: number
  perPage: number
}

export interface SelectExecuteOptions {
  lazy?: boolean
}

export class SelectBuilder<
  Schema extends TableSchema = {},
  GenericResultWrapper = unknown,
  GenericResult = DefaultReturnObject,
  IsAsync extends boolean = true,
> {
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

  tableName(tableName: SelectAll['tableName']): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        tableName: tableName,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  fields(fields: SelectAll['fields']): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('fields', this._options.fields, fields)
  }

  /**
   * Enable DISTINCT selection to remove duplicate rows from results.
   *
   * @param columns - Optional array of columns for DISTINCT ON (PostgreSQL only).
   *                  If not provided, applies simple DISTINCT.
   *
   * @example
   * // Simple DISTINCT
   * qb.select('users').distinct().execute()
   * // SELECT DISTINCT * FROM users
   *
   * @example
   * // DISTINCT ON specific columns (PostgreSQL)
   * qb.select('users').distinct(['department']).fields(['department', 'name']).execute()
   * // SELECT DISTINCT ON (department) department, name FROM users
   */
  distinct(columns?: Array<string>): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        distinct: columns ?? true,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  where(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
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
          const totalPlaceholders = currentInputConditions.join(' AND ').split('?').length - 1
          throw new ParameterMismatchError({
            clause: 'WHERE',
            query: currentInputConditions.join(' AND '),
            expectedParams: totalPlaceholders,
            receivedParams: currentInputParams.length,
          })
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
              ? currentParam.getOptions()
              : 'getOptions' in currentParam && typeof currentParam.getOptions === 'function'
                ? (currentParam.getOptions() as SelectAll)
                : (currentParam as SelectAll)
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
      const totalPlaceholders = currentInputConditions.join(' AND ').split('?').length - 1
      throw new ParameterMismatchError({
        clause: 'WHERE',
        query: currentInputConditions.join(' AND '),
        expectedParams: totalPlaceholders,
        receivedParams: currentInputParams.length,
      })
    }

    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
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

  /**
   * Add an OR WHERE condition to the query.
   * All previously added WHERE conditions are grouped together and ORed with the new condition.
   * Subsequent `.where()` calls after `.orWhere()` are ANDed as independent conditions.
   *
   * @param conditions - The SQL condition string(s) (can use ? placeholders)
   * @param params - The parameter(s) to bind to the ? placeholders
   *
   * @example
   * // Simple OR condition
   * qb.select('users').where('status = ?', 'active').orWhere('status = ?', 'pending').execute()
   * // SELECT * FROM users WHERE (status = ?) OR (status = ?)
   *
   * @example
   * // Multiple where conditions ORed together
   * qb.select('users')
   *   .where('tenant_id = ?', 1)
   *   .where('status = ?', 'active')
   *   .orWhere('role = ?', 'superadmin')
   *   .execute()
   * // SELECT * FROM users WHERE ((tenant_id = ?) AND (status = ?)) OR (role = ?)
   */
  orWhere(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    const existingConditions =
      this._options.where && typeof this._options.where === 'object' && 'conditions' in this._options.where
        ? (this._options.where.conditions as string[])
        : []
    const existingParams =
      this._options.where &&
      typeof this._options.where === 'object' &&
      'params' in this._options.where &&
      this._options.where.params
        ? ((Array.isArray(this._options.where.params)
            ? this._options.where.params
            : [this._options.where.params]) as Primitive[])
        : []

    // If no existing conditions, treat as a regular where
    if (existingConditions.length === 0) {
      return this.where(conditions, params)
    }

    // Process the new conditions using where() on a builder with cleared conditions
    // but with preserved subquery context (subQueryPlaceholders, subQueryTokenNextId)
    const clearedBuilder = new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        where: undefined,
      },
      this._fetchAll,
      this._fetchOne
    )
    const processedBuilder = clearedBuilder.where(conditions, params)
    const processedWhere = processedBuilder._options.where
    const newConditions =
      processedWhere && typeof processedWhere === 'object' && 'conditions' in processedWhere
        ? (processedWhere.conditions as string[])
        : []
    const newParams =
      processedWhere && typeof processedWhere === 'object' && 'params' in processedWhere && processedWhere.params
        ? ((Array.isArray(processedWhere.params) ? processedWhere.params : [processedWhere.params]) as Primitive[])
        : []

    // Build combined OR condition string
    const existingCombined =
      existingConditions.length === 1 ? existingConditions[0] : `(${existingConditions.join(') AND (')})`
    const newCombined = newConditions.length === 1 ? newConditions[0] : `(${newConditions.join(') AND (')})`
    const orCondition = `(${existingCombined}) OR (${newCombined})`

    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        // Spread processedBuilder._options to pick up any new subQueryPlaceholders/TokenNextId
        ...processedBuilder._options,
        where: {
          conditions: [orCondition],
          params: [...existingParams, ...newParams],
        },
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  whereIn<T extends string | Array<string>, P extends T extends Array<string> ? Primitive[][] : Primitive[]>(
    fields: T,
    values: P
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    let whereInCondition: string
    let whereInParams: Primitive[]

    const seperateWithComma = (prev: string, next: string) => prev + ', ' + next

    // if we have no values, we no-op
    if (values.length === 0) {
      return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
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

  /**
   * Conditionally apply query modifications based on a runtime value.
   * If condition is truthy, the callback is invoked with the current builder
   * and its return value is used. If condition is falsy and an otherwise callback
   * is provided, it is invoked instead. Otherwise, the builder is returned unchanged.
   *
   * @param condition - A value to check for truthiness
   * @param callback - Function that receives the builder and returns a modified builder
   * @param otherwise - Optional function applied when condition is falsy
   *
   * @example
   * qb.select('users')
   *   .when(nameFilter, q => q.where('name LIKE ?', [`%${nameFilter}%`]))
   *   .when(sortByDate, q => q.orderBy({ created_at: 'DESC' }))
   *   .execute()
   *
   * @example
   * // With otherwise callback
   * qb.select('products')
   *   .when(
   *     inStock,
   *     q => q.where('stock > ?', 0),
   *     q => q.where('stock = ?', 0)
   *   )
   *   .execute()
   */
  when<T>(
    condition: T | undefined | null | false | 0 | '',
    callback: (
      builder: SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>
    ) => SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>,
    otherwise?: (
      builder: SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>
    ) => SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    if (condition) {
      return callback(this)
    }
    if (otherwise) {
      return otherwise(this)
    }
    return this
  }

  /**
   * Add a WHERE column IS NULL condition.
   *
   * @param column - The column name to check for NULL
   *
   * @example
   * qb.select('users').whereNull('deleted_at').execute()
   * // SELECT * FROM users WHERE deleted_at IS NULL
   */
  whereNull(column: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.where(`${column} IS NULL`)
  }

  /**
   * Add a WHERE column IS NOT NULL condition.
   *
   * @param column - The column name to check for NOT NULL
   *
   * @example
   * qb.select('users').whereNotNull('email_verified_at').execute()
   * // SELECT * FROM users WHERE email_verified_at IS NOT NULL
   */
  whereNotNull(column: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.where(`${column} IS NOT NULL`)
  }

  /**
   * Add a WHERE column BETWEEN min AND max condition.
   *
   * @param column - The column name
   * @param range - Tuple of [min, max] values
   *
   * @example
   * qb.select('products').whereBetween('price', [10, 100]).execute()
   * // SELECT * FROM products WHERE price BETWEEN ? AND ?
   */
  whereBetween(
    column: string,
    range: [Primitive, Primitive]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.where(`${column} BETWEEN ? AND ?`, [range[0], range[1]])
  }

  /**
   * Add a WHERE column NOT BETWEEN min AND max condition.
   *
   * @param column - The column name
   * @param range - Tuple of [min, max] values
   *
   * @example
   * qb.select('products').whereNotBetween('price', [10, 100]).execute()
   * // SELECT * FROM products WHERE price NOT BETWEEN ? AND ?
   */
  whereNotBetween(
    column: string,
    range: [Primitive, Primitive]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.where(`${column} NOT BETWEEN ? AND ?`, [range[0], range[1]])
  }

  /**
   * Add an OR WHERE column IS NULL condition.
   *
   * @param column - The column name to check for NULL
   *
   * @example
   * qb.select('users').where('active = ?', true).orWhereNull('deleted_at').execute()
   * // SELECT * FROM users WHERE (active = ?) OR (deleted_at IS NULL)
   */
  orWhereNull(column: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.orWhere(`${column} IS NULL`)
  }

  /**
   * Add an OR WHERE column IS NOT NULL condition.
   *
   * @param column - The column name to check for NOT NULL
   *
   * @example
   * qb.select('users').whereNull('deleted_at').orWhereNotNull('verified_at').execute()
   * // SELECT * FROM users WHERE (deleted_at IS NULL) OR (verified_at IS NOT NULL)
   */
  orWhereNotNull(column: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.orWhere(`${column} IS NOT NULL`)
  }

  /**
   * Add an OR WHERE column BETWEEN min AND max condition.
   *
   * @param column - The column name
   * @param range - Tuple of [min, max] values
   *
   * @example
   * qb.select('products').where('active = ?', true).orWhereBetween('price', [10, 100]).execute()
   * // SELECT * FROM products WHERE (active = ?) OR (price BETWEEN ? AND ?)
   */
  orWhereBetween(
    column: string,
    range: [Primitive, Primitive]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.orWhere(`${column} BETWEEN ? AND ?`, [range[0], range[1]])
  }

  /**
   * Add an OR WHERE column NOT BETWEEN min AND max condition.
   *
   * @param column - The column name
   * @param range - Tuple of [min, max] values
   *
   * @example
   * qb.select('products').where('featured = ?', true).orWhereNotBetween('price', [10, 100]).execute()
   * // SELECT * FROM products WHERE (featured = ?) OR (price NOT BETWEEN ? AND ?)
   */
  orWhereNotBetween(
    column: string,
    range: [Primitive, Primitive]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.orWhere(`${column} NOT BETWEEN ? AND ?`, [range[0], range[1]])
  }

  /**
   * Add a WHERE column LIKE pattern condition.
   *
   * @param column - The column name
   * @param pattern - The LIKE pattern (e.g., '%search%')
   *
   * @example
   * qb.select('users').whereLike('name', '%john%').execute()
   * // SELECT * FROM users WHERE name LIKE ?
   */
  whereLike(column: string, pattern: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.where(`${column} LIKE ?`, [pattern])
  }

  /**
   * Add a WHERE column NOT LIKE pattern condition.
   *
   * @param column - The column name
   * @param pattern - The LIKE pattern
   *
   * @example
   * qb.select('users').whereNotLike('email', '%@spam.com').execute()
   * // SELECT * FROM users WHERE email NOT LIKE ?
   */
  whereNotLike(column: string, pattern: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.where(`${column} NOT LIKE ?`, [pattern])
  }

  /**
   * Add an OR WHERE column LIKE pattern condition.
   *
   * @param column - The column name
   * @param pattern - The LIKE pattern (e.g., '%search%')
   *
   * @example
   * qb.select('users').whereLike('name', '%john%').orWhereLike('email', '%john%').execute()
   * // SELECT * FROM users WHERE (name LIKE ?) OR (email LIKE ?)
   */
  orWhereLike(column: string, pattern: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.orWhere(`${column} LIKE ?`, [pattern])
  }

  /**
   * Add an OR WHERE column NOT LIKE pattern condition.
   *
   * @param column - The column name
   * @param pattern - The LIKE pattern
   *
   * @example
   * qb.select('users').where('active = ?', true).orWhereNotLike('email', '%@spam.com').execute()
   * // SELECT * FROM users WHERE (active = ?) OR (email NOT LIKE ?)
   */
  orWhereNotLike(column: string, pattern: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.orWhere(`${column} NOT LIKE ?`, [pattern])
  }

  /**
   * Add a WHERE column NOT IN (values) condition.
   *
   * @param fields - Column name(s) to check
   * @param values - Values to exclude
   *
   * @example
   * qb.select('users').whereNotIn('status', ['banned', 'suspended']).execute()
   * // SELECT * FROM users WHERE (status) NOT IN (VALUES (?), (?))
   */
  whereNotIn<T extends string | Array<string>, P extends T extends Array<string> ? Primitive[][] : Primitive[]>(
    fields: T,
    values: P
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    let whereNotInCondition: string
    let whereNotInParams: Primitive[]

    const separateWithComma = (prev: string, next: string) => prev + ', ' + next

    if (values.length === 0) {
      return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
        { ...this._options },
        this._fetchAll,
        this._fetchOne
      )
    }

    if (!Array.isArray(fields)) {
      whereNotInCondition = `(${fields}) NOT IN (VALUES `
      whereNotInCondition += values.map(() => '(?)').reduce(separateWithComma)
      whereNotInCondition += ')'
      whereNotInParams = values as Primitive[]
    } else {
      const fieldLength = fields.length
      whereNotInCondition = `(${fields.map((val) => val).reduce(separateWithComma)}) NOT IN (VALUES `
      const valuesString = `(${[...new Array(fieldLength).keys()].map(() => '?').reduce(separateWithComma)})`
      whereNotInCondition += [...new Array(values.length).keys()].map(() => valuesString).reduce(separateWithComma)
      whereNotInCondition += ')'
      whereNotInParams = values.flat()
    }

    return this.where(whereNotInCondition, whereNotInParams)
  }

  join(join: SelectAll['join']): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
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

  /**
   * Add an INNER JOIN to the query.
   */
  innerJoin(params: {
    table: string
    on: string
    alias?: string
  }): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.join({ ...params, type: JoinTypes.INNER })
  }

  /**
   * Add a LEFT JOIN to the query.
   */
  leftJoin(params: {
    table: string
    on: string
    alias?: string
  }): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.join({ ...params, type: JoinTypes.LEFT })
  }

  /**
   * Add a RIGHT JOIN to the query.
   */
  rightJoin(params: {
    table: string
    on: string
    alias?: string
  }): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.join({ ...params, type: JoinTypes.RIGHT })
  }

  /**
   * Add a FULL OUTER JOIN to the query.
   */
  fullJoin(params: {
    table: string
    on: string
    alias?: string
  }): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.join({ ...params, type: JoinTypes.FULL })
  }

  /**
   * Add a CROSS JOIN to the query.
   */
  crossJoin(params: {
    table: string
    alias?: string
  }): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.join({ ...params, type: JoinTypes.CROSS, on: '' })
  }

  /**
   * Add a NATURAL JOIN to the query.
   * Natural joins automatically match columns with the same name.
   */
  naturalJoin(table: string): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.join({ table, type: JoinTypes.NATURAL, on: '1=1' })
  }

  /**
   * Define a Common Table Expression (CTE) using the WITH clause.
   * CTEs allow you to define named temporary result sets that can be referenced
   * in the main query, making complex queries more readable.
   *
   * @param name - The name of the CTE
   * @param query - The query that defines the CTE
   * @param columns - Optional column names for the CTE
   *
   * @example
   * // Simple CTE
   * qb.select('orders')
   *   .with('active_users', qb.select('users').where('status = ?', 'active'))
   *   .join({ table: 'active_users', on: 'orders.user_id = active_users.id' })
   *   .execute()
   *
   * @example
   * // Multiple CTEs
   * qb.select('combined')
   *   .with('cte1', qb.select('table1').where('x = ?', 1))
   *   .with('cte2', qb.select('table2').where('y = ?', 2))
   *   .execute()
   */
  with(
    name: string,
    query: SelectBuilder<any, any, any, any> | SelectAll,
    columns?: string[]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    const queryOptions = query instanceof SelectBuilder ? query.getOptions() : query
    const existingCtes = this._options.cteDefinitions ?? []
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        cteDefinitions: [...existingCtes, { name, query: queryOptions, columns }],
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  /**
   * Combine results with another query using UNION (removes duplicates).
   *
   * @param query - The query to union with
   * @param all - If true, uses UNION ALL to keep duplicates
   *
   * @example
   * qb.select('active_users').fields(['id', 'name'])
   *   .union(qb.select('archived_users').fields(['id', 'name']))
   *   .execute()
   */
  union(
    query: SelectBuilder<any, any, any, any> | SelectAll,
    all = false
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    const queryOptions = query instanceof SelectBuilder ? query.getOptions() : query
    const existingOps = this._options.setOperations ?? []
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        setOperations: [
          ...existingOps,
          { type: all ? SetOperationType.UNION_ALL : SetOperationType.UNION, query: queryOptions },
        ],
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  /**
   * Combine results with another query using UNION ALL (keeps duplicates).
   *
   * @param query - The query to union with
   *
   * @example
   * qb.select('table1').fields(['id'])
   *   .unionAll(qb.select('table2').fields(['id']))
   *   .execute()
   */
  unionAll(
    query: SelectBuilder<any, any, any, any> | SelectAll
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this.union(query, true)
  }

  /**
   * Return only rows present in both queries using INTERSECT.
   *
   * @param query - The query to intersect with
   * @param all - If true, uses INTERSECT ALL
   *
   * @example
   * qb.select('users').fields(['id'])
   *   .intersect(qb.select('admins').fields(['user_id']))
   *   .execute()
   */
  intersect(
    query: SelectBuilder<any, any, any, any> | SelectAll,
    all = false
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    const queryOptions = query instanceof SelectBuilder ? query.getOptions() : query
    const existingOps = this._options.setOperations ?? []
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        setOperations: [
          ...existingOps,
          { type: all ? SetOperationType.INTERSECT_ALL : SetOperationType.INTERSECT, query: queryOptions },
        ],
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  /**
   * Return rows from the first query that are not in the second query using EXCEPT.
   *
   * @param query - The query to except
   * @param all - If true, uses EXCEPT ALL
   *
   * @example
   * qb.select('all_users').fields(['id'])
   *   .except(qb.select('blocked_users').fields(['user_id']))
   *   .execute()
   */
  except(
    query: SelectBuilder<any, any, any, any> | SelectAll,
    all = false
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    const queryOptions = query instanceof SelectBuilder ? query.getOptions() : query
    const existingOps = this._options.setOperations ?? []
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        setOperations: [
          ...existingOps,
          { type: all ? SetOperationType.EXCEPT_ALL : SetOperationType.EXCEPT, query: queryOptions },
        ],
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  groupBy(groupBy: SelectAll['groupBy']): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('groupBy', this._options.groupBy, groupBy)
  }

  having(
    conditions: string | Array<string>,
    params?: Primitive | Primitive[]
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
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
          const totalPlaceholders = currentInputConditions.join(' AND ').split('?').length - 1
          throw new ParameterMismatchError({
            clause: 'HAVING',
            query: currentInputConditions.join(' AND '),
            expectedParams: totalPlaceholders,
            receivedParams: currentInputParams.length,
          })
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
              ? currentParam.getOptions()
              : 'getOptions' in currentParam && typeof currentParam.getOptions === 'function'
                ? (currentParam.getOptions() as SelectAll)
                : (currentParam as SelectAll)
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
      const totalPlaceholders = currentInputConditions.join(' AND ').split('?').length - 1
      throw new ParameterMismatchError({
        clause: 'HAVING',
        query: currentInputConditions.join(' AND '),
        expectedParams: totalPlaceholders,
        receivedParams: currentInputParams.length,
      })
    }

    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
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

  orderBy(orderBy: SelectAll['orderBy']): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return this._parseArray('orderBy', this._options.orderBy, orderBy)
  }

  offset(offset: SelectAll['offset']): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
      {
        ...this._options,
        offset: offset,
      },
      this._fetchAll,
      this._fetchOne
    )
  }

  limit(limit: SelectAll['limit']): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
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
  ): SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync> {
    let val = []
    if (!Array.isArray(value)) {
      val.push(value)
    } else {
      val = value
    }

    if (option && Array.isArray(option)) {
      val = [...option, ...val]
    }

    return new SelectBuilder<Schema, GenericResultWrapper, GenericResult, IsAsync>(
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

  /**
   * Execute the query with pagination, returning results along with pagination metadata.
   *
   * @param options - Pagination options
   * @param options.page - The page number (1-indexed)
   * @param options.perPage - Number of results per page
   *
   * @example
   * const result = await qb.select('users')
   *   .where('active = ?', true)
   *   .paginate({ page: 2, perPage: 20 })
   *
   * // Returns:
   * // {
   * //   results: [...],
   * //   pagination: {
   * //     page: 2,
   * //     perPage: 20,
   * //     total: 150,
   * //     totalPages: 8,
   * //     hasNext: true,
   * //     hasPrev: true
   * //   }
   * // }
   */
  paginate(options: PaginateOptions): MaybeAsync<IsAsync, PaginatedResult<GenericResultWrapper, GenericResult>> {
    const { page, perPage } = options

    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidConfigurationError(
        `Invalid page value: ${page}. Page must be an integer >= 1.`,
        'Pass a positive integer for the page option, e.g. paginate({ page: 1, perPage: 20 })'
      )
    }

    if (!Number.isInteger(perPage) || perPage < 1) {
      throw new InvalidConfigurationError(
        `Invalid perPage value: ${perPage}. PerPage must be an integer >= 1.`,
        'Pass a positive integer for the perPage option, e.g. paginate({ page: 1, perPage: 20 })'
      )
    }

    const offset = (page - 1) * perPage

    // Get the count query
    const countQuery = this._fetchOne(this._options as SelectOne)

    // Get the data query with pagination
    const dataQuery = this._fetchAll({
      ...this._options,
      limit: perPage,
      offset: offset,
    } as SelectAll)

    // Execute count to get total
    const countResult = countQuery.count()

    // Helper to build pagination meta
    const buildPaginationMeta = (total: number): PaginationMeta => {
      const totalPages = Math.ceil(total / perPage)
      return {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    }

    // Handle async case (D1QB, PGQB)
    if (countResult instanceof Promise) {
      return (async () => {
        const countRes = await countResult
        const total = countRes.results?.total ?? 0
        const dataRes = await dataQuery.execute()
        return {
          ...dataRes,
          pagination: buildPaginationMeta(total),
        } as PaginatedResult<GenericResultWrapper, GenericResult>
      })() as MaybeAsync<IsAsync, PaginatedResult<GenericResultWrapper, GenericResult>>
    }

    // Handle sync case (DOQB)
    const total = (countResult as CountResult<GenericResultWrapper>).results?.total ?? 0
    const dataRes = dataQuery.execute() as any
    return {
      ...dataRes,
      pagination: buildPaginationMeta(total),
    } as MaybeAsync<IsAsync, PaginatedResult<GenericResultWrapper, GenericResult>>
  }

  getOptions(): SelectAll {
    return this._options as SelectAll
  }

  /**
   * Returns the SQL query string and parameters without executing.
   * Useful for debugging and logging.
   *
   * @example
   * const { sql, params } = qb.select('users').where('id = ?', 1).toSQL()
   * // sql: "SELECT * FROM users WHERE id = ?"
   * // params: [1]
   */
  toSQL(): { sql: string; params: Primitive[] } {
    return this._fetchAll(this._options as SelectAll).toSQL()
  }

  /**
   * Returns the SQL query with parameters interpolated for debugging purposes.
   * WARNING: This should NEVER be used to execute queries as it bypasses parameterization.
   *
   * @example
   * const debugSql = qb.select('users').where('id = ?', 1).toDebugSQL()
   * // "SELECT * FROM users WHERE id = 1"
   */
  toDebugSQL(): string {
    return this._fetchAll(this._options as SelectAll).toDebugSQL()
  }

  /**
   * Get the query plan for this query using EXPLAIN.
   * Returns the query plan as an array of rows showing how the database will execute the query.
   *
   * @example
   * const plan = await qb.select('users').where('id = ?', 1).explain()
   * // Returns query plan rows
   */
  explain(): MaybeAsync<
    IsAsync,
    ArrayResult<GenericResultWrapper, { id: number; parent: number; notused: number; detail: string }, IsAsync>
  > {
    const query = this._fetchAll(this._options as SelectAll)
    const { sql, params } = query.toSQL()
    const explainSql = `EXPLAIN QUERY PLAN ${sql}`
    const explainQuery = new Query<
      ArrayResult<GenericResultWrapper, { id: number; parent: number; notused: number; detail: string }, IsAsync>,
      IsAsync
    >(query.executeMethod as any, explainSql, params, FetchTypes.ALL)
    return explainQuery.execute()
  }
}
