import { QueryBuilder } from '../builder';
import { FetchTypes } from '../enums';
import {
  QueryBuilderOptions,
  Executor,
  ExecuteOptions,
  SelectOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
  RawQuery,
  DefaultReturnObject,
  DefaultObject, // For results within DOResult
  DOResult, // New DOResult
} from '../interfaces';
import { syncLoggerWrapper } from '../logger';
import { MigrationOptions, syncMigrationsBuilder } from '../migrations';
import { SelectBuilder } from '../modularBuilder';
import { InsertBuilder } from '../insertBuilder';
import { UpdateBuilder } from '../updateBuilder';
import { DeleteBuilder } from '../deleteBuilder';

export class DOQB extends QueryBuilder<DOResult<any>, DefaultReturnObject, false> {
  public db: any; // This should be the Durable Object stub
  loggerWrapper = syncLoggerWrapper;

  constructor(db: any, options?: QueryBuilderOptions<false>) {
    super(options);
    this.db = db;
  }

  migrations(options: MigrationOptions) {
    return new syncMigrationsBuilder<DOResult<unknown>>(options, this);
  }

  // Overriding select to ensure correct generic propagation for DOResult
  select<RowType = DefaultReturnObject>(
    tableName: string,
  ): SelectBuilder<DOResult<RowType[] | RowType | { total: number }[]>, RowType, false> {
    const initialSelectOptions: SelectOptions = {
        ...(this.options as ExecuteOptions),
        tableName: tableName,
     };
    return new SelectBuilder<DOResult<RowType[] | RowType | { total: number }[]>, RowType, false>(
      initialSelectOptions,
      this.execute.bind(this) as Executor<DOResult<RowType[] | RowType | { total: number }[]>, false>,
      this._select.bind(this)
    );
  }

  insertInto<RowType = DefaultReturnObject>(
    tableName: string,
  ): InsertBuilder<DOResult<RowType>, RowType, false> {
    const insertOptions: InsertOptions = { ...(this.options as ExecuteOptions), tableName };
    return new InsertBuilder<DOResult<RowType>, RowType, false>(
      insertOptions,
      this.execute.bind(this) as Executor<DOResult<RowType>, false>,
      this._insert.bind(this),
    );
  }

  updateTable<RowType = DefaultReturnObject>(
    tableName: string,
  ): UpdateBuilder<DOResult<RowType>, RowType, false> {
    const updateOptions: UpdateOptions = { ...(this.options as ExecuteOptions), tableName };
    return new UpdateBuilder<DOResult<RowType>, RowType, false>(
      updateOptions,
      this.execute.bind(this) as Executor<DOResult<RowType>, false>,
      this._update.bind(this),
    );
  }

  deleteFrom<RowType = DefaultReturnObject>(
    tableName: string,
  ): DeleteBuilder<DOResult<RowType>, RowType, false> {
    const deleteOptions: DeleteOptions = { ...(this.options as ExecuteOptions), tableName };
    return new DeleteBuilder<DOResult<RowType>, RowType, false>(
      deleteOptions,
      this.execute.bind(this) as Executor<DOResult<RowType>, false>,
      this._delete.bind(this),
    );
  }

  execute<T = DefaultObject | DefaultObject[]>(queryParts: RawQuery): DOResult<T> {
    return this.loggerWrapper(queryParts, this.options.logger, () => {
      let cursor;
      if (queryParts.args && queryParts.args.length > 0) {
        cursor = this.db.exec(queryParts.query, ...queryParts.args);
      } else {
        cursor = this.db.exec(queryParts.query);
      }

      const resultsArray = cursor.toArray() as DefaultObject[];

      let finalResults: any; // Use any for flexibility before casting to T
      if (queryParts.fetchType === FetchTypes.ONE) {
        finalResults = resultsArray.length > 0 ? resultsArray[0] : undefined;
      } else if (queryParts.fetchType === FetchTypes.ALL) {
        finalResults = resultsArray;
      } else {
        finalResults = undefined;
      }

      return {
        results: finalResults as T,
        rawResponse: cursor,
      };
    });
  }

  lazyExecute(queryParts: RawQuery): Iterable<DefaultObject> {
    return this.loggerWrapper(queryParts, this.options.logger, () => {
      let cursor;
      if (queryParts.args && queryParts.args.length > 0) {
        cursor = this.db.exec(queryParts.query, ...queryParts.args);
      } else {
        cursor = this.db.exec(queryParts.query);
      }
      return cursor as Iterable<DefaultObject>;
    });
  }
}
