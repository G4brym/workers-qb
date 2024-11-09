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
})
