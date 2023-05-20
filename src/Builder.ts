import { Delete, Insert, Join, SelectAll, SelectOne, Update } from './interfaces'
import { ConflictTypes, FetchTypes, OrderTypes } from './enums'
import { Raw } from './tools'

export class QueryBuilder<GenericResult, GenericResultOne> {
  async execute(params: {
    query: string
    arguments?: (string | number | boolean | null | Raw)[]
    fetchType?: FetchTypes
  }): Promise<any> {
    throw new Error('Execute method not implemented')
  }

  async createTable(params: { tableName: string; schema: string; ifNotExists?: boolean }): Promise<GenericResult> {
    return this.execute({
      query: `CREATE TABLE ${params.ifNotExists ? 'IF NOT EXISTS' : ''} ${params.tableName}
              (
                ${params.schema}
              )`,
    })
  }

  async dropTable(params: { tableName: string; ifExists?: boolean }): Promise<GenericResult> {
    return this.execute({
      query: `DROP TABLE ${params.ifExists ? 'IF EXISTS' : ''} ${params.tableName}`,
    })
  }

  async fetchOne(params: SelectOne): Promise<GenericResultOne> {
    const data = await this.execute({
      query: this._select({ ...params, limit: 1 }),
      arguments: params.where ? params.where.params : undefined,
      fetchType: FetchTypes.ALL,
    })

    return {
      ...data,
      results: data.results.length > 0 ? data.results[0] : null,
    }
  }

  async fetchAll(params: SelectAll): Promise<GenericResult> {
    return this.execute({
      query: this._select(params),
      arguments: params.where ? params.where.params : undefined,
      fetchType: FetchTypes.ALL,
    })
  }

  async insert(params: Insert): Promise<GenericResult> {
    let args: any[] = []

    if (Array.isArray(params.data)) {
      for (const row of params.data) {
        args = args.concat(this._parse_arguments(row))
      }
    } else {
      args = args.concat(this._parse_arguments(params.data))
    }

    return this.execute({
      query: this._insert(params),
      arguments: args,
      fetchType: FetchTypes.ALL,
    })
  }

  async update(params: Update): Promise<GenericResult> {
    let args = this._parse_arguments(params.data)

    if (params.where && params.where.params) {
      args = params.where.params.concat(args)
    }

    return this.execute({
      query: this._update(params),
      arguments: args,
      fetchType: FetchTypes.ALL,
    })
  }

  async delete(params: Delete): Promise<GenericResult> {
    return this.execute({
      query: this._delete(params),
      arguments: params.where ? params.where.params : undefined,
      fetchType: FetchTypes.ALL,
    })
  }

  _parse_arguments(row: Record<string, string | boolean | number | null | Raw>): Array<any> {
    return Object.values(row).map((value) => {
      if (value instanceof Raw) {
        return value.content
      }
      return value
    })
  }

  _onConflict(resolution?: string | ConflictTypes): string {
    if (resolution) {
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
    for (const row of params.data) {
      const values: Array<string> = []
      Object.values(row).forEach((value) => {
        if (value instanceof Raw) {
          values.push(value.content)
        } else {
          values.push(`?${index}`)
        }

        index += 1
      })

      rows.push(`(${values.join(', ')})`)
    }

    return (
      `INSERT ${this._onConflict(params.onConflict)}INTO ${params.tableName} (${columns})` +
      ` VALUES ${rows.join(', ')}` +
      this._returning(params.returning)
    )
  }

  _update(params: Update): string {
    const whereParamsLength: number = params.where && params.where.params ? Object.keys(params.where.params).length : 0

    const set: Array<string> = []
    Object.entries(params.data).forEach(([key, value], index) => {
      if (value instanceof Raw) {
        set.push(`${key} = ${value.content}`)
      } else {
        set.push(`${key} = ?${whereParamsLength + index + 1}`)
      }
    })

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
      joinQuery.push(`${type}JOIN ${item.table} ON ${item.on}`)
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
