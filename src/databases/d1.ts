import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { D1Result, QueryBuilderOptions } from '../interfaces'
import { asyncMigrationsBuilder, MigrationOptions } from '../migrations'
import { TableSchema } from '../schema'
import { Query } from '../tools'

interface D1Database {
  prepare: any
  batch: any
  exec: any
}

export class D1QB<Schema extends TableSchema = {}> extends QueryBuilder<Schema, D1Result, true> {
  public db: any
  constructor(db: D1Database, options?: QueryBuilderOptions) {
    super(options)
    this.db = db
  }

  migrations(options: MigrationOptions) {
    return new asyncMigrationsBuilder<D1Result>(options, this)
  }

  async execute(query: Query) {
    const startTime = Date.now()

    // Run beforeQuery hook if registered
    let processedQuery = query.toObject()
    if (this.options.beforeQuery) {
      const hookResult = await this.options.beforeQuery(processedQuery, this._getQueryType(query.query))
      if (hookResult) {
        processedQuery = hookResult
      }
    }

    const result = await this.loggerWrapper(query, this.options.logger, async () => {
      let stmt = this.db.prepare(processedQuery.query)

      if (processedQuery.args) {
        stmt = stmt.bind(...processedQuery.args)
      }

      if (query.fetchType === FetchTypes.ONE || query.fetchType === FetchTypes.ALL) {
        const resp = await stmt.all()

        const meta = resp.meta as any
        return {
          changes: meta?.changes,
          duration: meta?.duration,
          last_row_id: meta?.last_row_id,
          served_by: meta?.served_by,
          rowsRead: meta?.rows_read,
          rowsWritten: meta?.rows_written,
          meta: resp.meta,
          success: resp.success,
          results: query.fetchType === FetchTypes.ONE ? resp.results[0] : resp.results,
        }
      }

      return stmt.run()
    })

    // Run afterQuery hook if registered
    if (this.options.afterQuery) {
      const duration = Date.now() - startTime
      return await this.options.afterQuery(result, processedQuery, duration)
    }

    return result
  }

  private _getQueryType(sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RAW' {
    const trimmed = sql.trim().toUpperCase()
    if (trimmed.startsWith('SELECT')) return 'SELECT'
    if (trimmed.startsWith('INSERT')) return 'INSERT'
    if (trimmed.startsWith('UPDATE')) return 'UPDATE'
    if (trimmed.startsWith('DELETE')) return 'DELETE'
    return 'RAW'
  }

  async batchExecute(queryArray: Query[]) {
    return await this.loggerWrapper(queryArray, this.options.logger, async () => {
      const statements = queryArray.map((query) => {
        let stmt = this.db.prepare(query.query)
        if (query.arguments) {
          stmt = stmt.bind(...query.arguments)
        }
        return stmt
      })

      const responses = await this.db.batch(statements)

      return responses.map(
        (
          resp: {
            results?: any[]
            success: boolean
            meta: {
              duration: number
              changes: any
              last_row_id: any
              served_by: any
              rows_read: any
              rows_written: any
            }
          },
          i: number
        ) => {
          if (queryArray && queryArray[i] !== undefined && queryArray[i]?.fetchType) {
            return {
              changes: resp.meta?.changes,
              duration: resp.meta?.duration,
              last_row_id: resp.meta?.last_row_id,
              served_by: resp.meta?.served_by,
              rowsRead: resp.meta?.rows_read,
              rowsWritten: resp.meta?.rows_written,
              meta: resp.meta,
              success: resp.success,
              results: queryArray[i]?.fetchType === FetchTypes.ONE ? resp.results?.[0] : resp.results,
            }
          }
          return {
            changes: resp.meta?.changes,
            duration: resp.meta?.duration,
            last_row_id: resp.meta?.last_row_id,
            served_by: resp.meta?.served_by,
            rowsRead: resp.meta?.rows_read,
            rowsWritten: resp.meta?.rows_written,
            meta: resp.meta,
            success: resp.success,
          }
        }
      )
    })
  }

  /**
   * Execute multiple queries atomically as a transaction.
   * D1 uses batching for transactions - all queries succeed or all fail together.
   *
   * @param callback - A function that receives a transaction builder and returns queries to execute
   * @returns Array of results from all queries in the transaction
   *
   * @example
   * const results = await qb.transaction(async (tx) => {
   *   return [
   *     tx.insert({ tableName: 'orders', data: { user_id: 1, total: 100 } }),
   *     tx.update({ tableName: 'users', data: { balance: 50 }, where: { conditions: 'id = ?', params: [1] } }),
   *   ]
   * })
   */
  async transaction<T extends Query<any, true>[]>(callback: (tx: D1QB<Schema>) => T | Promise<T>): Promise<any[]> {
    const queries = await callback(this)
    return this.batchExecute(queries)
  }
}
