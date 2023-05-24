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

    if (params.arguments) {
      stmt = stmt.bind(...params.arguments)
    }

    if (params.fetchType === FetchTypes.ONE) {
      return stmt.first()
    } else if (params.fetchType === FetchTypes.ALL) {
      return stmt.all()
    }

    return stmt.run()
  }
}
