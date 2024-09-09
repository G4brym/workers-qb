import { QueryBuilder } from '../builder'
import { Query } from '../tools'
import { FetchTypes } from '../enums'
import { QueryBuilderOptions } from '../interfaces'
import { syncLoggerWrapper } from '../logger'

export class DOQB extends QueryBuilder<{}, false> {
  public db: any
  loggerWrapper = syncLoggerWrapper

  constructor(db: any, options?: QueryBuilderOptions<false>) {
    super(options)
    this.db = db
  }

  execute(query: Query<any, false>) {
    return this.loggerWrapper(query, this.options.logger, () => {
      if (query.arguments) {
        let stmt = this.db.prepare(query.query)
        // @ts-expect-error Their types appear to be wrong here
        const result = stmt(...query.arguments) as SqlStorageCursor
        if (query.fetchType == FetchTypes.ONE) {
          return {
            results: Array.from(result)[0],
          }
        }

        // by default return everything
        return {
          results: Array.from(result),
        }
      }

      const cursor = this.db.exec(query.query)

      if (query.fetchType == FetchTypes.ONE) {
        return {
          results: Array.from(cursor)[0],
        }
      }

      // by default return everything
      return {
        results: Array.from(cursor),
      }
    })
  }
}
