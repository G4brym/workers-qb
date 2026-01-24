import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { DOResult, QueryBuilderOptions } from '../interfaces'
import { syncLoggerWrapper } from '../logger'
import { MigrationOptions, syncMigrationsBuilder } from '../migrations'
import { TableSchema } from '../schema'
import { Query } from '../tools'

interface SqlStorage {
  exec: any
  get databaseSize(): number
  Cursor: any
  Statement: any
}

export class DOQB<Schema extends TableSchema = {}> extends QueryBuilder<Schema, DOResult, false> {
  public db: SqlStorage
  loggerWrapper = syncLoggerWrapper

  constructor(db: SqlStorage, options?: QueryBuilderOptions<false>) {
    super(options)
    this.db = db
  }

  migrations(options: MigrationOptions) {
    return new syncMigrationsBuilder<DOResult>(options, this)
  }

  execute(query: Query<any, false>) {
    const startTime = Date.now()

    // Run beforeQuery hook if registered
    let processedQuery = query.toObject()
    if (this.options.beforeQuery) {
      const hookResult = this.options.beforeQuery(processedQuery, this._getQueryType(query.query))
      if (hookResult) {
        processedQuery = hookResult
      }
    }

    const result = this.loggerWrapper(query, this.options.logger, () => {
      let cursor
      if (processedQuery.args) {
        cursor = this.db.exec(processedQuery.query, ...processedQuery.args)
      } else {
        cursor = this.db.exec(processedQuery.query)
      }

      const resultArray = cursor.toArray()
      const rowsRead = cursor.rowsRead
      const rowsWritten = cursor.rowsWritten

      if (query.fetchType == FetchTypes.ONE) {
        return {
          results: resultArray.length > 0 ? resultArray[0] : undefined,
          rowsRead,
          rowsWritten,
        }
      }

      return {
        results: resultArray,
        rowsRead,
        rowsWritten,
      }
    })

    // Run afterQuery hook if registered
    if (this.options.afterQuery) {
      const duration = Date.now() - startTime
      return this.options.afterQuery(result, processedQuery, duration)
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

  lazyExecute(query: Query<any, false>): Iterable<any> {
    return this.loggerWrapper(query, this.options.logger, () => {
      let cursor
      if (query.arguments) {
        cursor = this.db.exec(query.query, ...query.arguments)
      } else {
        cursor = this.db.exec(query.query)
      }
      return cursor
    })
  }

  /**
   * Execute multiple queries atomically as a transaction.
   * Uses SQLite's BEGIN/COMMIT/ROLLBACK for atomicity.
   * Note: This should be called within blockConcurrencyWhile for proper isolation in Durable Objects.
   *
   * @param callback - A function that receives the query builder and executes queries
   * @returns The return value of the callback
   *
   * @example
   * // Inside a Durable Object
   * this.ctx.blockConcurrencyWhile(() => {
   *   qb.transaction((tx) => {
   *     tx.insert({ tableName: 'orders', data: { user_id: 1, total: 100 } }).execute()
   *     tx.update({ tableName: 'users', data: { balance: 50 }, where: { conditions: 'id = ?', params: [1] } }).execute()
   *   })
   * })
   */
  transaction<T>(callback: (tx: DOQB<Schema>) => T): T {
    this.db.exec('BEGIN TRANSACTION')
    try {
      const result = callback(this)
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
}
