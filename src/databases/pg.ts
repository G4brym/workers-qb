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
      // Convert ? placeholders to PostgreSQL $N style in a single pass.
      // Numbered ?1, ?2 keep their index ($1, $2, ...).
      // Bare ? are assigned the next available index after the highest numbered ?N seen.
      // This guarantees globally unique $N indices even if both styles appear in the same query.
      const maxNumbered = Math.max(0, ...[...query.query.matchAll(/\?(\d+)/g)].map((m) => parseInt(m[1], 10)))
      let paramIndex = maxNumbered
      const queryString = query.query.replace(/\?(\d+)?/g, (_, n) => (n !== undefined ? `$${n}` : `$${++paramIndex}`))

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
