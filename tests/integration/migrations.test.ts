import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { D1QB, Migration } from '../../src'

export const migrations: Migration[] = [
  {
    name: '100000000000000_add_logs_table.sql',
    sql: `
      create table logs
      (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );`,
  },
]

describe('Migrations', () => {
  it('initialize', async () => {
    const qb = new D1QB(env.DB)

    expect(
      (
        await env.DB.prepare(`SELECT name
                                  FROM sqlite_master
                                  WHERE type = 'table'`).all()
      ).results
    ).toEqual([])

    await qb.migrations({ migrations }).initialize()

    expect(
      (
        await env.DB.prepare(`SELECT name
                                  FROM sqlite_master
                                  WHERE type = 'table'
                                    AND name <> 'sqlite_sequence'`).all()
      ).results
    ).toEqual([
      {
        name: 'migrations',
      },
    ])
  })

  it('apply', async () => {
    const qb = new D1QB(env.DB)

    expect(
      (
        await env.DB.prepare(`SELECT name
                                  FROM sqlite_master
                                  WHERE type = 'table'`).all()
      ).results
    ).toEqual([])

    const applyResp = await qb.migrations({ migrations }).apply()

    expect(applyResp.length).toEqual(1)
    expect(applyResp[0]?.name).toEqual('100000000000000_add_logs_table.sql')

    expect(
      (
        await env.DB.prepare(`SELECT name
                                  FROM sqlite_master
                                  WHERE type = 'table'
                                    AND name <> 'sqlite_sequence'`).all()
      ).results
    ).toEqual([
      {
        name: 'migrations',
      },
      {
        name: 'logs',
      },
    ])

    const applyResp2 = await qb.migrations({ migrations }).apply()
    expect(applyResp2.length).toEqual(0)
  })

  it('incremental migrations', async () => {
    const qb = new D1QB(env.DB)

    expect(
      (
        await env.DB.prepare(`SELECT name
                                  FROM sqlite_master
                                  WHERE type = 'table'`).all()
      ).results
    ).toEqual([])

    const applyResp = await qb.migrations({ migrations }).apply()

    expect(applyResp.length).toEqual(1)
    expect(applyResp[0]?.name).toEqual('100000000000000_add_logs_table.sql')

    expect(
      (
        await env.DB.prepare(`SELECT name
                                  FROM sqlite_master
                                  WHERE type = 'table'
                                    AND name <> 'sqlite_sequence'`).all()
      ).results
    ).toEqual([
      {
        name: 'migrations',
      },
      {
        name: 'logs',
      },
    ])

    const updatedMigrations = [
      ...migrations,
      {
        name: '100000000000001_add_second_table.sql',
        sql: `
      create table logs_two
      (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );`,
      },
    ]

    const applyResp2 = await qb.migrations({ migrations: updatedMigrations }).apply()

    expect(applyResp2.length).toEqual(1)
    expect(applyResp2[0]?.name).toEqual('100000000000001_add_second_table.sql')

    const applyResp3 = await qb.migrations({ migrations: updatedMigrations }).apply()
    expect(applyResp3.length).toEqual(0)
  })
})
