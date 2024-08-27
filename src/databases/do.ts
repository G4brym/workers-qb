import { QueryBuilder } from '../builder'
import { SqlStorageCursor, type SqlStorage } from '@cloudflare/workers-types/experimental'
import { Query } from '../tools'
import { FetchTypes } from '../enums'

// There's no wrapper because DO databases return the Cursor to be consumed
export class DurableObjectDatabaseQB extends QueryBuilder<{}> {
  public db: SqlStorage

  constructor(db: SqlStorage) {
    super()
    this.db = db
  }

  async execute(query: Query) {
    if (this._debugger) {
      console.log({
        'workers-qb': {
          query: query.query,
          arguments: query.arguments,
          fetchType: query.fetchType,
        },
      })
    }

    if (query.arguments) {
      let stmt = this.db.prepare(query.query)
      // @ts-expect-error Their types appear to be wrong here
      const result = stmt(...query.arguments) as SqlStorageCursor
      //FIXME: not efficient but the iterator that SRS is weird and I can only get it with a object form this way
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
      //FIXME: not efficient but the iterator that SRS is weird and I can only get it with a object form this way
      return {
        results: Array.from(cursor)[0],
      }
    }

    // by default return everything
    return {
      results: Array.from(cursor),
    }
  }
}
