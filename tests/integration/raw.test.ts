import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { D1QB, FetchTypes } from '../../src' // Assuming FetchTypes is exported

const tableName = 'raw_test_table'
let qb: D1QB

describe('Raw Queries Integration Tests', () => {
  beforeEach(async () => {
    qb = new D1QB(env.DB)
    // Create table
    await qb
      .createTable({
        tableName,
        ifNotExists: true,
        schema: `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          value INTEGER
        `,
      })
      .execute()

    // Insert initial data
    await qb
      .insert({
        tableName,
        data: [
          { name: 'InitialRow1', value: 10 },
          { name: 'InitialRow2', value: 20 },
        ],
      })
      .execute()
  })

  afterEach(async () => {
    await qb.dropTable({ tableName, ifExists: true }).execute()
  })

  it('should fetch all results using qb.raw() with fetchType: ALL', async () => {
    const { results, success, meta } = await qb
      .raw<{ id: number; name: string; value: number }>({
        query: `SELECT * FROM ${tableName} ORDER BY id`,
        fetchType: FetchTypes.ALL, // Using exported enum if available, otherwise 'ALL'
      })
      .execute()

    expect(success).toBe(true)
    expect(meta).toBeDefined()
    expect(results).toBeInstanceOf(Array)
    expect(results?.length).toBe(2)
    expect(results?.[0].name).toBe('InitialRow1')
    expect(results?.[0].value).toBe(10)
    expect(results?.[1].name).toBe('InitialRow2')
    expect(results?.[1].value).toBe(20)
  })

  it('should fetch one result using qb.raw() with fetchType: ONE', async () => {
    // First, get an ID from the inserted data
    const initialData = await qb.select(tableName).where('name = ?', 'InitialRow1').one()
    const idToFetch = initialData.results?.id

    const { results, success } = await qb
      .raw<{ id: number; name: string; value: number }>({
        query: `SELECT * FROM ${tableName} WHERE id = ?`,
        args: [idToFetch],
        fetchType: FetchTypes.ONE, // Or 'ONE'
      })
      .execute()

    expect(success).toBe(true)
    expect(results).not.toBeNull()
    expect(results?.id).toBe(idToFetch)
    expect(results?.name).toBe('InitialRow1')
    expect(results?.value).toBe(10)
  })

  it('should return null for one result that does not exist using qb.raw() with fetchType: ONE', async () => {
    const { results, success } = await qb
      .raw<{ id: number; name: string; value: number }>({
        query: `SELECT * FROM ${tableName} WHERE id = ?`,
        args: [-999], // Non-existent ID
        fetchType: FetchTypes.ONE, // Or 'ONE'
      })
      .execute()

    expect(success).toBe(true)
    expect(results).toBeNull()
  })

  it('should perform a raw INSERT using qb.raw() and verify insertion', async () => {
    const insertName = 'RawInsertedTest'
    const insertValue = 100

    const { success, meta } = await qb
      .raw({
        query: `INSERT INTO ${tableName} (name, value) VALUES (?, ?)`,
        args: [insertName, insertValue],
      })
      .execute()

    expect(success).toBe(true)
    expect(meta?.changes).toBe(1)

    // Verify insertion
    const verifyResult = await qb.select(tableName).where('name = ?', insertName).one()
    expect(verifyResult.results).not.toBeNull()
    expect(verifyResult.results?.name).toBe(insertName)
    expect(verifyResult.results?.value).toBe(insertValue)
  })

  it('should perform a raw UPDATE using qb.raw() and verify update', async () => {
    const targetName = 'InitialRow1'
    const updatedValue = 555

    const { success, meta } = await qb
      .raw({
        query: `UPDATE ${tableName} SET value = ? WHERE name = ?`,
        args: [updatedValue, targetName],
      })
      .execute()

    expect(success).toBe(true)
    expect(meta?.changes).toBe(1)

    // Verify update
    const verifyResult = await qb.select(tableName).where('name = ?', targetName).one()
    expect(verifyResult.results).not.toBeNull()
    expect(verifyResult.results?.value).toBe(updatedValue)
  })

  it('should perform a raw DELETE using qb.raw() and verify deletion', async () => {
    const targetName = 'InitialRow2'

    const { success, meta } = await qb
      .raw({
        query: `DELETE FROM ${tableName} WHERE name = ?`,
        args: [targetName],
      })
      .execute()

    expect(success).toBe(true)
    expect(meta?.changes).toBe(1)

    // Verify deletion
    const verifyResult = await qb.select(tableName).where('name = ?', targetName).one()
    expect(verifyResult.results).toBeNull()

    // Check that other data is still there
    const remainingData = await qb.select(tableName).all()
    expect(remainingData.results?.length).toBe(1) // InitialRow1 + any row from raw insert test if run before
  })
})
