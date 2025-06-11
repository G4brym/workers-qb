import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import {
  D1Result,
  QueryBuilderOptions,
  Executor,
  ExecuteOptions,
  InsertOptions,
  UpdateOptions,
  DeleteOptions,
  DefaultReturnObject,
  RawQuery, // Added RawQuery
} from '../interfaces'
import { MigrationOptions, asyncMigrationsBuilder } from '../migrations'
// import { Query } from '../tools'; // Query will be removed
import { InsertBuilder } from '../insertBuilder'
import { UpdateBuilder } from '../updateBuilder'
import { DeleteBuilder } from '../deleteBuilder'
import { SelectBuilder } from '../modularBuilder'; // Added for select method typing

// D1Result<T> is the ActualDatabaseResult type for D1.
// DefaultReturnObject is the default RowType for builders.
export class D1QB extends QueryBuilder<D1Result<any>, DefaultReturnObject, true> {
  public db: any;
  constructor(db: any, options?: QueryBuilderOptions<true>) { // Ensure IsAsync for options matches
    super(options);
    this.db = db;
  }

  migrations(options: MigrationOptions) {
    // The result of migration commands is usually just success/meta, not specific rows.
    return new asyncMigrationsBuilder<D1Result<unknown>>(options, this);
  }

  // Overriding select to ensure correct generic propagation for D1Result
  select<RowType = DefaultReturnObject>(
    tableName: string,
  ): SelectBuilder<D1Result<RowType[] | RowType | { total: number }[]>, RowType, true> {
    const initialSelectOptions: SelectOptions = {
        ...(this.options as ExecuteOptions),
        tableName: tableName,
     };
    return new SelectBuilder<D1Result<RowType[] | RowType | { total: number }[]>, RowType, true>(
      initialSelectOptions,
      this.execute.bind(this) as Executor<D1Result<RowType[] | RowType | { total: number }[]>, true>,
      this._select.bind(this)
    );
  }

  insertInto<RowType = DefaultReturnObject>(
    tableName: string,
  ): InsertBuilder<D1Result<RowType>, RowType, true> {
    const insertOptions: InsertOptions = { ...(this.options as ExecuteOptions), tableName };
    return new InsertBuilder<D1Result<RowType>, RowType, true>(
      insertOptions,
      this.execute.bind(this) as Executor<D1Result<RowType>, true>,
      this._insert.bind(this),
    );
  }

  updateTable<RowType = DefaultReturnObject>(
    tableName: string,
  ): UpdateBuilder<D1Result<RowType>, RowType, true> {
    const updateOptions: UpdateOptions = { ...(this.options as ExecuteOptions), tableName };
    return new UpdateBuilder<D1Result<RowType>, RowType, true>(
      updateOptions,
      this.execute.bind(this) as Executor<D1Result<RowType>, true>,
      this._update.bind(this),
    );
  }

  deleteFrom<RowType = DefaultReturnObject>(
    tableName: string,
  ): DeleteBuilder<D1Result<RowType>, RowType, true> {
    const deleteOptions: DeleteOptions = { ...(this.options as ExecuteOptions), tableName };
    return new DeleteBuilder<D1Result<RowType>, RowType, true>(
      deleteOptions,
      this.execute.bind(this) as Executor<D1Result<RowType>, true>,
      this._delete.bind(this),
    );
  }

  async execute<T = DefaultReturnObject | DefaultReturnObject[]>(queryParts: RawQuery): Promise<D1Result<T>> {
    return await this.loggerWrapper(queryParts, this.options.logger, async () => {
      let stmt = this.db.prepare(queryParts.query);

      if (queryParts.args) {
        stmt = stmt.bind(...queryParts.args);
      }

      let d1Response: any;
      if (queryParts.fetchType === FetchTypes.ONE || queryParts.fetchType === FetchTypes.ALL) {
        d1Response = await stmt.all();
      } else { // FetchTypes.NONE or undefined
        d1Response = await stmt.run();
      }

      const results = queryParts.fetchType === FetchTypes.ONE
        ? (d1Response.results && d1Response.results.length > 0 ? d1Response.results[0] : undefined)
        : d1Response.results;

      return {
        results: results as T,
        success: d1Response.success,
        meta: d1Response.meta,
        // deprecated fields for compatibility
        changes: d1Response.meta?.changes,
        duration: d1Response.meta?.duration,
        last_row_id: d1Response.meta?.last_row_id,
        served_by: d1Response.meta?.served_by,
      };
    });
  }

  async batchExecute<T = DefaultReturnObject | DefaultReturnObject[]>(queryPartsArray: RawQuery[]): Promise<D1Result<T>[]> {
    return await this.loggerWrapper(queryPartsArray, this.options.logger, async () => {
      const statements = queryPartsArray.map((qp) => {
        let stmt = this.db.prepare(qp.query);
        if (qp.args) {
          stmt = stmt.bind(...qp.args);
        }
        return stmt;
      });

      const responses: any[] = await this.db.batch(statements);

      return responses.map((d1Response, i) => {
        const currentQueryParts = queryPartsArray[i];
        const results = currentQueryParts?.fetchType === FetchTypes.ONE
          ? (d1Response.results && d1Response.results.length > 0 ? d1Response.results[0] : undefined)
          : d1Response.results;

        return {
          results: results as T,
          success: d1Response.success,
          meta: d1Response.meta,
          changes: d1Response.meta?.changes,
          duration: d1Response.meta?.duration,
          last_row_id: d1Response.meta?.last_row_id,
          served_by: d1Response.meta?.served_by,
        };
      });
    });
  }
}
              changes: resp.meta?.changes,
              duration: resp.meta?.duration,
              last_row_id: resp.meta?.last_row_id,
              served_by: resp.meta?.served_by,
              meta: resp.meta,
              success: resp.success,
            }
          }
        }
      )
    })
  }
}
