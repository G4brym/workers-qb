import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { DOResult, QueryBuilderOptions } from '../interfaces'
import { syncLoggerWrapper } from '../logger'
import { MigrationOptions, syncMigrationsBuilder } from '../migrations'
import { Query } from '../tools'

interface SqlStorage {
  exec: any
  prepare: any
  Cursor: any
  Statement: any
}

export class DOQB extends QueryBuilder<DOResult, false> {
  public db: SqlStorage
  loggerWrapper = syncLoggerWrapper

  constructor(db: SqlStorage, options?: QueryBuilderOptions<false>) {
    super(options)
    this.db = db
  }

  migrations(options: MigrationOptions) {
    return new syncMigrationsBuilder<DOResult>(options, this)
  }

  execute(query: Query<any, false>) {
    return this.loggerWrapper(query, this.options.logger, () => {
      let cursor
      if (query.arguments) {
        cursor = this.db.exec(query.query, ...query.arguments)
      } else {
        cursor = this.db.exec(query.query)
      }

      const result = cursor.toArray()
      const rowsRead = cursor.rowsRead
      const rowsWritten = cursor.rowsWritten

      if (query.fetchType == FetchTypes.ONE) {
        return {
          results: result.length > 0 ? result[0] : undefined,
          rowsRead,
          rowsWritten,
        }
      }

      return {
        results: result,
        rowsRead,
        rowsWritten,
      }
    })
  }

  lazyExecute(query: Query<any, false>): Iterable<any> {
    return this.loggerWrapper(query, this.options.logger, () => {
      let cursor
      if (query.arguments) {
        cursor = this.db.exec(query.query, ...query.arguments)
      } else {
        cursor = this.db.exec(query.query)
      }
      return cursor
    })
  }
}
