import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { D1QB } from '../../src'

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
      })
      .execute()

    expect(
      (
        await qb
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
      ).results
    ).toEqual([
      {
        id: 1,
        name: 'example',
      },
      {
        id: 2,
        name: 'test2',
      },
    ])

    expect((await qb.select('testTable').all()).results).toEqual([
      {
        id: 1,
        name: 'example',
      },
      {
        id: 2,
        name: 'test2',
      },
    ])

    expect(
      (
        await qb
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
      ).results
    ).toEqual([
      {
        id: 1,
        name: 'newName',
      },
    ])

    expect(
      (
        await qb
          .delete({
            tableName: 'testTable',
            where: {
              conditions: 'name = ?1',
              params: ['test2'],
            },
            returning: '*',
          })
          .execute()
      ).results
    ).toEqual([
      {
        id: 2,
        name: 'test2',
      },
    ])

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

  it('should select with JOIN on a subquery from getQueryAll()', async () => {
    const qb = new D1QB(env.DB)

    // Define table names
    const usersTable = 'users_join_subquery_test'
    const ordersTable = 'orders_join_subquery_test'

    try {
      // 1. Create tables
      await qb
        .createTable({
          tableName: usersTable,
          ifNotExists: true,
          schema: `
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT
        `,
        })
        .execute()

      await qb
        .createTable({
          tableName: ordersTable,
          ifNotExists: true,
          schema: `
          id INTEGER PRIMARY KEY,
          user_id INTEGER,
          item TEXT,
          amount REAL
        `,
        })
        .execute()

      // 2. Insert sample data
      // Users
      await qb
        .insert({
          tableName: usersTable,
          data: [
            { id: 1, name: 'Alice', status: 'active' },
            { id: 2, name: 'Bob', status: 'active' },
            { id: 3, name: 'Charlie', status: 'inactive' },
            { id: 4, name: 'David', status: 'active' }, // User with no orders
          ],
        })
        .execute()

      // Orders
      await qb
        .insert({
          tableName: ordersTable,
          data: [
            { user_id: 1, item: 'Book', amount: 20 },
            { user_id: 1, item: 'Pen', amount: 5 }, // Alice's second order
            { user_id: 2, item: 'Laptop', amount: 1200 }, // Bob's order
            { user_id: 1, item: 'Notebook', amount: 10 }, // Alice's third order
            { user_id: 3, item: 'Old Gadget', amount: 50 }, // Charlie's order
          ],
        })
        .execute()

      // 3. Construct the subquery using getQueryAll()
      const userOrderStatsSubQuery = qb
        .select(ordersTable)
        .fields(['user_id', 'COUNT(*) as order_count', 'SUM(amount) as total_amount'])
        .groupBy('user_id')
        .getQueryAll()

      // 4. Construct the main query with JOIN on the subquery
      type UserWithOrderStats = {
        id: number
        name: string
        status: string
        order_count: number | null
        total_amount: number | null
      }

      const mainQuery = qb.select<UserWithOrderStats>(usersTable).fields([
        `${usersTable}.id`,
        `${usersTable}.name`,
        `${usersTable}.status`,
        'order_stats.order_count',
        'order_stats.total_amount',
      ])
      mainQuery.join({
        type: 'LEFT',
        table: userOrderStatsSubQuery, // Using the Query object from getQueryAll()
        alias: 'order_stats',
        on: `${usersTable}.id = order_stats.user_id`,
      })
      mainQuery.orderBy(`${usersTable}.id`)

      const { results } = await mainQuery.execute()

      // 5. Assert the results
      expect(results).toBeInstanceOf(Array)
      expect(results?.length).toBe(4)

      // Alice (user_id 1)
      expect(results?.[0].name).toBe('Alice')
      expect(results?.[0].order_count).toBe(3) // 3 orders
      expect(results?.[0].total_amount).toBe(35) // 20 + 5 + 10

      // Bob (user_id 2)
      expect(results?.[1].name).toBe('Bob')
      expect(results?.[1].order_count).toBe(1)
      expect(results?.[1].total_amount).toBe(1200)

      // Charlie (user_id 3)
      expect(results?.[2].name).toBe('Charlie')
      expect(results?.[2].order_count).toBe(1) // 1 order
      expect(results?.[2].total_amount).toBe(50)

      // David (user_id 4) - No orders, so count/total should be null due to LEFT JOIN
      expect(results?.[3].name).toBe('David')
      expect(results?.[3].order_count).toBeNull()
      expect(results?.[3].total_amount).toBeNull()
    } finally {
      // 6. Cleanup: Drop the created tables
      await qb.dropTable({ tableName: ordersTable, ifExists: true }).execute()
      await qb.dropTable({ tableName: usersTable, ifExists: true }).execute()
    }
  })
})
