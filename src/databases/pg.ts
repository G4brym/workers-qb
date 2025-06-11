import { QueryBuilder } from '../builder';
import { FetchTypes } from '../enums';
import {
  PGResult, // This is PGResult<T> from interfaces now
  QueryBuilderOptions,
  Executor,
  ExecuteOptions,
  SelectOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
  RawQuery,
  DefaultReturnObject,
  // ExecuteResponse, // Removed
} from '../interfaces';
import { MigrationOptions, asyncMigrationsBuilder } from '../migrations';
import { SelectBuilder } from '../modularBuilder';
import { InsertBuilder } from '../insertBuilder';
import { UpdateBuilder } from '../updateBuilder';
import { DeleteBuilder } from '../deleteBuilder';

export class PGQB extends QueryBuilder<PGResult<any>, DefaultReturnObject, true> {
  public db: any; // pg Client or Pool
  _migrationsBuilder = asyncMigrationsBuilder;

  constructor(db: any, options?: QueryBuilderOptions<true>) {
    super(options);
    this.db = db;
  }

  migrations(options: MigrationOptions) {
    return new asyncMigrationsBuilder<PGResult<unknown>>(options, this);
  }

  async connect() {
    if (typeof this.db.connect === 'function') {
      await this.db.connect();
    }
  }

  async close() {
    if (typeof this.db.end === 'function') {
      await this.db.end();
    }
  }

  select<RowType = DefaultReturnObject>(
    tableName: string,
  ): SelectBuilder<PGResult<RowType[] | RowType | { total: number }[]>, RowType, true> {
    const initialSelectOptions: SelectOptions = {
        ...(this.options as ExecuteOptions),
        tableName: tableName,
     };
    return new SelectBuilder<PGResult<RowType[] | RowType | { total: number }[]>, RowType, true>(
      initialSelectOptions,
      this.execute.bind(this) as Executor<PGResult<RowType[] | RowType | { total: number }[]>, true>,
      this._select.bind(this)
    );
  }

  insertInto<RowType = DefaultReturnObject>(
    tableName: string,
  ): InsertBuilder<PGResult<RowType>, RowType, true> {
    const insertOptions: InsertOptions = { ...(this.options as ExecuteOptions), tableName };
    return new InsertBuilder<PGResult<RowType>, RowType, true>(
      insertOptions,
      this.execute.bind(this) as Executor<PGResult<RowType>, true>,
      this._insert.bind(this),
    );
  }

  updateTable<RowType = DefaultReturnObject>(
    tableName: string,
  ): UpdateBuilder<PGResult<RowType>, RowType, true> {
    const updateOptions: UpdateOptions = { ...(this.options as ExecuteOptions), tableName };
    return new UpdateBuilder<PGResult<RowType>, RowType, true>(
      updateOptions,
      this.execute.bind(this) as Executor<PGResult<RowType>, true>,
      this._update.bind(this),
    );
  }

  deleteFrom<RowType = DefaultReturnObject>(
    tableName: string,
  ): DeleteBuilder<PGResult<RowType>, RowType, true> {
    const deleteOptions: DeleteOptions = { ...(this.options as ExecuteOptions), tableName };
    return new DeleteBuilder<PGResult<RowType>, RowType, true>(
      deleteOptions,
      this.execute.bind(this) as Executor<PGResult<RowType>, true>,
      this._delete.bind(this),
    );
  }

  async execute<T = DefaultReturnObject | DefaultReturnObject[]>(queryParts: RawQuery): Promise<PGResult<T>> {
    return await this.loggerWrapper(queryParts, this.options.logger, async () => {
      let i = 0;
      const queryString = queryParts.query.replace(/\?/g, () => `$${++i}`);

      const resultFromDriver = await this.db.query(queryString, queryParts.args);

      let finalRows: any;
      if (queryParts.fetchType === FetchTypes.ONE) {
        finalRows = resultFromDriver.rows && resultFromDriver.rows.length > 0 ? resultFromDriver.rows[0] : undefined;
      } else if (queryParts.fetchType === FetchTypes.ALL) {
        finalRows = resultFromDriver.rows;
      } else { // FetchTypes.NONE or undefined
        finalRows = []; // PG typically returns empty rows array for non-select if not an error
      }

      return {
        command: resultFromDriver.command,
        rowCount: resultFromDriver.rowCount,
        oid: resultFromDriver.oid,
        rows: finalRows as T,
      };
    });
  }
}
