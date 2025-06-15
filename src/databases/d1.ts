import { QueryBuilder } from '../builder'
import { FetchTypes } from '../enums'
import { D1Result, QueryBuilderOptions } from '../interfaces'
import { MigrationOptions, asyncMigrationsBuilder } from '../migrations'
import { Query } from '../tools'

export class D1QB extends QueryBuilder<D1Result> {
  public db: any
  constructor(db: any, options?: QueryBuilderOptions) {
    super(options)
    this.db = db
  }

  migrations(options: MigrationOptions) {
    return new asyncMigrationsBuilder<D1Result>(options, this)
  }

  async execute(query: Query) {
    return await this.loggerWrapper(query, this.options.logger, async () => {
      let stmt = this.db.prepare(query.query)

      if (query.arguments) {
        stmt = stmt.bind(...query.arguments)
      }

      if (query.fetchType === FetchTypes.ONE || query.fetchType === FetchTypes.ALL) {
        const resp = await stmt.all()

        return {
          changes: resp.meta?.changes,
          duration: resp.meta?.duration,
          last_row_id: resp.meta?.last_row_id,
          served_by: resp.meta?.served_by,
          meta: resp.meta,
          success: resp.success,
          results: query.fetchType === FetchTypes.ONE ? resp.results[0] : resp.results,
        }
      }

      return stmt.run()
    })
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
              meta: resp.meta,
              success: resp.success,
              results: queryArray[i]?.fetchType === FetchTypes.ONE ? resp.results?.[0] : resp.results,
            }
          } else {
            return {
              changes: resp.meta?.changes,
              duration: resp.meta?.duration,
              last_row_id: resp.meta?.last_row_id,
              served_by: resp.meta?.served_by,
              meta: resp.meta,
              success: resp.success,
            }
          }
        }
      )
    })
  }

  // JSON Functions
  json(jsonData: string) {
    const query = new Query('SELECT json(?)', [jsonData], FetchTypes.ONE)
    return this.execute(query)
  }

  json_array(...args: any[]) {
    const query = new Query(`SELECT json_array(${args.map(() => '?').join(', ')})`, args, FetchTypes.ONE)
    return this.execute(query)
  }

  json_array_length(jsonData: string, path?: string) {
    const query = new Query(path ? 'SELECT json_array_length(?, ?)' : 'SELECT json_array_length(?)', path ? [jsonData, path] : [jsonData], FetchTypes.ONE)
    return this.execute(query)
  }

  json_extract(jsonData: string, ...paths: string[]) {
    const query = new Query(`SELECT json_extract(?, ${paths.map(() => '?').join(', ')})`, [jsonData, ...paths], FetchTypes.ONE)
    return this.execute(query)
  }

  json_insert(jsonData: string, path: string, value: any, ...args: any[]) {
    const query = new Query(`SELECT json_insert(?, ?, ?, ${args.map(() => '?').join(', ')})`, [jsonData, path, value, ...args], FetchTypes.ONE)
    return this.execute(query)
  }

  json_object(...args: any[]) {
    const query = new Query(`SELECT json_object(${args.map(() => '?').join(', ')})`, args, FetchTypes.ONE)
    return this.execute(query)
  }

  json_patch(jsonData: string, patchData: string) {
    const query = new Query('SELECT json_patch(?, ?)', [jsonData, patchData], FetchTypes.ONE)
    return this.execute(query)
  }

  json_remove(jsonData: string, ...paths: string[]) {
    const query = new Query(`SELECT json_remove(?, ${paths.map(() => '?').join(', ')})`, [jsonData, ...paths], FetchTypes.ONE)
    return this.execute(query)
  }

  json_replace(jsonData: string, path: string, value: any, ...args: any[]) {
    const query = new Query(`SELECT json_replace(?, ?, ?, ${args.map(() => '?').join(', ')})`, [jsonData, path, value, ...args], FetchTypes.ONE)
    return this.execute(query)
  }

  json_set(jsonData: string, path: string, value: any, ...args: any[]) {
    const query = new Query(`SELECT json_set(?, ?, ?, ${args.map(() => '?').join(', ')})`, [jsonData, path, value, ...args], FetchTypes.ONE)
    return this.execute(query)
  }

  json_type(jsonData: string, path?: string) {
    const query = new Query(path ? 'SELECT json_type(?, ?)' : 'SELECT json_type(?)', path ? [jsonData, path] : [jsonData], FetchTypes.ONE)
    return this.execute(query)
  }

  json_valid(jsonData: string) {
    const query = new Query('SELECT json_valid(?)', [jsonData], FetchTypes.ONE)
    return this.execute(query)
  }

  json_quote(value: any) {
    const query = new Query('SELECT json_quote(?)', [value], FetchTypes.ONE)
    return this.execute(query)
  }

  json_group_array(value: any) {
    const query = new Query('SELECT json_group_array(?)', [value], FetchTypes.ONE)
    return this.execute(query)
  }

  // TODO: json_each and json_tree might require different handling due to their return types (multiple rows)
  // For now, they will return the first row, similar to other JSON functions.
  json_each(jsonData: string, path?: string) {
    const query = new Query(path ? 'SELECT * FROM json_each(?, ?)' : 'SELECT * FROM json_each(?)', path ? [jsonData, path] : [jsonData], FetchTypes.ONE)
    return this.execute(query)
  }

  json_tree(jsonData: string, path?: string) {
    const query = new Query(path ? 'SELECT * FROM json_tree(?, ?)' : 'SELECT * FROM json_tree(?)', path ? [jsonData, path] : [jsonData], FetchTypes.ONE)
    return this.execute(query)
  }
}
