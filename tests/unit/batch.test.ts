import { describe, expect, it } from 'vitest'
import { D1QB } from '../../src/databases/d1'
import { QuerybuilderTest } from '../utils'

describe('Batch Builder', () => {
  it('batch execute with fetch one and fetch all', async () => {
    const dbMock = {
      prepare: () => {
        const stmt = {
          bind: (..._args: any[]) => {
            return stmt
          },
          all: () => ({ results: [{ id: 1 }], meta: {}, success: true }),
        }
        return stmt
      },
      batch: (stmts: any) => {
        return Promise.resolve(stmts.map((stmt: any) => stmt.all()))
      },
      exec: () => {
        throw new Error('not implemented')
      },
    }

    const qb = new D1QB(dbMock)
    const result = await qb.batchExecute([
      new QuerybuilderTest().fetchOne({
        tableName: 'test',
        fields: '*',
      }),
      new QuerybuilderTest().fetchAll({
        tableName: 'test',
        fields: '*',
      }),
    ])
    expect(result.length).toBe(2)
    expect(result[0].results).toStrictEqual({ id: 1 })
    expect(result[1].results).toStrictEqual([{ id: 1 }])
  })
})
