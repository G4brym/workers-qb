import {
  ExecuteOptions,
  // ExecuteResponse, // Removed
  Executor,
  InsertOptions as FullInsertOptions,
  DefaultObject,
  DefaultReturnObject, // Added for RowType default
  ConflictTypes,
  ConflictUpsert,
  FetchTypes,
  RawQuery,
  Insert,
  MaybeAsync, // Added
} from './interfaces';

export class InsertBuilder<
  ActualDatabaseResult,
  RowType = DefaultReturnObject,
  IsAsync extends boolean = true,
> {
  protected options: Partial<FullInsertOptions>;

  constructor(
    initialOptions: Partial<FullInsertOptions>,
    protected executor: Executor<ActualDatabaseResult, IsAsync>,
    protected sqlBuilder: (opts: Insert) => { queryString: string, queryArgs: any[], fetchType: FetchTypes },
  ) {
    this.options = { ...initialOptions };
  }

  values(data: DefaultObject | DefaultObject[]): this {
    this.options.data = data;
    return this;
  }

  returning(fields: string | string[]): this {
    this.options.returning = fields;
    return this;
  }

  onConflict(conflictAction: string | ConflictTypes | ConflictUpsert): this {
    this.options.onConflict = conflictAction;
    return this;
  }

  execute(): MaybeAsync<IsAsync, ActualDatabaseResult> {
    if (!this.options.tableName) {
      throw new Error('Table name must be specified for an insert operation.');
    }
    if (!this.options.data) {
      throw new Error('Data must be provided for an insert operation using .values().');
    }

    // Construct the full Insert object for the sqlBuilder
    const insertParams: Insert = {
      tableName: this.options.tableName,
      data: this.options.data,
      returning: this.options.returning,
      onConflict: this.options.onConflict,
      // Any other options from ExecuteOptions like logger can be part of this.options
      // but _insert method in QueryBuilder might not use them directly for SQL generation.
    };

    const { queryString, queryArgs, fetchType } = this.sqlBuilder(insertParams);

    const queryToExecute: RawQuery = {
      query: queryString,
      args: queryArgs,
      fetchType: fetchType,
    };

    // The RowType generic helps inform what's expected inside ActualDatabaseResult.
    // e.g. if ActualDatabaseResult is D1Result<T>, then T is expected to be RowType or RowType[].
    return this.executor(queryToExecute);
  }
}
