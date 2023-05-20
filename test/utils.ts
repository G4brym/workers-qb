import { QueryBuilder } from '../src/Builder'
import { FetchTypes } from '../src/enums'
import { Raw } from '../src/tools'
import { D1Result, D1ResultOne } from '../src/interfaces'

export class QuerybuilderTest extends QueryBuilder<D1Result, D1ResultOne> {
  async execute(params: {
    query: string
    arguments?: (string | number | boolean | null | Raw)[]
    fetchType?: FetchTypes
  }): Promise<any> {
    return null
  }
}
