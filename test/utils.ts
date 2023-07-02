import { QueryBuilder } from '../src/Builder'
import { Query } from '../src/tools'
import { D1Result, D1ResultOne } from '../src/interfaces'

export class QuerybuilderTest extends QueryBuilder<D1Result, D1ResultOne> {
  async execute(query: Query): Promise<D1Result | D1ResultOne> {
    return {
      duration: 0,
      success: true,
      served_by: 'test',
    }
  }
}
