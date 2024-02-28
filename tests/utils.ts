import { QueryBuilder } from '../src/Builder'
import { Query } from '../src/tools'
import { D1Result } from '../src/interfaces'

export class QuerybuilderTest extends QueryBuilder<D1Result> {
  async execute(query: Query) {
    return {
      duration: 0,
      success: true,
      served_by: 'test',
    }
  }
}

export function trimQuery(query: string): string {
  return query.replace(/\s\s+/g, ' ')
}
