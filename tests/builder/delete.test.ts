import { QuerybuilderTest } from '../utils'

describe('Delete Builder', () => {
  test('delete with one where without returning', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = ?1')
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('delete with simplified where', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: 'field = false',
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = false')
    expect(result.arguments).toEqual(undefined)
    expect(result.fetchType).toEqual('ALL')
  })

  test('delete with simplified where list', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: ['field = false', 'active = false'],
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = false AND active = false')
    expect(result.arguments).toEqual(undefined)
    expect(result.fetchType).toEqual('ALL')
  })

  test('delete with multiple where without returning', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('delete with multiple where with one returning', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: 'id',
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2 RETURNING id')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('delete with multiple where with multiple returning', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: ['id', 'field'],
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2 RETURNING id, field')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })
})
