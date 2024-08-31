import { QueryBuilder } from '../src/builder'
import { Query } from '../src/tools'
import { D1Result } from '../src/interfaces'

export class QuerybuilderTest extends QueryBuilder<{}> {
  async execute(query: Query): Promise<Query<any>> {
    return this.loggerWrapper(query, async () => {
      return {
        // @ts-ignore
        results: {
          query: query.query,
          arguments: query.arguments,
          fetchType: query.fetchType,
        },
      }
    })
  }
}

export class QuerybuilderExceptionTest extends QueryBuilder<{}> {
  async execute(query: Query): Promise<Query<any>> {
    return this.loggerWrapper(query, async () => {
      await new Promise((r) => setTimeout(r, 50))
      throw new Error('Fake db error')
    })
  }
}
