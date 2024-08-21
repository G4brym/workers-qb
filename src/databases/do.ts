import { QueryBuilder } from '../builder'
import { SqlStorageCursor, type SqlStorage } from '@cloudflare/workers-types/experimental'
import { Query } from '../tools'

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
      return stmt(...query.arguments) as SqlStorageCursor
    }

    return this.db.exec(query.query)
  }
}
