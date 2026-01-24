import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { D1QB, Raw } from '../../src'

describe('Simple operations', () => {
  it('all operations', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'testTable',
        schema: `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    `,
        ifNotExists: true,
      })
      .execute()

    const insertResult = await qb
      .insert({
        tableName: 'testTable',
        data: [
          {
            name: 'example',
          },
          {
            name: 'test2',
          },
        ],
        returning: '*',
      })
      .execute()
    expect(insertResult.results).toEqual([
      {
        id: 1,
        name: 'example',
      },
      {
        id: 2,
        name: 'test2',
      },
    ])
    expect(insertResult.rowsRead).toBeGreaterThanOrEqual(0)
    expect(insertResult.rowsWritten).toBeGreaterThanOrEqual(2)

    const selectResult = await qb.select('testTable').all()
    expect(selectResult.results).toEqual([
      {
        id: 1,
        name: 'example',
      },
      {
        id: 2,
        name: 'test2',
      },
    ])
    expect(selectResult.rowsRead).toBeGreaterThanOrEqual(2)
    expect(selectResult.rowsWritten).toBeGreaterThanOrEqual(0)

    const updateResult = await qb
      .update({
        tableName: 'testTable',
        where: {
          conditions: 'name = ?1',
          params: ['example'],
        },
        data: {
          name: 'newName',
        },
        returning: '*',
      })
      .execute()
    expect(updateResult.results).toEqual([
      {
        id: 1,
        name: 'newName',
      },
    ])
    // D1 reads the row before updating it
    expect(updateResult.rowsRead).toBeGreaterThanOrEqual(1)
    expect(updateResult.rowsWritten).toBeGreaterThanOrEqual(1)

    const deleteResult = await qb
      .delete({
        tableName: 'testTable',
        where: {
          conditions: 'name = ?1',
          params: ['test2'],
        },
        returning: '*',
      })
      .execute()
    expect(deleteResult.results).toEqual([
      {
        id: 2,
        name: 'test2',
      },
    ])
    expect(deleteResult.rowsRead).toBeGreaterThanOrEqual(0)
    expect(deleteResult.rowsWritten).toBeGreaterThanOrEqual(1)

    expect(
      (
        await qb
          .delete({
            tableName: 'testTable',
            where: {
              conditions: 'name = ?1',
              params: ['abc'],
            },
            returning: '*',
          })
          .execute()
      ).results
    ).toEqual([])

    expect((await qb.select('testTable').all()).results).toEqual([
      {
        id: 1,
        name: 'newName',
      },
    ])

    await qb
      .dropTable({
        tableName: 'testTable',
      })
      .execute()

    expect(
      (
        await env.DB.prepare(`SELECT name, sql
                                  FROM sqlite_master
                                  WHERE type = 'table'
                                    AND name not in ('_cf_KV', 'sqlite_sequence', '_cf_METADATA')`).all()
      ).results
    ).toEqual([])
  })
})

describe('Transactions', () => {
  it('transaction() executes queries in batch', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'txTest',
        schema: `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER DEFAULT 0
        `,
        ifNotExists: true,
      })
      .execute()

    // Execute multiple queries in a transaction
    const results = await qb.transaction(async (tx) => {
      return [
        tx.insert({ tableName: 'txTest', data: { name: 'item1', value: 100 }, returning: '*' }),
        tx.insert({ tableName: 'txTest', data: { name: 'item2', value: 200 }, returning: '*' }),
      ]
    })

    expect(results.length).toBe(2)
    expect(results[0].results.name).toBe('item1')
    expect(results[1].results.name).toBe('item2')

    // Verify both inserts succeeded
    const allRows = await qb.select('txTest').all()
    expect(allRows.results?.length).toBe(2)

    await qb.dropTable({ tableName: 'txTest' }).execute()
  })

  it('transaction() returns array of results', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'txTest2',
        schema: `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          counter INTEGER DEFAULT 0
        `,
        ifNotExists: true,
      })
      .execute()

    await qb.insert({ tableName: 'txTest2', data: { counter: 10 } }).execute()

    const results = await qb.transaction(async (tx) => {
      return [
        tx.update({
          tableName: 'txTest2',
          data: { counter: new Raw('counter + 5') },
          where: { conditions: 'id = ?', params: [1] },
          returning: '*',
        }),
        tx.insert({ tableName: 'txTest2', data: { counter: 20 }, returning: '*' }),
      ]
    })

    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(2)
    // Verify results array structure - results may be arrays
    expect(results[0].results).toBeDefined()
    expect(results[1].results).toBeDefined()

    await qb.dropTable({ tableName: 'txTest2' }).execute()
  })
})

describe('Query hooks', () => {
  it('beforeQuery hook is called before execution', async () => {
    const qb = new D1QB(env.DB)
    const calledQueries: string[] = []

    qb.beforeQuery(async (query, type) => {
      calledQueries.push(`${type}: ${query.query.substring(0, 20)}`)
      return query
    })

    await qb
      .createTable({
        tableName: 'hookTest',
        schema: 'id INTEGER PRIMARY KEY, name TEXT',
        ifNotExists: true,
      })
      .execute()

    await qb.insert({ tableName: 'hookTest', data: { id: 1, name: 'test' } }).execute()
    await qb.select('hookTest').all()

    expect(calledQueries.length).toBe(3)
    expect(calledQueries[0]).toContain('RAW')
    expect(calledQueries[1]).toContain('INSERT')
    expect(calledQueries[2]).toContain('SELECT')

    await qb.dropTable({ tableName: 'hookTest' }).execute()
  })

  it('afterQuery hook is called with result and duration', async () => {
    const qb = new D1QB(env.DB)
    const hookCalls: { duration: number; hasResult: boolean }[] = []

    qb.afterQuery(async (result, query, duration) => {
      hookCalls.push({ duration, hasResult: !!result })
      return result
    })

    await qb
      .createTable({
        tableName: 'hookTest2',
        schema: 'id INTEGER PRIMARY KEY, name TEXT',
        ifNotExists: true,
      })
      .execute()

    await qb.insert({ tableName: 'hookTest2', data: { id: 1, name: 'test' } }).execute()

    expect(hookCalls.length).toBe(2)
    expect(hookCalls[0]!.hasResult).toBe(true)
    expect(hookCalls[0]!.duration).toBeGreaterThanOrEqual(0)
    expect(hookCalls[1]!.hasResult).toBe(true)

    await qb.dropTable({ tableName: 'hookTest2' }).execute()
  })

  it('beforeQuery can modify query', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'hookTest3',
        schema: 'id INTEGER PRIMARY KEY, name TEXT, tenant_id INTEGER',
        ifNotExists: true,
      })
      .execute()

    await qb.insert({ tableName: 'hookTest3', data: { id: 1, name: 'test1', tenant_id: 1 } }).execute()
    await qb.insert({ tableName: 'hookTest3', data: { id: 2, name: 'test2', tenant_id: 2 } }).execute()

    // Create a new QB with tenant filtering hook
    const tenantQb = new D1QB(env.DB)
    tenantQb.beforeQuery(async (query, type) => {
      if (type === 'SELECT' && query.query.includes('hookTest3')) {
        // Add tenant filter
        if (query.query.includes('WHERE')) {
          query.query = query.query.replace('WHERE', 'WHERE tenant_id = 1 AND')
        } else {
          query.query = query.query.replace('FROM hookTest3', 'FROM hookTest3 WHERE tenant_id = 1')
        }
      }
      return query
    })

    const results = await tenantQb.select('hookTest3').all()
    expect(results.results?.length).toBe(1)
    expect((results.results as any)[0].name).toBe('test1')

    await qb.dropTable({ tableName: 'hookTest3' }).execute()
  })
})

describe('Pagination', () => {
  it('paginate() returns results with pagination metadata', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'paginateTest',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      })
      .execute()

    // Insert 25 rows
    for (let i = 1; i <= 25; i++) {
      await qb.insert({ tableName: 'paginateTest', data: { name: `item${i}` } }).execute()
    }

    const result = await qb.select('paginateTest').paginate({ page: 1, perPage: 10 })

    expect(result.results?.length).toBe(10)
    expect(result.pagination).toBeDefined()
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.perPage).toBe(10)
    expect(result.pagination.total).toBe(25)
    expect(result.pagination.totalPages).toBe(3)
    expect(result.pagination.hasNext).toBe(true)
    expect(result.pagination.hasPrev).toBe(false)

    await qb.dropTable({ tableName: 'paginateTest' }).execute()
  })

  it('calculates totalPages correctly', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'paginateTest2',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      })
      .execute()

    // Insert 23 rows - should be 3 pages with perPage 10
    for (let i = 1; i <= 23; i++) {
      await qb.insert({ tableName: 'paginateTest2', data: { name: `item${i}` } }).execute()
    }

    const result = await qb.select('paginateTest2').paginate({ page: 1, perPage: 10 })

    expect(result.pagination.total).toBe(23)
    expect(result.pagination.totalPages).toBe(3) // ceil(23/10) = 3

    await qb.dropTable({ tableName: 'paginateTest2' }).execute()
  })

  it('hasNext is false on last page', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'paginateTest3',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      })
      .execute()

    // Insert 15 rows
    for (let i = 1; i <= 15; i++) {
      await qb.insert({ tableName: 'paginateTest3', data: { name: `item${i}` } }).execute()
    }

    const result = await qb.select('paginateTest3').paginate({ page: 2, perPage: 10 })

    expect(result.results?.length).toBe(5) // Last 5 items
    expect(result.pagination.page).toBe(2)
    expect(result.pagination.totalPages).toBe(2)
    expect(result.pagination.hasNext).toBe(false)
    expect(result.pagination.hasPrev).toBe(true)

    await qb.dropTable({ tableName: 'paginateTest3' }).execute()
  })

  it('hasPrev is false on first page', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'paginateTest4',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      })
      .execute()

    // Insert 5 rows
    for (let i = 1; i <= 5; i++) {
      await qb.insert({ tableName: 'paginateTest4', data: { name: `item${i}` } }).execute()
    }

    const result = await qb.select('paginateTest4').paginate({ page: 1, perPage: 10 })

    expect(result.pagination.page).toBe(1)
    expect(result.pagination.hasPrev).toBe(false)
    expect(result.pagination.hasNext).toBe(false) // Only 1 page

    await qb.dropTable({ tableName: 'paginateTest4' }).execute()
  })
})
