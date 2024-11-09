import { QueryBuilder } from '../builder'
import { Query } from '../tools'
import { FetchTypes } from '../enums'
import { QueryBuilderOptions } from '../interfaces'
import { syncLoggerWrapper } from '../logger'
import { MigrationOptions, syncMigrationsBuilder } from '../migrations'

export class DOQB extends QueryBuilder<{}, false> {
  public db: any
  loggerWrapper = syncLoggerWrapper

  constructor(db: any, options?: QueryBuilderOptions<false>) {
    super(options)
    this.db = db
  }

  migrations(options: MigrationOptions) {
    return new syncMigrationsBuilder<{}>(options, this)
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

      if (query.fetchType == FetchTypes.ONE) {
        return {
          results: result.length > 0 ? result[0] : undefined,
        }
      }

      return {
        results: result,
      }
    })
  }
}
