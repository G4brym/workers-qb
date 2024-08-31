import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { Query } from '../tools'
import { PGResult, QueryBuilderOptions } from '../interfaces'

export class PGQB extends QueryBuilder<PGResult> {
  public db: any

  constructor(db: any, options?: QueryBuilderOptions) {
    super(options)
    this.db = db
  }

  async connect() {
    await this.db.connect()
  }

  async close() {
    await this.db.end()
  }

  async execute(query: Query) {
    return await this.loggerWrapper(query, async () => {
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
