import {
  ExecuteOptions,
  // ExecuteResponse, // Removed
  Executor,
  DeleteOptions as FullDeleteOptions,
  DefaultReturnObject, // Added for RowType default
  Where,
  FetchTypes,
  RawQuery,
  Delete,
  MaybeAsync, // Added
} from './interfaces';

export class DeleteBuilder<
  ActualDatabaseResult,
  RowType = DefaultReturnObject,
  IsAsync extends boolean = true,
> {
  protected options: Partial<FullDeleteOptions>;

  constructor(
    initialOptions: Partial<FullDeleteOptions>,
    protected executor: Executor<ActualDatabaseResult, IsAsync>,
    protected sqlBuilder: (opts: Delete) => { queryString: string, queryArgs: any[], fetchType: FetchTypes },
  ) {
    this.options = { ...initialOptions };
  }

  where(conditions: string | string[] | Where, params?: any[]): this {
    if (typeof conditions === 'string' && params) {
      this.options.where = { conditions, params };
    } else if (typeof conditions === 'string' && !params) {
      this.options.where = conditions; // Raw string where
    } else if (Array.isArray(conditions)) {
       this.options.where = {conditions, params}; // String array with optional params
    }
     else if (typeof conditions === 'object' && !Array.isArray(conditions)) {
      // It's a Where object
      this.options.where = conditions;
    } else {
        // It's possible to have a delete without a where, which is dangerous but valid SQL.
        // Consider if a warning or error should be thrown if where is not called.
        // For now, allow it.
        this.options.where = undefined;
    }
    return this;
  }

  returning(fields: string | string[]): this {
    this.options.returning = fields;
    return this;
  }

  // Add orderBy and limit for dialects that support it on DELETE (e.g., PostgreSQL, MySQL)
  orderBy(orderBy: string | string[] | Record<string, string>): this {
    this.options.orderBy = orderBy as any; // Cast needed if FullDeleteOptions['orderBy'] is stricter
    return this;
  }

  limit(limit: number): this {
    this.options.limit = limit;
    return this;
  }


  execute(): MaybeAsync<IsAsync, ActualDatabaseResult> {
    if (!this.options.tableName) {
      throw new Error('Table name must be specified for a delete operation.');
    }
    // A delete operation without a WHERE clause is valid but can be dangerous.
    // Depending on policy, one might add a check here:
    // if (!this.options.where) {
    //   console.warn('Executing DELETE without a WHERE clause. This will affect all rows.');
    // }

    const deleteParams: Delete = {
      tableName: this.options.tableName,
      where: this.options.where, // This can be undefined
      returning: this.options.returning,
      orderBy: this.options.orderBy as any, // Cast if needed
      limit: this.options.limit,
    };

    const { queryString, queryArgs, fetchType } = this.sqlBuilder(deleteParams);

    const queryToExecute: RawQuery = {
      query: queryString,
      args: queryArgs,
      fetchType: fetchType,
    };

    return this.executor(queryToExecute);
  }
}
