import { QueryBuilder } from '../Builder'
import { FetchTypes } from '../enums'
import { Raw } from '../tools'
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

  async execute(params: {
    query: String
    arguments?: (string | number | boolean | null | Raw)[]
    fetchType?: FetchTypes
  }): Promise<any> {
    const query = params.query.replaceAll('?', '$')

    let result

    if (params.arguments) {
      result = await this.client.query({
        values: params.arguments,
        text: query,
      })
    } else {
      result = await this.client.query({
        text: query,
      })
    }

    if (params.fetchType === FetchTypes.ONE || params.fetchType === FetchTypes.ALL) {
      return {
        command: result.command,
        lastRowId: result.oid,
        rowCount: result.rowCount,
        results: params.fetchType === FetchTypes.ONE && result.rows.length > 0 ? result.rows[0] : result.rows,
      }
    }

    return null
  }
}
