import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { PGResult, QueryBuilderOptions } from '../interfaces'
import { asyncMigrationsBuilder, MigrationOptions } from '../migrations'
import { TableSchema } from '../schema'
import { Query } from '../tools'

class PGMigrationsBuilder extends asyncMigrationsBuilder<PGResult> {
  async initialize(): Promise<void> {
    await this._builder
      .createTable({
        tableName: this._tableName,
        schema: `id         SERIAL PRIMARY KEY,
               name       TEXT UNIQUE,
               applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL`,
        ifNotExists: true,
      })
      .execute()
  }

  async apply(): Promise<Array<{ name: string; sql: string }>> {
    const appliedMigrations: Array<{ name: string; sql: string }> = []

    for (const migration of await this.getUnapplied()) {
      await this._builder.raw({ query: 'BEGIN' }).execute()

      try {
        await this._builder
          .raw({
            query: migration.sql,
          })
          .execute()

        await this._builder
          .raw({
            query: `INSERT INTO ${this._tableName} (name)
            values (?);`,
            args: [migration.name],
          })
          .execute()

        await this._builder.raw({ query: 'COMMIT' }).execute()
        appliedMigrations.push(migration)
      } catch (error) {
        await this._builder.raw({ query: 'ROLLBACK' }).execute()
        throw error
      }
    }

    return appliedMigrations
  }
}

export class PGQB<Schema extends TableSchema = {}> extends QueryBuilder<Schema, PGResult, true> {
  public db: any

  constructor(db: any, options?: QueryBuilderOptions) {
    super(options)
    this.db = db
  }

  migrations(options: MigrationOptions) {
    return new PGMigrationsBuilder(options, this)
  }

  async connect() {
    await this.db.connect()
  }

  async close() {
    await this.db.end()
  }

  async execute(query: Query) {
    return await this.loggerWrapper(query, this.options.logger, async () => {
      const queryString = query.toStatement('postgres')

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
