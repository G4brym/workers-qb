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
