import { QueryLoggerMeta, RawQuery } from './interfaces'
import { Query } from './tools'

export function defaultLogger(query: RawQuery, meta: QueryLoggerMeta): any {
  console.log(`[workers-qb][${meta.duration}ms] ${JSON.stringify(query)}`)
}

export async function asyncLoggerWrapper<Async extends boolean = true>(
  query: Query<any, Async> | Query<any, Async>[],
  loggerFunction: CallableFunction | undefined,
  innerFunction: () => any
) {
  const start = Date.now()
  try {
    return await innerFunction()
  } catch (e) {
    throw e
  } finally {
    if (loggerFunction) {
      if (Array.isArray(query)) {
        for (const q of query) {
          await loggerFunction(q.toObject(), { duration: Date.now() - start })
        }
      } else {
        await loggerFunction(query.toObject(), { duration: Date.now() - start })
      }
    }
  }
}

export function syncLoggerWrapper<Async extends boolean = false>(
  query: Query<any, Async> | Query<any, Async>[],
  loggerFunction: CallableFunction | undefined,
  innerFunction: () => any
) {
  const start = Date.now()
  try {
    return innerFunction()
  } catch (e) {
    throw e
  } finally {
    if (loggerFunction) {
      if (Array.isArray(query)) {
        for (const q of query) {
          loggerFunction(q.toObject(), { duration: Date.now() - start })
        }
      } else {
        loggerFunction(query.toObject(), { duration: Date.now() - start })
      }
    }
  }
}
