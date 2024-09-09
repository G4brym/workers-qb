import { QueryBuilder } from '../builder'
import { Query } from '../tools'
import { FetchTypes } from '../enums'
import { QueryBuilderOptions } from '../interfaces'

export class DOQB extends QueryBuilder<{}> {
  public db: any

  constructor(db: any, options?: QueryBuilderOptions) {
    super(options)
    this.db = db
  }

  /**
   * Usually DB calls are async by their own nature (because it communicates with another machine or another process)
   * In this case, SRS is running SQLite locally in the same thread, which means that query executes are synchronous
   * and blocking.
   */
  #execute(query: Query): any {
    if (query.arguments) {
      const stmt = this.db.prepare(query.query)
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
  }

  async execute(query: Query): Promise<any> {
    return await this.loggerWrapper(query, async () => {
      return this.#execute(query)
    })
  }

  executeSync(query: Query): any {
    //TODO(lduarte): make logger sync too
    return this.#execute(query)
  }
}
