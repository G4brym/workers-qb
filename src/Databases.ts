import { QueryBuilder } from './Builder'
import { FetchTypes } from './enums'
import { Raw } from './tools'

export class D1QB extends QueryBuilder {
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
      const args = params.arguments.map((value) => {
        if (value instanceof Raw) {
          return value.content
        }
        return value
      })
      stmt = stmt.bind(...args)
    }

    if (params.fetchType === FetchTypes.ONE) {
      return stmt.first()
    } else if (params.fetchType === FetchTypes.ALL) {
      return stmt.all()
    }

    return stmt.run()
  }
}
