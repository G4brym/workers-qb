import {
  ExecuteOptions,
  // ExecuteResponse, // Removed
  Executor,
  UpdateOptions as FullUpdateOptions,
  DefaultObject,
  DefaultReturnObject, // Added for RowType default
  Where,
  FetchTypes,
  RawQuery,
  Update,
  MaybeAsync, // Added
} from './interfaces';

export class UpdateBuilder<
  ActualDatabaseResult,
  RowType = DefaultReturnObject,
  IsAsync extends boolean = true,
> {
  protected options: Partial<FullUpdateOptions>;

  constructor(
    initialOptions: Partial<FullUpdateOptions>,
    protected executor: Executor<ActualDatabaseResult, IsAsync>,
    protected sqlBuilder: (opts: Update) => { queryString: string, queryArgs: any[], fetchType: FetchTypes },
  ) {
    this.options = { ...initialOptions };
  }

  set(data: DefaultObject): this {
    this.options.data = { ...(this.options.data || {}), ...data };
    return this;
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
        throw new Error("Invalid where condition");
    }
    return this;
  }

  returning(fields: string | string[]): this {
    this.options.returning = fields;
    return this;
  }

  execute(): MaybeAsync<IsAsync, ActualDatabaseResult> {
    if (!this.options.tableName) {
      throw new Error('Table name must be specified for an update operation.');
    }
    if (!this.options.data || Object.keys(this.options.data).length === 0) {
      throw new Error('Data must be provided for an update operation using .set().');
    }

    const updateParams: Update = {
      tableName: this.options.tableName,
      data: this.options.data as DefaultObject, // Assert DefaultObject, as checked above
      where: this.options.where,
      returning: this.options.returning,
      // Potentially onConflict for some dialects, though not standard SQL UPDATE
    };

    const { queryString, queryArgs, fetchType } = this.sqlBuilder(updateParams);

    const queryToExecute: RawQuery = {
      query: queryString,
      args: queryArgs,
      fetchType: fetchType,
    };

    return this.executor(queryToExecute);
  }
}
