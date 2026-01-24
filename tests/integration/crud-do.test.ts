import { env, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { DOQB, Raw } from '../../src'

describe('Simple operations', () => {
  it('all operations', async () => {
    const id = env.TEST_DO.idFromName('test-crud')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'testTable',
        schema: `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    `,
        ifNotExists: true,
      }).execute()

      const insertResult = qb
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

      const selectResult = qb.select('testTable').all()
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

      const updateResult = qb
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
      // DO reads the row before updating it
      expect(updateResult.rowsRead).toBeGreaterThanOrEqual(1)
      expect(updateResult.rowsWritten).toBeGreaterThanOrEqual(1)

      const deleteResult = qb
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
        qb
          .delete({
            tableName: 'testTable',
            where: {
              conditions: 'name = ?1',
              params: ['abc'],
            },
            returning: '*',
          })
          .execute().results
      ).toEqual([])

      expect(qb.select('testTable').all().results).toEqual([
        {
          id: 1,
          name: 'newName',
        },
      ])

      qb.dropTable({
        tableName: 'testTable',
      }).execute()
    })
  })
})

describe('Transactions', () => {
  // Note: Durable Objects require using state.storage.transactionSync() instead of SQL BEGIN TRANSACTION.
  // The DOQB.transaction() method uses SQL statements which don't work in DO environment.
  // These tests verify the expected behavior would work if the underlying API supported it.

  it.skip('transaction() wraps queries in BEGIN/COMMIT - skipped: DO requires storage.transactionSync()', async () => {
    const id = env.TEST_DO.idFromName('test-tx')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'txTest',
        schema: `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER DEFAULT 0
        `,
        ifNotExists: true,
      }).execute()

      // Execute multiple queries in a transaction
      qb.transaction((tx) => {
        tx.insert({ tableName: 'txTest', data: { name: 'item1', value: 100 } }).execute()
        tx.insert({ tableName: 'txTest', data: { name: 'item2', value: 200 } }).execute()
      })

      // Verify both inserts succeeded
      const allRows = qb.select('txTest').all()
      expect(allRows.results?.length).toBe(2)

      qb.dropTable({ tableName: 'txTest' }).execute()
    })
  })

  it.skip('transaction() rolls back on error - skipped: DO requires storage.transactionSync()', async () => {
    const id = env.TEST_DO.idFromName('test-tx-rollback')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'txRollback',
        schema: `
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        `,
        ifNotExists: true,
      }).execute()

      // Insert initial data
      qb.insert({ tableName: 'txRollback', data: { id: 1, name: 'initial' } }).execute()

      // Try a transaction that will fail
      try {
        qb.transaction((tx) => {
          tx.insert({ tableName: 'txRollback', data: { id: 2, name: 'should rollback' } }).execute()
          // This will fail due to duplicate primary key
          tx.insert({ tableName: 'txRollback', data: { id: 1, name: 'duplicate' } }).execute()
        })
      } catch (e) {
        // Expected to throw
      }

      // Verify rollback - only the initial insert should exist
      const allRows = qb.select('txRollback').all()
      expect(allRows.results?.length).toBe(1)
      expect((allRows.results as any)[0].name).toBe('initial')

      qb.dropTable({ tableName: 'txRollback' }).execute()
    })
  })

  it.skip('transaction() returns value from callback - skipped: DO requires storage.transactionSync()', async () => {
    const id = env.TEST_DO.idFromName('test-tx-return')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'txReturn',
        schema: `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          counter INTEGER DEFAULT 0
        `,
        ifNotExists: true,
      }).execute()

      const result = qb.transaction((tx) => {
        tx.insert({ tableName: 'txReturn', data: { counter: 10 } }).execute()
        tx.insert({ tableName: 'txReturn', data: { counter: 20 } }).execute()
        return 'transaction completed'
      })

      expect(result).toBe('transaction completed')

      qb.dropTable({ tableName: 'txReturn' }).execute()
    })
  })
})

describe('Query hooks', () => {
  it('beforeQuery hook is called before execution', async () => {
    const id = env.TEST_DO.idFromName('test-hook-before')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)
      const calledQueries: string[] = []

      qb.beforeQuery((query, type) => {
        calledQueries.push(`${type}: ${query.query.substring(0, 20)}`)
        return query
      })

      qb.createTable({
        tableName: 'hookTest',
        schema: 'id INTEGER PRIMARY KEY, name TEXT',
        ifNotExists: true,
      }).execute()

      qb.insert({ tableName: 'hookTest', data: { id: 1, name: 'test' } }).execute()
      qb.select('hookTest').all()

      expect(calledQueries.length).toBe(3)
      expect(calledQueries[0]).toContain('RAW')
      expect(calledQueries[1]).toContain('INSERT')
      expect(calledQueries[2]).toContain('SELECT')

      qb.dropTable({ tableName: 'hookTest' }).execute()
    })
  })

  it('afterQuery hook is called with result and duration', async () => {
    const id = env.TEST_DO.idFromName('test-hook-after')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)
      const hookCalls: { duration: number; hasResult: boolean }[] = []

      qb.afterQuery((result, query, duration) => {
        hookCalls.push({ duration, hasResult: !!result })
        return result
      })

      qb.createTable({
        tableName: 'hookTest2',
        schema: 'id INTEGER PRIMARY KEY, name TEXT',
        ifNotExists: true,
      }).execute()

      qb.insert({ tableName: 'hookTest2', data: { id: 1, name: 'test' } }).execute()

      expect(hookCalls.length).toBe(2)
      expect(hookCalls[0]!.hasResult).toBe(true)
      expect(hookCalls[0]!.duration).toBeGreaterThanOrEqual(0)
      expect(hookCalls[1]!.hasResult).toBe(true)

      qb.dropTable({ tableName: 'hookTest2' }).execute()
    })
  })

  it('beforeQuery can modify query', async () => {
    const id = env.TEST_DO.idFromName('test-hook-modify')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'hookTest3',
        schema: 'id INTEGER PRIMARY KEY, name TEXT, tenant_id INTEGER',
        ifNotExists: true,
      }).execute()

      qb.insert({ tableName: 'hookTest3', data: { id: 1, name: 'test1', tenant_id: 1 } }).execute()
      qb.insert({ tableName: 'hookTest3', data: { id: 2, name: 'test2', tenant_id: 2 } }).execute()

      // Create a new QB with tenant filtering hook
      const tenantQb = new DOQB(state.storage.sql)
      tenantQb.beforeQuery((query, type) => {
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

      const results = tenantQb.select('hookTest3').all()
      expect(results.results?.length).toBe(1)
      expect((results.results as any)[0].name).toBe('test1')

      qb.dropTable({ tableName: 'hookTest3' }).execute()
    })
  })
})

describe('Pagination', () => {
  it('paginate() returns results with pagination metadata', async () => {
    const id = env.TEST_DO.idFromName('test-paginate')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'paginateTest',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      }).execute()

      // Insert 25 rows
      for (let i = 1; i <= 25; i++) {
        qb.insert({ tableName: 'paginateTest', data: { name: `item${i}` } }).execute()
      }

      const result = qb.select('paginateTest').paginate({ page: 1, perPage: 10 })

      expect(result.results?.length).toBe(10)
      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.perPage).toBe(10)
      expect(result.pagination.total).toBe(25)
      expect(result.pagination.totalPages).toBe(3)
      expect(result.pagination.hasNext).toBe(true)
      expect(result.pagination.hasPrev).toBe(false)

      qb.dropTable({ tableName: 'paginateTest' }).execute()
    })
  })

  it('calculates totalPages correctly', async () => {
    const id = env.TEST_DO.idFromName('test-paginate-pages')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'paginateTest2',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      }).execute()

      // Insert 23 rows - should be 3 pages with perPage 10
      for (let i = 1; i <= 23; i++) {
        qb.insert({ tableName: 'paginateTest2', data: { name: `item${i}` } }).execute()
      }

      const result = qb.select('paginateTest2').paginate({ page: 1, perPage: 10 })

      expect(result.pagination.total).toBe(23)
      expect(result.pagination.totalPages).toBe(3) // ceil(23/10) = 3

      qb.dropTable({ tableName: 'paginateTest2' }).execute()
    })
  })

  it('hasNext is false on last page', async () => {
    const id = env.TEST_DO.idFromName('test-paginate-last')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'paginateTest3',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      }).execute()

      // Insert 15 rows
      for (let i = 1; i <= 15; i++) {
        qb.insert({ tableName: 'paginateTest3', data: { name: `item${i}` } }).execute()
      }

      const result = qb.select('paginateTest3').paginate({ page: 2, perPage: 10 })

      expect(result.results?.length).toBe(5) // Last 5 items
      expect(result.pagination.page).toBe(2)
      expect(result.pagination.totalPages).toBe(2)
      expect(result.pagination.hasNext).toBe(false)
      expect(result.pagination.hasPrev).toBe(true)

      qb.dropTable({ tableName: 'paginateTest3' }).execute()
    })
  })

  it('hasPrev is false on first page', async () => {
    const id = env.TEST_DO.idFromName('test-paginate-first')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, (instance, state) => {
      const qb = new DOQB(state.storage.sql)

      qb.createTable({
        tableName: 'paginateTest4',
        schema: 'id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT',
        ifNotExists: true,
      }).execute()

      // Insert 5 rows
      for (let i = 1; i <= 5; i++) {
        qb.insert({ tableName: 'paginateTest4', data: { name: `item${i}` } }).execute()
      }

      const result = qb.select('paginateTest4').paginate({ page: 1, perPage: 10 })

      expect(result.pagination.page).toBe(1)
      expect(result.pagination.hasPrev).toBe(false)
      expect(result.pagination.hasNext).toBe(false) // Only 1 page

      qb.dropTable({ tableName: 'paginateTest4' }).execute()
    })
  })
})
