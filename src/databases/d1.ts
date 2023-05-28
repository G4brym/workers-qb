import { QueryBuilder } from '../Builder'
import { FetchTypes } from '../enums'
import { Raw } from '../tools'
import { D1Result, D1ResultOne } from '../interfaces'

export class D1QB extends QueryBuilder<D1Result, D1ResultOne> {
  private db: any

  constructor(db: any) {
    super()
    this.db = db
  }

  async execute(params: {
    query: string
    arguments?: (string | number | boolean | null | Raw)[]
    fetchType?: FetchTypes
  }): Promise<any> {
    let stmt = this.db.prepare(params.query)

    if (this._debugger) {
      console.log({
        'workers-qb': params,
      })
    }

    if (params.arguments) {
      stmt = stmt.bind(...params.arguments)
    }

    if (params.fetchType === FetchTypes.ONE || params.fetchType === FetchTypes.ALL) {
      const resp = await stmt.all()

      return {
        changes: resp.meta?.changes,
        duration: resp.meta?.duration,
        last_row_id: resp.meta?.last_row_id,
        served_by: resp.meta?.served_by,
        success: resp.success,
        results: params.fetchType === FetchTypes.ONE && resp.results.length > 0 ? resp.results[0] : resp.results,
      }
    }

    return stmt.run()
  }
}
