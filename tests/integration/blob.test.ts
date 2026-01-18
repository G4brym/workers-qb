import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { D1QB } from '../../src'

describe('ArrayBuffer/BLOB operations', () => {
  it('insert and select ArrayBuffer data', async () => {
    const qb = new D1QB(env.DB)

    await qb
      .createTable({
        tableName: 'blobTable',
        schema: `
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          data BLOB
        `,
        ifNotExists: true,
      })
      .execute()

    // Create test binary data
    const testData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd])
    const arrayBuffer = testData.buffer

    // Insert with ArrayBuffer (as array for consistent array result)
    const insertResult = await qb
      .insert({
        tableName: 'blobTable',
        data: [
          {
            name: 'binary-test',
            data: arrayBuffer,
          },
        ],
        returning: '*',
      })
      .execute()

    const insertedRows = insertResult.results
    expect(insertedRows).toHaveLength(1)

    const insertedRow = insertedRows?.[0]
    expect(insertedRow).toBeDefined()
    expect(insertedRow?.id).toBe(1)
    expect(insertedRow?.name).toBe('binary-test')

    // D1 returns BLOB data as ArrayBufferLike (Uint8Array)
    const returnedData = insertedRow?.data as ArrayBufferLike
    expect(new Uint8Array(returnedData)).toEqual(testData)

    // Select the data back
    const selectResult = await qb
      .fetchOne({
        tableName: 'blobTable',
        where: {
          conditions: 'name = ?',
          params: ['binary-test'],
        },
      })
      .execute()

    expect(selectResult.results).toBeDefined()
    expect(selectResult.results?.name).toBe('binary-test')

    // Verify selected data matches
    const selectedData = selectResult.results?.data as ArrayBufferLike
    expect(new Uint8Array(selectedData)).toEqual(testData)

    // Test update with ArrayBuffer
    const newTestData = new Uint8Array([0xaa, 0xbb, 0xcc])
    const newArrayBuffer = newTestData.buffer

    const updateResult = await qb
      .update({
        tableName: 'blobTable',
        data: {
          data: newArrayBuffer,
        },
        where: {
          conditions: 'id = ?',
          params: [1],
        },
        returning: '*',
      })
      .execute()

    const updatedRows = updateResult.results
    expect(updatedRows).toHaveLength(1)

    const updatedRow = updatedRows?.[0]
    expect(updatedRow).toBeDefined()
    const updatedData = updatedRow?.data as ArrayBufferLike
    expect(new Uint8Array(updatedData)).toEqual(newTestData)

    // Test where clause with ArrayBuffer parameter
    const selectByBlob = await qb
      .fetchOne({
        tableName: 'blobTable',
        where: {
          conditions: 'data = ?',
          params: [newArrayBuffer],
        },
      })
      .execute()

    expect(selectByBlob.results).toBeDefined()
    expect(selectByBlob.results?.id).toBe(1)

    // Cleanup
    await qb
      .dropTable({
        tableName: 'blobTable',
      })
      .execute()
  })
})
