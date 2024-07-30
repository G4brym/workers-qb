import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { Query } from '../tools'
import { D1Result } from '../interfaces'

export class D1QB extends QueryBuilder<D1Result> {
  public db: any

  constructor(db: any) {
    super()
    this.db = db
  }

  async execute(query: Query) {
    let stmt = this.db.prepare(query.query)

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
      stmt = stmt.bind(...query.arguments)
    }

    if (query.fetchType === FetchTypes.ONE || query.fetchType === FetchTypes.ALL) {
      const resp = await stmt.all()

      return {
        changes: resp.meta?.changes,
        duration: resp.meta?.duration,
        last_row_id: resp.meta?.last_row_id,
        served_by: resp.meta?.served_by,
        meta: resp.meta,
        success: resp.success,
        results: query.fetchType === FetchTypes.ONE ? resp.results[0] : resp.results,
      }
    }

    return stmt.run()
  }

  async batchExecute(queryArray: Query[]) {
    if (this._debugger) {
      console.log({
        'workers-qb': queryArray,
      })
    }

    const statements = queryArray.map((query) => {
      let stmt = this.db.prepare(query.query)
      if (query.arguments) {
        stmt = stmt.bind(...query.arguments)
      }
      return stmt
    })

    const responses = await this.db.batch(statements)

    return responses.map(
      (
        resp: {
          results?: any[]
          success: boolean
          meta: {
            duration: number
            changes: any
            last_row_id: any
            served_by: any
          }
        },
        i: number
      ) => {
        if (queryArray && queryArray[i] !== undefined && queryArray[i]?.fetchType) {
          return {
            changes: resp.meta?.changes,
            duration: resp.meta?.duration,
            last_row_id: resp.meta?.last_row_id,
            served_by: resp.meta?.served_by,
            meta: resp.meta,
            success: resp.success,
            results: queryArray[i]?.fetchType === FetchTypes.ONE ? resp.results?.[0] : resp.results,
          }
        } else {
          return {
            changes: resp.meta?.changes,
            duration: resp.meta?.duration,
            last_row_id: resp.meta?.last_row_id,
            served_by: resp.meta?.served_by,
            meta: resp.meta,
            success: resp.success,
          }
        }
      }
    )
  }
}
