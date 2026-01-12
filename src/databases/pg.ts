import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { PGResult, QueryBuilderOptions } from '../interfaces'
import { asyncMigrationsBuilder, MigrationOptions } from '../migrations'
import { TableSchema } from '../schema'
import { Query } from '../tools'

export class PGQB<Schema extends TableSchema = {}> extends QueryBuilder<Schema, PGResult, true> {
  public db: any
  _migrationsBuilder = asyncMigrationsBuilder

  constructor(db: any, options?: QueryBuilderOptions) {
    super(options)
    this.db = db
  }

  migrations(options: MigrationOptions) {
    return new asyncMigrationsBuilder<PGResult>(options, this)
  }

  async connect() {
    await this.db.connect()
  }

  async close() {
    await this.db.end()
  }

  async execute(query: Query) {
    return await this.loggerWrapper(query, this.options.logger, async () => {
      const queryString = query.query.replaceAll('?', '$')

      let result

      if (query.arguments) {
        result = await this.db.query({
          values: query.arguments,
          text: queryString,
        })
      } else {
        result = await this.db.query({
          text: queryString,
        })
      }

      if (query.fetchType === FetchTypes.ONE || query.fetchType === FetchTypes.ALL) {
        return {
          command: result.command,
          lastRowId: result.oid,
          rowCount: result.rowCount,
          results: query.fetchType === FetchTypes.ONE ? result.rows[0] : result.rows,
        }
      }

      return {
        command: result.command,
        lastRowId: result.oid,
        rowCount: result.rowCount,
      }
    })
  }
}
