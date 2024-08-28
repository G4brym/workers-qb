import { QueryBuilder } from '../src/builder'
import { Query } from '../src/tools'
import { D1Result } from '../src/interfaces'

export class QuerybuilderTest extends QueryBuilder<{}> {
  async execute(query: Query): Promise<Query<any>> {
    return {
      // @ts-ignore
      results: {
        query: query.query,
        arguments: query.arguments,
        fetchType: query.fetchType,
      },
    }
  }
}

export function trimQuery(query: string): string {
  return query.replace(/\s\s+/g, ' ')
}
