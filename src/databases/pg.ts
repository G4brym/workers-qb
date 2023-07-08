import { QueryBuilder } from '../Builder'
import { FetchTypes } from '../enums'
import { Query } from '../tools'
import { PGResult, PGResultOne } from '../interfaces'

export class PGQB extends QueryBuilder<PGResult, PGResultOne> {
  private client: any

  constructor(client: any) {
    super()

    this.client = client
  }

  async connect() {
    await this.client.connect()
  }

  async close() {
    await this.client.end()
  }

  async execute(query: Query): Promise<PGResultOne | PGResult> {
    const queryString = query.query.replaceAll('?', '$')

    if (this._debugger) {
      console.log({
        'workers-qb': query,
      })
    }

    let result

    if (query.arguments) {
      result = await this.client.query({
        values: query.arguments,
        text: queryString,
      })
    } else {
      result = await this.client.query({
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
  }
}
