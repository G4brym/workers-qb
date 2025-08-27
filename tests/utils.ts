import { syncLoggerWrapper } from '../src'
import { QueryBuilder } from '../src/builder'
import { D1Result } from '../src/interfaces'
import { Query } from '../src/tools'

export class QuerybuilderTest extends QueryBuilder<{}> {
  wrappedFunctions(func: CallableFunction) {
    const wrapper = this.options?.wrapper
    if (!wrapper) {
      return func
    }

    if (Array.isArray(wrapper)) {
      return wrapper.reduce((acc, currentWrapper) => {
        return currentWrapper(acc);
      }, func);
    }
    return wrapper(func);
  }

  async execute(query: Query): Promise<Query<any>> {
    return this.loggerWrapper(query, this.options.logger, async () => {
      return this.wrappedFunctions(() => {
        return {
          results: {
            query: query.query,
            arguments: query.arguments,
            fetchType: query.fetchType,
          },
        }
      })
      
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

export class QuerybuilderTestSync extends QueryBuilder<{}, false> {
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

export class QuerybuilderExceptionTest extends QueryBuilder<{}> {
  async execute(query: Query): Promise<Query<any>> {
    return this.loggerWrapper(query, this.options.logger, async () => {
      await new Promise((r) => setTimeout(r, 50))
      throw new Error('Fake db error')
    })
  }
}
