import { QuerybuilderTest, trimQuery } from '../utils'
import { ConflictTypes } from '../../src/enums'
import { Raw } from '../../src/tools'

describe('Update Builder', () => {
  test('update one field with one where and verify arguments', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
      },
      where: {
        conditions: 'field = ?1',
        params: ['test_where'],
      },
    })

    expect(trimQuery(result.query)).toEqual('UPDATE testTable SET my_field = ?2 WHERE field = ?1')
    expect(result.arguments).toEqual(['test_where', 'test_data'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update with Raw sql values', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
        updated_at: new Raw('CURRENT_TIMESTAMP'),
        another: '123',
      },
      where: {
        conditions: 'field = ?1',
        params: ['test_where'],
      },
    })

    expect(trimQuery(result.query)).toEqual(
      'UPDATE testTable SET my_field = ?2, updated_at = CURRENT_TIMESTAMP, another = ?3 WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test_where', 'test_data', '123'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update one field with one where without returning', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
      },
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(trimQuery(result.query)).toEqual('UPDATE testTable SET my_field = ?2 WHERE field = ?1')
    expect(result.arguments).toEqual(['test', 'test_update'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update multiple field with one where without returning', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(trimQuery(result.query)).toEqual('UPDATE testTable SET my_field = ?2, another = ?3 WHERE field = ?1')
    expect(result.arguments).toEqual(['test', 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update multiple field with multiple where without returning', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
    })

    expect(trimQuery(result.query)).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update multiple field with multiple where with one returning', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: 'id',
    })

    expect(trimQuery(result.query)).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update multiple field with multiple where with multiple returning', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
    })

    expect(trimQuery(result.query)).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update on conflict ignore', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
      onConflict: ConflictTypes.IGNORE,
    })

    expect(trimQuery(result.query)).toEqual(
      'UPDATE OR IGNORE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('update on conflict replace', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
      onConflict: 'REPLACE',
    })

    expect(trimQuery(result.query)).toEqual(
      'UPDATE OR REPLACE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })
})
