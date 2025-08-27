import { env, runInDurableObject } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { DOQB } from '../../src'

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
