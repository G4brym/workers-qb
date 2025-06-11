import {
  DefaultReturnObject,
  MaybeAsync,
  SelectOptions,
  Where,
  Executor,
  ExecuteOptions,
  FetchTypes,
  RawQuery,
  // ExecuteResponse, // Removed
  OrderTypes,
  Join,
  SelectAll,
  SelectOne,
  // CountResult, // Potentially unused directly by new return types
  // OneResult,   // Potentially unused
  // ArrayResult, // Potentially unused
} from './interfaces';
import { Raw } from './tools';

export interface SelectExecuteOptions {
  lazy?: boolean;
}

// ActualDatabaseResult is e.g., D1Result<any>, PGResult<any>
// RowType is e.g., User, Post. This is the type SelectBuilder.select<User>() would set.
export class SelectBuilder<
  ActualDatabaseResult,
  RowType = DefaultReturnObject,
  IsAsync extends boolean = true,
> {
  protected _options: Partial<SelectOptions>;
  protected _sqlBuilder: (opts: SelectAll | SelectOne) => RawQuery;

  constructor(
    initialOptions: Partial<SelectOptions>,
    protected executor: Executor<ActualDatabaseResult, IsAsync>,
    sqlBuilder: (opts: SelectAll | SelectOne) => RawQuery,
  ) {
    this._options = { ...initialOptions };
    this._sqlBuilder = sqlBuilder;
  }

  tableName(tableName: string): this {
    this._options.tableName = tableName;
    return this;
  }

  fields(fields: string | string[]): this {
    this._options.fields = fields;
    return this;
  }

  where(conditions: string | string[] | Raw, params?: any): this {
    if (conditions instanceof Raw) {
      this._options.where = conditions.toString(); // Or handle Raw appropriately
    } else if (typeof conditions === 'string') {
      this._options.where = { conditions, params };
    } else if (Array.isArray(conditions)) {
       // If there's existing where, append, otherwise create new
      if (this._options.where && typeof this._options.where === 'object' && !Array.isArray(this._options.where) && 'conditions' in this._options.where) {
        const currentWhere = this._options.where as { conditions: string | string[], params?: any };
        let newConditions = Array.isArray(currentWhere.conditions) ? [...currentWhere.conditions] : [currentWhere.conditions];
        newConditions.push(...conditions);

        let newParams = [];
        if (currentWhere.params) {
            newParams = Array.isArray(currentWhere.params) ? [...currentWhere.params] : [currentWhere.params];
        }
        if (params) {
            newParams.push(...(Array.isArray(params) ? params : [params]));
        }
        this._options.where = { conditions: newConditions, params: newParams.length > 0 ? newParams : undefined };

      } else {
         this._options.where = { conditions, params };
      }
    }
    return this;
  }

  whereIn(field: string, values: any[]): this {
    if (values.length === 0) {
      // Handle empty array case, maybe by adding a condition like '1=0' or ignore
      return this.where('1=0'); // Or throw error, or make it a no-op based on desired behavior
    }
    const placeholders = values.map(() => '?').join(', ');
    const condition = `${field} IN (${placeholders})`;

    const existingConditions = this._options.where && typeof this._options.where === 'object' && 'conditions' in this._options.where ? (this._options.where as any).conditions : [];
    const existingParams = this._options.where && typeof this._options.where === 'object' && 'params' in this._options.where ? (this._options.where as any).params : [];

    const newConditions = Array.isArray(existingConditions) ? [...existingConditions, condition] : [existingConditions, condition];
    const newParams = Array.isArray(existingParams) ? [...existingParams, ...values] : [...values];


    this._options.where = {
        conditions: newConditions.filter(c => typeof c === 'string' && c.length > 0), // ensure only valid strings
        params: newParams
    };
    return this;
  }

  join(join: Join | Join[]): this {
    const newJoins = Array.isArray(join) ? join : [join];
    if (this._options.join) {
      this._options.join = Array.isArray(this._options.join)
        ? [...this._options.join, ...newJoins]
        : [this._options.join, ...newJoins];
    } else {
      this._options.join = newJoins;
    }
    return this;
  }

  orderBy(orderBy: string | string[] | Record<string, string | OrderTypes>): this {
    this._options.orderBy = orderBy;
    return this;
  }

  groupBy(groupBy: string | string[]): this {
    this._options.groupBy = groupBy;
    return this;
  }

  having(having: string | string[]): this {
    this._options.having = having;
    return this;
  }

  limit(limit: number): this {
    this._options.limit = limit;
    return this;
  }

  offset(offset: number): this {
    this._options.offset = offset;
    return this;
  }

  lazy(isLazy: boolean = true): this {
    this._options.lazy = isLazy;
    return this;
  }

  protected getQuery(fetchType: FetchTypes, extraOptions?: Partial<SelectOptions>): RawQuery {
    if (!this._options.tableName) {
      throw new Error('Table name must be specified before executing query.');
    }
    const finalOptions: SelectAll = { // SelectAll covers SelectOne needs too for building query
      tableName: this._options.tableName,
      ...this._options,
      ...extraOptions,
    };
    return { ...this._sqlBuilder(finalOptions), fetchType };
  }

  // The methods now return MaybeAsync<IsAsync, ActualDatabaseResult>.
  // The specific shape of data within ActualDatabaseResult (e.g., RowType[], RowType|undefined, {total: number})
  // is determined by the fetchType and the query itself.
  // The DB-specific execute method is responsible for populating ActualDatabaseResult correctly.
  // The RowType generic on SelectBuilder helps inform what's expected inside ActualDatabaseResult.
  // For example, if ActualDatabaseResult is D1Result<T>, all() implies T is RowType[], one() implies T is RowType | undefined.

  all(): MaybeAsync<IsAsync, ActualDatabaseResult> {
    // The cast `as any` might be necessary if TypeScript cannot guarantee that
    // the specific RawQuery (with FetchTypes.ALL) will produce an ActualDatabaseResult
    // that aligns with a potential D1Result<RowType[]> (if RowType is the generic).
    // This depends on how ActualDatabaseResult is defined and used by the Executor.
    // For now, assuming the executor handles the correct shaping.
    return this.executor(this.getQuery(FetchTypes.ALL));
  }

  one(): MaybeAsync<IsAsync, ActualDatabaseResult> {
    return this.executor(this.getQuery(FetchTypes.ONE, { limit: 1 }));
  }

  count(): MaybeAsync<IsAsync, ActualDatabaseResult> {
    const currentFields = this._options.fields;
    this._options.fields = 'COUNT(*) as total';

    // Important: do not include order by for count, it's not useful and can cause errors
    const currentOrderBy = this._options.orderBy;
    delete this._options.orderBy;

    const query = this.getQuery(FetchTypes.ONE);

    this._options.fields = currentFields; // Restore original fields
    this._options.orderBy = currentOrderBy; // Restore original order by

    // Type assertion needed
    return this.executor(query) as any;
  }
}
