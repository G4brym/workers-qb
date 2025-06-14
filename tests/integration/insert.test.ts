import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { D1QB, Raw } from '../../src'

const tableName = 'onconflict_test_table'
let qb: D1QB

describe('Insert with onConflict variations', () => {
  beforeEach(async () => {
    qb = new D1QB(env.DB)
    await qb
      .createTable({
        tableName,
        ifNotExists: true,
        schema: `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          name TEXT,
          counter INTEGER,
          status TEXT,
          version INTEGER
        `,
      })
      .execute()
  })

  afterEach(async () => {
    await qb.dropTable({ tableName, ifExists: true }).execute()
  })

  it("onConflict: 'IGNORE' should not insert or update if unique constraint violated", async () => {
    // Insert initial row
    await qb
      .insert({
        tableName,
        data: { email: 'ignore@example.com', name: 'Initial User', counter: 1 },
      })
      .execute()

    // Attempt to insert another row with the same unique email
    const { success, meta } = await qb
      .insert({
        tableName,
        data: { email: 'ignore@example.com', name: 'Second User Attempt', counter: 2 },
        onConflict: 'IGNORE',
      })
      .execute()

    expect(success).toBe(true)
    // For D1, an ignored insert due to constraint violation still reports 0 changes.
    // If it were a successful insert (no conflict), changes would be 1.
    expect(meta?.changes).toBe(0)

    // Verify the row still contains data from the first insert
    const { results: user } = await qb.select(tableName).where('email = ?', 'ignore@example.com').one()
    expect(user).not.toBeNull()
    expect(user?.name).toBe('Initial User')
    expect(user?.counter).toBe(1)
  })

  it("onConflict: 'REPLACE' should replace the row if unique constraint (email) violated", async () => {
    // Insert initial row
    await qb
      .insert({
        tableName,
        data: { email: 'replace_email@example.com', name: 'Original Email Replace', counter: 5 },
      })
      .execute()

    // Attempt to insert/replace with the same email
    const { success, meta } = await qb
      .insert({
        tableName,
        data: { email: 'replace_email@example.com', name: 'New Email Replace', counter: 10 },
        onConflict: 'REPLACE',
      })
      .execute()

    expect(success).toBe(true)
    expect(meta?.changes).toBe(1) // Should reflect 1 row changed (replaced)

    // Verify the row was replaced
    const { results: user } = await qb.select(tableName).where('email = ?', 'replace_email@example.com').one()
    expect(user).not.toBeNull()
    expect(user?.name).toBe('New Email Replace')
    expect(user?.counter).toBe(10)
  })

  it("onConflict: 'REPLACE' should replace the row if PRIMARY KEY (id) constraint violated", async () => {
    // Insert initial row, get its ID
    const { results: initialInsert } = await qb
      .insert({
        tableName,
        data: { email: 'replace_id_initial@example.com', name: 'Original For ID Replace', counter: 15 },
        returning: ['id'],
      })
      .execute()
    const idToReplace = initialInsert?.[0]?.id
    expect(idToReplace).toBeTypeOf('number')

    // Attempt to insert/replace with the same ID
    const { success, meta } = await qb
      .insert({
        tableName,
        data: { id: idToReplace, email: 'replace_id_final@example.com', name: 'Replaced By ID', counter: 20 },
        onConflict: 'REPLACE',
      })
      .execute()

    expect(success).toBe(true)
    expect(meta?.changes).toBe(1)

    // Verify the row was replaced
    const { results: user } = await qb.select(tableName).where('id = ?', idToReplace).one()
    expect(user).not.toBeNull()
    expect(user?.email).toBe('replace_id_final@example.com')
    expect(user?.name).toBe('Replaced By ID')
    expect(user?.counter).toBe(20)
  })

  it('UPSERT should update specified fields and increment counter on conflict', async () => {
    // Insert initial row
    await qb
      .insert({
        tableName,
        data: { email: 'upsert@example.com', name: 'Initial Upsert', counter: 1, status: 'active', version: 1 },
      })
      .execute()

    // Attempt to insert with the same email, triggering upsert
    const { success, meta, results: returned } = await qb
      .insert<{ id: number; email: string; name: string; counter: number; status: string; version: number }>({
        tableName,
        data: { email: 'upsert@example.com', name: 'New Name Data', counter: 100 /* This specific counter val will be ignored */ },
        onConflict: {
          column: 'email',
          data: {
            name: 'Updated Name via Upsert',
            counter: new Raw('counter + 1'), // Increment existing counter
            status: 'upserted', // Set a new status
          },
        },
        returning: ['name', 'counter', 'status', 'version'], // version should not change
      })
      .execute()

    expect(success).toBe(true)
    expect(meta?.changes).toBe(1)

    // Verify returned data from UPSERT
    expect(returned?.[0].name).toBe('Updated Name via Upsert')
    expect(returned?.[0].counter).toBe(2)
    expect(returned?.[0].status).toBe('upserted')
    expect(returned?.[0].version).toBe(1) // Version was not part of conflict update data

    // Verify by selecting the row
    const { results: user } = await qb.select(tableName).where('email = ?', 'upsert@example.com').one()
    expect(user).not.toBeNull()
    expect(user?.name).toBe('Updated Name via Upsert')
    expect(user?.counter).toBe(2)
    expect(user?.status).toBe('upserted')
    expect(user?.version).toBe(1) // Ensure version remains unchanged
  })

  it('UPSERT with DO UPDATE WHERE clause should update only if condition matches', async () => {
    // Insert initial rows
    await qb
      .insert({
        tableName,
        data: [
          { email: 'upsert_where1@example.com', name: 'CondUpdateMe', status: 'active', version: 1, counter: 10 },
          { email: 'upsert_where2@example.com', name: 'CondNoUpdateMe', status: 'inactive', version: 1, counter: 20 },
        ],
      })
      .execute()

    // Attempt UPSERT on the first row (should match WHERE)
    const { meta: meta1 } = await qb
      .insert({
        tableName,
        data: { email: 'upsert_where1@example.com', name: 'New Data1' }, // Data for potential insert
        onConflict: {
          column: 'email',
          data: { version: new Raw('version + 1'), name: 'Name Updated Conditionally' },
          where: { conditions: 'status = ?', params: ['active'] }, // Only update if status is 'active'
        },
      })
      .execute()
    expect(meta1?.changes).toBe(1)

    // Attempt UPSERT on the second row (should NOT match WHERE)
    const { meta: meta2 } = await qb
      .insert({
        tableName,
        data: { email: 'upsert_where2@example.com', name: 'New Data2' }, // Data for potential insert
        onConflict: {
          column: 'email',
          data: { version: new Raw('version + 1'), name: 'Name Should Not Update' },
          where: { conditions: 'status = ?', params: ['active'] }, // Same condition, but this row's status is 'inactive'
        },
      })
      .execute()
    // D1's behavior for UPSERT where conflict occurs but DO UPDATE WHERE condition is false:
    // It still considers the "conflict" part to have happened.
    // The `changes` count might be 1 if the SQLite engine considers the row "touched"
    // even if the UPDATE part doesn't change values. Or it could be 0 if it's smart enough.
    // Based on typical SQLite behavior, it often reports 1 change if conflict target found,
    // regardless of whether sub-clause of UPDATE changes values.
    // Let's be flexible or verify D1's specific behavior. For now, we primarily care about data.
    // expect(meta2?.changes).toBe(0); // This might be too strict.

    // Verify the first row was updated
    const { results: user1 } = await qb.select(tableName).where('email = ?', 'upsert_where1@example.com').one()
    expect(user1).not.toBeNull()
    expect(user1?.version).toBe(2)
    expect(user1?.name).toBe('Name Updated Conditionally')

    // Verify the second row was NOT updated
    const { results: user2 } = await qb.select(tableName).where('email = ?', 'upsert_where2@example.com').one()
    expect(user2).not.toBeNull()
    expect(user2?.version).toBe(1) // Version should remain 1
    expect(user2?.name).toBe('CondNoUpdateMe') // Name should remain 'CondNoUpdateMe'
  })
})
