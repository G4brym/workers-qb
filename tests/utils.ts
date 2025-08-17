import {DatabaseSchema, syncLoggerWrapper} from '../src'
import { QueryBuilder } from '../src/builder'
import { D1Result } from '../src/interfaces'
import { Query } from '../src/tools'

export class QuerybuilderTest<Schema extends DatabaseSchema> extends QueryBuilder<{}, true, Schema> {
  async execute(query: Query): Promise<Query<any>> {
    return this.loggerWrapper(query, this.options.logger, async () => {
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

  async lazyExecute(query: Query<any, true>): Promise<AsyncIterable<any>> {
    return this.loggerWrapper(query, this.options.logger, async function* () {
      yield {
        query: query.query,
        arguments: query.arguments,
        fetchType: query.fetchType,
      }
    })
  }
}

export class QuerybuilderTestSync<Schema extends DatabaseSchema> extends QueryBuilder<{}, false, Schema> {
  loggerWrapper = syncLoggerWrapper

  execute(query: Query<any, false>) {
    return this.loggerWrapper(query, this.options.logger, () => {
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

  lazyExecute(query: Query<any, false>) {
    return this.loggerWrapper(query, this.options.logger, function* () {
      yield {
        query: query.query,
        arguments: query.arguments,
        fetchType: query.fetchType,
      }
    })
  }
}

export class QuerybuilderExceptionTest<Schema extends DatabaseSchema> extends QueryBuilder<{}, true, Schema> {
  async execute(query: Query): Promise<Query<any>> {
    return this.loggerWrapper(query, this.options.logger, async () => {
      await new Promise((r) => setTimeout(r, 50))
      throw new Error('Fake db error')
    })
  }
}
