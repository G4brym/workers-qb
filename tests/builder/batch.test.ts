import { D1QB } from '../../src/databases/d1'

describe('Batch Builder', () => {
  test('batch execute with fetch one and fetch all', async () => {
    const db = {
      batch: jest.fn((queries: string[]): Promise<any> => Promise.resolve([])),
      prepare: (q: string): string => q,
    }
    const qb = new D1QB(db)
    await qb.batchExecute([
      qb.fetchOne({
        tableName: 'tableA',
        fields: '*',
      }),
      qb.fetchAll({
        tableName: 'tableB',
        fields: '*',
      }),
    ])

    expect(db.batch).toHaveBeenCalledWith(['SELECT * FROM tableA LIMIT 1', 'SELECT * FROM tableB'])
  })
})
