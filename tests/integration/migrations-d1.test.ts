import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { D1QB, Migration } from '../../src'

// Define some sample migrations for testing
const MIGRATION_1_CREATE_LOGS: Migration = {
  name: 'MIGRATION_1_CREATE_LOGS.sql',
  sql: `
    CREATE TABLE logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL
    );`,
}

const MIGRATION_2_CREATE_USERS: Migration = {
  name: 'MIGRATION_2_CREATE_USERS.sql',
  sql: `
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT
    );`,
}

const MIGRATION_3_ADD_STATUS_TO_USERS: Migration = {
  name: 'MIGRATION_3_ADD_STATUS_TO_USERS.sql',
  sql: `ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';`,
}

// Test migrations array, can be redefined in specific tests if needed
export const testMigrations: Migration[] = [
  MIGRATION_1_CREATE_LOGS,
  MIGRATION_2_CREATE_USERS,
]

describe('Migrations D1', () => {
  let qb: D1QB

  beforeEach(async () => {
    qb = new D1QB(env.DB)
    // Clean up tables created by migrations and the migrations table itself
    await env.DB.exec('DROP TABLE IF EXISTS logs;')
    await env.DB.exec('DROP TABLE IF EXISTS users;')
    await env.DB.exec('DROP TABLE IF EXISTS logs_two;') // From original tests, ensure it's cleaned
    await env.DB.exec('DROP TABLE IF EXISTS migrations;') // Default migration table name

    // Verify clean state (optional, but good for sanity)
    const tables = (
      await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';`).all()
    ).results
    expect(tables).toEqual([])
  })

  // Original test 'initialize' - slightly refactored to use new qb and check for 'migrations' table
  it('initialize should create migrations table if it does not exist', async () => {
    await qb.migrations({ migrations: [] }).initialize() // Initialize with empty migrations
    const tables = (
      await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migrations';`).all()
    ).results
    expect(tables).toEqual([{ name: 'migrations' }])
  })

  // Original test 'apply' - refactored
  it('apply should execute pending migrations and record them', async () => {
    const applyResp = await qb.migrations({ migrations: [MIGRATION_1_CREATE_LOGS] }).apply()
    expect(applyResp.length).toBe(1)
    expect(applyResp[0]?.name).toBe(MIGRATION_1_CREATE_LOGS.name)

    const tables = (
      await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'logs';`).all()
    ).results
    expect(tables).toEqual([{ name: 'logs' }])

    const migrationRecords = (await env.DB.prepare('SELECT name FROM migrations;').all()).results
    expect(migrationRecords).toEqual([{ name: MIGRATION_1_CREATE_LOGS.name }])

    // Applying again should execute no new migrations
    const applyResp2 = await qb.migrations({ migrations: [MIGRATION_1_CREATE_LOGS] }).apply()
    expect(applyResp2.length).toBe(0)
  })

  // Original test 'incremental migrations' - refactored
  it('apply should handle incremental migrations correctly', async () => {
    await qb.migrations({ migrations: [MIGRATION_1_CREATE_LOGS] }).apply() // First migration

    const allMigrations = [MIGRATION_1_CREATE_LOGS, MIGRATION_2_CREATE_USERS]
    const applyResp2 = await qb.migrations({ migrations: allMigrations }).apply()

    expect(applyResp2.length).toBe(1)
    expect(applyResp2[0]?.name).toBe(MIGRATION_2_CREATE_USERS.name)

    const userTableExists = (
      await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users';`).all()
    ).results
    expect(userTableExists.length).toBe(1)

    const applyResp3 = await qb.migrations({ migrations: allMigrations }).apply()
    expect(applyResp3.length).toBe(0)
  })

  describe('getApplied()', () => {
    it('should return an empty array if no migrations have been applied', async () => {
      const applied = await qb.migrations({ migrations: testMigrations }).getApplied()
      expect(applied).toEqual([])
    })

    it('should return the name of one applied migration', async () => {
      await qb.migrations({ migrations: [MIGRATION_1_CREATE_LOGS] }).apply()
      const applied = await qb.migrations({ migrations: [MIGRATION_1_CREATE_LOGS] }).getApplied()
      expect(applied).toEqual([MIGRATION_1_CREATE_LOGS.name])
    })

    it('should return all applied migrations in order', async () => {
      const currentMigrations = [MIGRATION_1_CREATE_LOGS, MIGRATION_2_CREATE_USERS]
      await qb.migrations({ migrations: currentMigrations }).apply()
      const applied = await qb.migrations({ migrations: currentMigrations }).getApplied()
      expect(applied).toEqual([MIGRATION_1_CREATE_LOGS.name, MIGRATION_2_CREATE_USERS.name])

      // Apply a third one
      const nextMigrations = [...currentMigrations, MIGRATION_3_ADD_STATUS_TO_USERS]
      await qb.migrations({ migrations: nextMigrations }).apply()
      const appliedAfterThird = await qb.migrations({ migrations: nextMigrations }).getApplied()
      expect(appliedAfterThird).toEqual([
        MIGRATION_1_CREATE_LOGS.name,
        MIGRATION_2_CREATE_USERS.name,
        MIGRATION_3_ADD_STATUS_TO_USERS.name,
      ])
    })
  })

  describe('getUnapplied()', () => {
    it('should return all migrations if none have been applied', async () => {
      const unapplied = await qb.migrations({ migrations: testMigrations }).getUnapplied()
      expect(unapplied).toEqual(testMigrations.map(m => m.name))
    })

    it('should return remaining migrations if some have been applied', async () => {
      await qb.migrations({ migrations: [MIGRATION_1_CREATE_LOGS] }).apply() // Apply first
      const allThreeMigrations = [MIGRATION_1_CREATE_LOGS, MIGRATION_2_CREATE_USERS, MIGRATION_3_ADD_STATUS_TO_USERS]
      const unapplied = await qb.migrations({ migrations: allThreeMigrations }).getUnapplied()
      expect(unapplied).toEqual([MIGRATION_2_CREATE_USERS.name, MIGRATION_3_ADD_STATUS_TO_USERS.name])
    })

    it('should return an empty array if all migrations have been applied', async () => {
      await qb.migrations({ migrations: testMigrations }).apply() // Apply all in testMigrations
      const unapplied = await qb.migrations({ migrations: testMigrations }).getUnapplied()
      expect(unapplied).toEqual([])
    })
  })

  describe('empty migrations array', () => {
    it('apply() with empty migrations array should run without error and make no changes', async () => {
      const result = await qb.migrations({ migrations: [] }).apply()
      expect(result).toEqual([])
      // Check __migrations table exists (from initialize call within apply) but is empty
      const applied = await qb.migrations({ migrations: [] }).getApplied()
      expect(applied).toEqual([])
    })

    it('getApplied() with empty migrations array should return empty', async () => {
      // Ensure migrations table exists first
      await qb.migrations({ migrations: [] }).initialize()
      const applied = await qb.migrations({ migrations: [] }).getApplied()
      expect(applied).toEqual([])
    })

    it('getUnapplied() with empty migrations array should return empty', async () => {
      // Ensure migrations table exists first
      await qb.migrations({ migrations: [] }).initialize()
      const unapplied = await qb.migrations({ migrations: [] }).getUnapplied()
      expect(unapplied).toEqual([])
    })
  })
})

// Original content for reference, to be removed or integrated above
/*
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
*/
