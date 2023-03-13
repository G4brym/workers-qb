import { QueryBuilder } from '../src/Builder'
import { FetchTypes } from '../src/enums'
import { Raw } from '../src/tools'

export class QuerybuilderTest extends QueryBuilder {
  async execute(params: {
    query: string
    arguments?: (string | number | boolean | null | Raw)[]
    fetchType?: FetchTypes
  }): Promise<any> {
    return null
  }
}
