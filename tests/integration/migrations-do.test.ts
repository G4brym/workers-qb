import { env, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { D1QB, DOQB, Migration } from '../../src'

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
    const id = env.TEST_DO.idFromName('test')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, async (_instance, state) => {
      const qb = new DOQB(state.storage.sql)

      expect(
        Array.from(
          state.storage.sql.exec(`SELECT name
                                                FROM sqlite_master
                                                WHERE type = 'table'
                                                  AND name not in ('_cf_KV', 'sqlite_sequence', '_cf_METADATA')`)
        )
      ).toEqual([])

      qb.migrations({ migrations }).initialize()

      expect(
        Array.from(
          state.storage.sql.exec(`SELECT name
                                                FROM sqlite_master
                                                WHERE type = 'table'
                                                  AND name not in ('_cf_KV', 'sqlite_sequence', '_cf_METADATA')`)
        )
      ).toEqual([
        {
          name: 'migrations',
        },
      ])
    })
  })

  it('apply', async () => {
    const id = env.TEST_DO.idFromName('test')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, async (_instance, state) => {
      const qb = new DOQB(state.storage.sql)

      expect(
        Array.from(
          state.storage.sql.exec(`SELECT name
                                                FROM sqlite_master
                                                WHERE type = 'table'
                                                  AND name not in ('_cf_KV', 'sqlite_sequence', '_cf_METADATA')`)
        )
      ).toEqual([])

      const applyResp = qb.migrations({ migrations }).apply()

      expect(applyResp.length).toEqual(1)
      expect(applyResp[0]?.name).toEqual('100000000000000_add_logs_table.sql')

      expect(
        Array.from(
          state.storage.sql.exec(`SELECT name
                                                FROM sqlite_master
                                                WHERE type = 'table'
                                                  AND name not in ('_cf_KV', 'sqlite_sequence', '_cf_METADATA')`)
        )
      ).toEqual([
        {
          name: 'migrations',
        },
        {
          name: 'logs',
        },
      ])

      const applyResp2 = qb.migrations({ migrations }).apply()
      expect(applyResp2.length).toEqual(0)
    })
  })

  it('incremental migrations', async () => {
    const id = env.TEST_DO.idFromName('test')
    const stub = env.TEST_DO.get(id)

    await runInDurableObject(stub, async (_instance, state) => {
      const qb = new DOQB(state.storage.sql)

      expect(
        Array.from(
          state.storage.sql.exec(`SELECT name
                                                FROM sqlite_master
                                                WHERE type = 'table'
                                                  AND name not in ('_cf_KV', 'sqlite_sequence', '_cf_METADATA')`)
        )
      ).toEqual([])

      const applyResp = qb.migrations({ migrations }).apply()

      expect(applyResp.length).toEqual(1)
      expect(applyResp[0]?.name).toEqual('100000000000000_add_logs_table.sql')

      expect(
        Array.from(
          state.storage.sql.exec(`SELECT name
                                                FROM sqlite_master
                                                WHERE type = 'table'
                                                  AND name not in ('_cf_KV', 'sqlite_sequence', '_cf_METADATA')`)
        )
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

      const applyResp2 = qb.migrations({ migrations: updatedMigrations }).apply()

      expect(applyResp2.length).toEqual(1)
      expect(applyResp2[0]?.name).toEqual('100000000000001_add_second_table.sql')

      const applyResp3 = qb.migrations({ migrations: updatedMigrations }).apply()
      expect(applyResp3.length).toEqual(0)
    })
  })
})
