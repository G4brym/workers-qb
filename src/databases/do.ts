import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { QueryBuilderOptions } from '../interfaces'
import { syncLoggerWrapper } from '../logger'
import { MigrationOptions, syncMigrationsBuilder } from '../migrations'
import { Query } from '../tools'

export class DOQB extends QueryBuilder<{}, false> {
  public db: any
  loggerWrapper = syncLoggerWrapper

  constructor(db: any, options?: QueryBuilderOptions<false>) {
    super(options)
    this.db = db
  }

  wrappedFunctions(func: CallableFunction) {
    const wrapper = this.options?.wrapper
    if (!wrapper) {
      return func
    }

    if (Array.isArray(wrapper)) {
      return wrapper.reduce((acc, currentWrapper) => {
        return currentWrapper(acc);
      }, func);
    }

    return wrapper(func);
  }

  migrations(options: MigrationOptions) {
    return new syncMigrationsBuilder<{}>(options, this)
  }

  execute(query: Query<any, false>) {
    return this.loggerWrapper(query, this.options.logger, () => {
      return this.wrappedFunctions(() => {
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
      });
    })
  }

  lazyExecute(query: Query<any, false>): Iterable<any> {
    return this.loggerWrapper(query, this.options.logger, () => {
      return this.wrappedFunctions(() => {
        let cursor
        if (query.arguments) {
          cursor = this.db.exec(query.query, ...query.arguments)
        } else {
          cursor = this.db.exec(query.query)
        }
        return cursor
      });
    })
  }
}
