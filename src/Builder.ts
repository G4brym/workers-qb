import { ConflictUpsert, Delete, Insert, Join, SelectAll, SelectOne, Update } from './interfaces'
import { ConflictTypes, FetchTypes, OrderTypes } from './enums'
import { Query, Raw } from './tools'

export class QueryBuilder<GenericResult, GenericResultOne> {
  _debugger = false

  setDebugger(state: boolean): void {
    this._debugger = state
  }

  async execute(query: Query): Promise<GenericResultOne | GenericResult> {
    throw new Error('Execute method not implemented')
  }

  async batchExecute(queryArray: Query[]): Promise<(GenericResultOne | GenericResult)[]> {
    throw new Error('Batch execute method not implemented')
  }

  createTable(params: { tableName: string; schema: string; ifNotExists?: boolean }): Query {
    return new Query(
      (q: Query) => {
        return this.execute(q)
      },
      `CREATE TABLE ${params.ifNotExists ? 'IF NOT EXISTS' : ''} ${params.tableName}
              (
                ${params.schema}
              )`
    )
  }

  dropTable(params: { tableName: string; ifExists?: boolean }): Query {
    return new Query((q: Query) => {
      return this.execute(q)
    }, `DROP TABLE ${params.ifExists ? 'IF EXISTS' : ''} ${params.tableName}`)
  }

  fetchOne(params: SelectOne): Query {
    return new Query(
      (q: Query) => {
        return this.execute(q)
      },
      this._select({ ...params, limit: 1 }),
      params.where ? params.where.params : undefined,
      FetchTypes.ONE
    )
  }

  fetchAll(params: SelectAll): Query {
    return new Query(
      (q: Query) => {
        return this.execute(q)
      },
      this._select(params),
      params.where ? params.where.params : undefined,
      FetchTypes.ALL
    )
  }

  insert(params: Insert): Query {
    let args: any[] = []

    if (typeof params.onConflict === 'object') {
      if (params.onConflict.where?.params) {
        // 1 - on conflict where parameters
        args = args.concat(params.onConflict.where.params)
      }

      if (params.onConflict.data) {
        // 2 - on conflict data parameters
        args = args.concat(this._parse_arguments(params.onConflict.data))
      }
    }

    // 3 - insert data parameters
    if (Array.isArray(params.data)) {
      for (const row of params.data) {
        args = args.concat(this._parse_arguments(row))
      }
    } else {
      args = args.concat(this._parse_arguments(params.data))
    }

    const fetchType = Array.isArray(params.data) ? FetchTypes.ALL : FetchTypes.ONE

    return new Query(
      (q: Query) => {
        return this.execute(q)
      },
      this._insert(params),
      args,
      fetchType
    )
  }

  update(params: Update): Query {
    let args = this._parse_arguments(params.data)

    if (params.where && params.where.params) {
      args = params.where.params.concat(args)
    }

    return new Query(
      (q: Query) => {
        return this.execute(q)
      },
      this._update(params),
      args,
      FetchTypes.ALL
    )
  }

  delete(params: Delete): Query {
    return new Query(
      (q: Query) => {
        return this.execute(q)
      },
      this._delete(params),
      params.where ? params.where.params : undefined,
      FetchTypes.ALL
    )
  }

  _parse_arguments(row: Record<string, string | boolean | number | null | Raw>): Array<any> {
    // Raw parameters are placed directly in the query, and keeping them here would result in more parameters that are
    // expected in the query and could result in weird results or outright errors when using PostgreSQL
    return Object.values(row).filter((value) => {
      return !(value instanceof Raw)
    })
  }

  _onConflict(resolution?: string | ConflictTypes | ConflictUpsert): string {
    if (resolution) {
      if (typeof resolution === 'object') {
        if (!Array.isArray(resolution.column)) {
          resolution.column = [resolution.column]
        }

        const _update_query = this.update({
          tableName: '_REPLACE_',
          data: resolution.data,
          where: resolution.where,
        }).query.replace(' _REPLACE_', '') // Replace here is to lint the query

        return ` ON CONFLICT (${resolution.column.join(', ')}) DO ${_update_query}`
      }

      return `OR ${resolution} `
    }
    return ''
  }

  _insert(params: Insert): string {
    const rows = []

    if (!Array.isArray(params.data)) {
      params.data = [params.data]
    }

    const columns = Object.keys(params.data[0]).join(', ')
    let index = 1

    let orConflict = '',
      onConflict = ''
    if (params.onConflict && typeof params.onConflict === 'object') {
      onConflict = this._onConflict(params.onConflict)

      if (params.onConflict.where?.params) {
        index += params.onConflict.where?.params.length
      }

      if (params.onConflict.data) {
        index += this._parse_arguments(params.onConflict.data).length
      }
    } else {
      orConflict = this._onConflict(params.onConflict)
    }

    for (const row of params.data) {
      const values: Array<string> = []
      Object.values(row).forEach((value) => {
        if (value instanceof Raw) {
          // Raw parameters should not increase the index, as they are not a real parameter
          values.push(value.content)
        } else {
          values.push(`?${index}`)
          index += 1
        }
      })

      rows.push(`(${values.join(', ')})`)
    }

    return (
      `INSERT ${orConflict}INTO ${params.tableName} (${columns})` +
      ` VALUES ${rows.join(', ')}` +
      onConflict +
      this._returning(params.returning)
    )
  }

  _update(params: Update): string {
    const whereParamsLength: number = params.where && params.where.params ? Object.keys(params.where.params).length : 0

    const set: Array<string> = []
    let index = 1
    for (const [key, value] of Object.entries(params.data)) {
      if (value instanceof Raw) {
        // Raw parameters should not increase the index, as they are not a real parameter
        set.push(`${key} = ${value.content}`)
      } else {
        set.push(`${key} = ?${whereParamsLength + index}`)
        index += 1
      }
    }

    return (
      `UPDATE ${this._onConflict(params.onConflict)}${params.tableName} SET ${set.join(', ')}` +
      this._where(params.where?.conditions) +
      this._returning(params.returning)
    )
  }

  _delete(params: Delete): string {
    return `DELETE FROM ${params.tableName}` + this._where(params.where?.conditions) + this._returning(params.returning)
  }

  _select(params: SelectAll): string {
    return (
      `SELECT ${this._fields(params.fields)} FROM ${params.tableName}` +
      this._join(params.join) +
      this._where(params.where?.conditions) +
      this._groupBy(params.groupBy) +
      this._having(params.having) +
      this._orderBy(params.orderBy) +
      this._limit(params.limit) +
      this._offset(params.offset)
    )
  }

  _fields(value: string | Array<string>): string {
    if (typeof value === 'string') return value

    return value.join(', ')
  }

  _where(value?: string | Array<string>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` WHERE ${value}`

    return ` WHERE ${value.join(' AND ')}`
  }

  _join(value?: Join | Array<Join>): string {
    if (!value) return ''

    if (!Array.isArray(value)) {
      value = [value]
    }

    const joinQuery: Array<string> = []
    value.forEach((item: Join) => {
      const type = item.type ? `${item.type} ` : ''
      joinQuery.push(
        `${type}JOIN ${typeof item.table === 'string' ? item.table : `(${this._select(item.table)})`}${
          item.alias ? ` AS ${item.alias}` : ''
        } ON ${item.on}`
      )
    })

    return ' ' + joinQuery.join(' ')
  }

  _groupBy(value?: string | Array<string>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` GROUP BY ${value}`

    return ` GROUP BY ${value.join(', ')}`
  }

  _having(value?: string): string {
    if (!value) return ''

    return ` HAVING ${value}`
  }

  _orderBy(value?: string | Array<string> | Record<string, string | OrderTypes>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` ORDER BY ${value}`

    if (Array.isArray(value)) {
      return ` ORDER BY ${value.join(', ')}`
    }

    const order: Array<string> = []
    Object.entries(value).forEach(([key, item]) => {
      order.push(`${key} ${item}`)
    })

    return ` ORDER BY ${order.join(', ')}`
  }

  _limit(value?: number): string {
    if (!value) return ''

    return ` LIMIT ${value}`
  }

  _offset(value?: number): string {
    if (!value) return ''

    return ` OFFSET ${value}`
  }

  _returning(value?: string | Array<string>): string {
    if (!value) return ''
    if (typeof value === 'string') return ` RETURNING ${value}`

    return ` RETURNING ${value.join(', ')}`
  }
}
