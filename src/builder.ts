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
  SelectOptions,
  Executor,
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
import { Raw } from './tools'

// ActualDatabaseResultShape is e.g. D1Result<any> - the generic shell.
// DefaultRowType is the default type for rows if not specified by builder methods.
export class QueryBuilder<
  ActualDatabaseResultShape,
  DefaultRowType = DefaultReturnObject,
  IsAsync extends boolean = true
> {
  protected options: QueryBuilderOptions<IsAsync>;
  loggerWrapper = asyncLoggerWrapper;

  constructor(options?: QueryBuilderOptions<IsAsync>) {
    this.options = options || {};
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

  execute(query: RawQuery): MaybeAsync<IsAsync, ActualDatabaseResultShape> {
    throw new Error('Execute method not implemented by base QueryBuilder. Should be overridden in DB-specific QB.');
  }

  batchExecute(queryArray: RawQuery[]): MaybeAsync<IsAsync, ActualDatabaseResultShape[]> { // Return array of results
    throw new Error('Batch execute method not implemented by base QueryBuilder. Should be overridden in DB-specific QB.');
  }

  lazyExecute(query: RawQuery): IsAsync extends true ? Promise<AsyncIterable<DefaultRowType>> : Iterable<DefaultRowType> {
    throw new Error('Lazy execute method not implemented by base QueryBuilder. Should be overridden in DB-specific QB.');
  }

  createTable(params: {
    tableName: string
    schema: string
    ifNotExists?: boolean
  }): MaybeAsync<IsAsync, ActualDatabaseResultShape> {
    const rawQuery: RawQuery = {
      query: `CREATE TABLE ${params.ifNotExists ? 'IF NOT EXISTS' : ''} ${params.tableName} ( ${params.schema} )`,
      fetchType: FetchTypes.NONE,
    };
    return this.execute(rawQuery);
  }

  dropTable(params: {
    tableName: string
    ifExists?: boolean
  }): MaybeAsync<IsAsync, ActualDatabaseResultShape> {
    const rawQuery: RawQuery = {
      query: `DROP TABLE ${params.ifExists ? 'IF EXISTS' : ''} ${params.tableName}`,
      fetchType: FetchTypes.NONE,
    };
    return this.execute(rawQuery);
  }

  select<RowType = DefaultRowType>( // RowType defaults to DefaultRowType from QueryBuilder
    tableName: string
  ): SelectBuilder<ActualDatabaseResultShape, RowType, IsAsync> {
    const initialSelectOptions: Partial<SelectOptions> = {
      ...(this.options as ExecuteOptions),
      tableName: tableName,
    };
    // The ActualDatabaseResultShape for SelectBuilder is the generic one from this QB.
    // The RowType is passed to SelectBuilder to inform its internal expectations.
    return new SelectBuilder<ActualDatabaseResultShape, RowType, IsAsync>(
      initialSelectOptions,
      this.execute.bind(this) as Executor<ActualDatabaseResultShape, IsAsync>,
      this._select.bind(this)
    );
  }

  raw<ResultRowType = DefaultRowType>(
    params: RawQueryFetchOne
  ): MaybeAsync<IsAsync, ActualDatabaseResultShape> // ActualDatabaseResultShape should be like D1Result<ResultRowType>
  raw<ResultRowType = DefaultRowType>(
    params: RawQueryFetchAll
  ): MaybeAsync<IsAsync, ActualDatabaseResultShape> // ActualDatabaseResultShape should be like D1Result<ResultRowType[]>
  raw(params: RawQueryWithoutFetching): MaybeAsync<IsAsync, ActualDatabaseResultShape> // For commands not returning rows
  raw<ResultRowType = DefaultRowType>(params: RawQuery): MaybeAsync<IsAsync, ActualDatabaseResultShape> {
    // The specific <ResultRowType> should ideally influence the T in ActualDatabaseResultShape (e.g. D1Result<T>).
    // This requires the DB-specific execute method to be generic and use ResultRowType.
    // For now, returning ActualDatabaseResultShape; the caller needs to cast .results or .rows.
    return this.execute(params);
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
          resolution.column = [resolution.column];
        }
        // Simplified SQL generation for DO UPDATE SET.
        // This avoids calling a full this.update() which is removed.
        // It makes assumptions about placeholder generation if used in WHERE for conflict.
        const setClauses = Object.keys(resolution.data)
          .map(key => `${key} = ?`) // Assuming '?' placeholders, DB specific QBs might need to adjust
          .join(', ');

        let conflictWhereString = '';
        if (resolution.where) {
            // This part is tricky as _where also produces ' WHERE ...'
            // and might have its own params. For complex conflict targets with where,
            // this might need the DB-specific _where and arg handling.
            // For simplicity, assuming resolution.where is a simple string for now if used.
            const tempWhere = this._where(resolution.where);
            conflictWhereString = tempWhere.startsWith(' WHERE ') ? tempWhere.substring(7) : tempWhere;
            if (conflictWhereString) {
              conflictWhereString = ` WHERE ${conflictWhereString}`;
            }
        }
        // Note: Arguments for this part of the query are handled by _insert when it processes onConflict.data
        return ` ON CONFLICT (${resolution.column.join(', ')}) DO UPDATE SET ${setClauses}${conflictWhereString}`;
      }
      return ` OR ${resolution} `;
    }
    return '';
  }

  protected _insert(params: Insert): { queryString: string, queryArgs: any[], fetchType: FetchTypes } {
    let queryArgs: any[] = [];
    const rows = [];

    let data: Array<DefaultObject>;
    if (!Array.isArray(params.data)) {
      data = [params.data];
    } else {
      data = params.data;
    }

    if (!data || !data[0] || data.length === 0) {
      throw new Error('Insert data is undefined');
    }

    const columns = Object.keys(data[0]).join(', ');
    let placeholderIndex = 1; // Used for numbering placeholders '?'

    // Argument collection logic moved here
    if (typeof params.onConflict === 'object') {
      if (
        typeof params.onConflict?.where === 'object' &&
        !Array.isArray(params.onConflict?.where) &&
        params.onConflict?.where?.params
      ) {
        queryArgs = queryArgs.concat(params.onConflict.where.params);
        // Update placeholderIndex based on number of params added
        placeholderIndex += Array.isArray(params.onConflict.where.params) ? params.onConflict.where.params.length : 1;
      }

      if (params.onConflict.data) {
        queryArgs = queryArgs.concat(this._parse_arguments(params.onConflict.data));
        placeholderIndex += this._parse_arguments(params.onConflict.data).length;
      }
    }

    for (const row of data) {
      const values: Array<string> = [];
      const parsedArgsForRow = this._parse_arguments(row);
      queryArgs = queryArgs.concat(parsedArgsForRow);

      Object.values(row).forEach((value) => {
        if (value instanceof Raw) {
          values.push(value.content);
        } else {
          values.push(`?${placeholderIndex}`);
          placeholderIndex += 1;
        }
      });
      rows.push(`(${values.join(', ')})`);
    }

    let orConflictString = '';
    let onConflictString = '';
    if (params.onConflict && typeof params.onConflict === 'object') {
      onConflictString = this._onConflict(params.onConflict);
    } else if (params.onConflict) {
      orConflictString = this._onConflict(params.onConflict);
    }

    const queryString =
      `INSERT ${orConflictString} INTO ${params.tableName} (${columns})` +
      ` VALUES ${rows.join(', ')}` +
      onConflictString +
      this._returning(params.returning);

    // Determine FetchType
    // If returning specific fields, it implies results are expected.
    // If inserting multiple rows, expect multiple results.
    // Otherwise, if inserting a single row without specific returning, it might just be a success/failure (handled by GenericResultWrapper).
    let fetchType = FetchTypes.NONE; // Default to NONE if not returning or specific result structure
    if (params.returning && params.returning.length > 0) {
      fetchType = Array.isArray(params.data) ? FetchTypes.ALL : FetchTypes.ONE;
    } else if (Array.isArray(params.data) && params.data.length > 1) {
      // No explicit returning, but multiple rows inserted - D1 returns meta for batch so ALL is fine.
      fetchType = FetchTypes.ALL;
    } else if (!Array.isArray(params.data)){
        fetchType = FetchTypes.ONE; // Single record insert
    }


    return { queryString, queryArgs, fetchType };
  }

  protected _update(params: Update): { queryString: string, queryArgs: any[], fetchType: FetchTypes } {
    let queryArgs: any[] = [];

    // Determine where params first, as they come before SET params in the final args array
    let whereParams: any[] = [];
    if (typeof params.where === 'object' && !Array.isArray(params.where) && params.where?.params) {
      whereParams = Array.isArray(params.where.params) ? params.where.params : [params.where.params];
    } else if (typeof params.where === 'string' || Array.isArray(params.where)) {
      // If where is a string or string array, params might be passed separately to UpdateBuilder
      // For _update, we assume params are embedded or handled by the builder before calling this.
      // Or, if the QueryBuilder.update() was used, it would have handled args.
      // For now, this builder focuses on `params.where` being an object with `conditions` and `params`.
    }

    const dataArgs = this._parse_arguments(params.data);
    queryArgs = whereParams.concat(dataArgs);

    let whereString = this._where(params.where);
    let placeholderOffset = whereParams.length; // SET placeholders start after where placeholders

    // Adjust '?' in whereString if they are unnumbered, to use 1-based indexing for where part
    let wherePlaceholderIndex = 1;
    if (whereString && whereString.includes('?')) {
        // This simple replacement assumes '?' are only for params in the where object.
        // More complex scenarios (e.g. Raw in where) need careful handling.
        whereString = whereString.replace(/\?/g, () => `?${wherePlaceholderIndex++}`);
    }

    const set: Array<string> = [];
    Object.entries(params.data).forEach(([key, value]) => {
      if (value instanceof Raw) {
        set.push(`${key} = ${value.content}`);
      } else {
        set.push(`${key} = ?${++placeholderOffset}`);
      }
    });

    const queryString = (
      `UPDATE ${this._onConflict(params.onConflict)}${params.tableName}
       SET ${set.join(', ')}` +
      whereString +
      this._returning(params.returning)
    );

    const fetchType = (params.returning && params.returning.length > 0) ? FetchTypes.ALL : FetchTypes.NONE;

    return { queryString, queryArgs, fetchType };
  }

  protected _delete(params: Delete): { queryString: string, queryArgs: any[], fetchType: FetchTypes } {
    let queryArgs: any[] = [];
    if (typeof params.where === 'object' && !Array.isArray(params.where) && params.where?.params) {
      queryArgs = Array.isArray(params.where.params) ? params.where.params : [params.where.params];
    } else if (typeof params.where === 'string' || Array.isArray(params.where)) {
      // Similar to _update, assume params are handled if where is string/array
    }

    // Adjust '?' in whereString if they are unnumbered for _where generated string
    let whereString = this._where(params.where);
    let placeholderIndex = 1;
    if (whereString && whereString.includes('?')) {
        whereString = whereString.replace(/\?/g, () => `?${placeholderIndex++}`);
    }

    const queryString = (
      `DELETE
            FROM ${params.tableName}` +
      whereString + // Use potentially re-indexed whereString
      this._returning(params.returning) +
      this._orderBy(params.orderBy) + // orderBy, limit, offset usually for specific DBs like PG in DELETE
      this._limit(params.limit) +
      this._offset(params.offset)
    );

    const fetchType = (params.returning && params.returning.length > 0) ? FetchTypes.ALL : FetchTypes.NONE;

    return { queryString, queryArgs, fetchType };
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
