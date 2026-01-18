import { describe, expect, it } from 'vitest'
import { Raw } from '../../src/tools'
import { QuerybuilderTest } from '../utils'

describe('Update Builder', () => {
  it('update one field with one where and verify arguments', async () => {
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

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?2 WHERE field = ?1')
    expect(result.arguments).toEqual(['test_where', 'test_data'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update one field with simplified where', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
      },
      where: 'field = true',
    })

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?1 WHERE field = true')
    expect(result.arguments).toEqual(['test_data'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update one field with simplified where list', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
      },
      where: ['field = true', 'active = true'],
    })

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?1 WHERE (field = true) AND (active = true)')
    expect(result.arguments).toEqual(['test_data'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update with Raw sql values', async () => {
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

    expect(result.query).toEqual(
      'UPDATE testTable SET my_field = ?2, updated_at = CURRENT_TIMESTAMP, another = ?3 WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test_where', 'test_data', '123'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update one field with one where without returning', async () => {
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

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?2 WHERE field = ?1')
    expect(result.arguments).toEqual(['test', 'test_update'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with one where without returning', async () => {
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

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?2, another = ?3 WHERE field = ?1')
    expect(result.arguments).toEqual(['test', 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with multiple where without returning', async () => {
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

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2)')
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with multiple where with one returning', async () => {
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

    expect(result.query).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with multiple where with multiple returning', async () => {
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

    expect(result.query).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update on conflict ignore', async () => {
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
      onConflict: 'IGNORE',
    })

    expect(result.query).toEqual(
      'UPDATE OR IGNORE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update on conflict replace', async () => {
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

    expect(result.query).toEqual(
      'UPDATE OR REPLACE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update one field with one where and verify arguments - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
      },
      where: {
        conditions: 'field = ?',
        params: ['test_where'],
      },
    })

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?2 WHERE field = ?1')
    expect(result.arguments).toEqual(['test_where', 'test_data'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update with Raw sql values - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
        updated_at: new Raw('CURRENT_TIMESTAMP'),
        another: '123',
      },
      where: {
        conditions: 'field = ?',
        params: ['test_where'],
      },
    })

    expect(result.query).toEqual(
      'UPDATE testTable SET my_field = ?2, updated_at = CURRENT_TIMESTAMP, another = ?3 WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test_where', 'test_data', '123'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update one field with one where without returning - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
      },
      where: {
        conditions: 'field = ?',
        params: ['test'],
      },
    })

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?2 WHERE field = ?1')
    expect(result.arguments).toEqual(['test', 'test_update'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with one where without returning - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: 'field = ?',
        params: ['test'],
      },
    })

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?2, another = ?3 WHERE field = ?1')
    expect(result.arguments).toEqual(['test', 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with multiple where without returning - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?', 'id = ?'],
        params: ['test', 345],
      },
    })

    expect(result.query).toEqual('UPDATE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2)')
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with multiple where with one returning - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?', 'id = ?'],
        params: ['test', 345],
      },
      returning: 'id',
    })

    expect(result.query).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with multiple where with multiple returning - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?', 'id = ?'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
    })

    expect(result.query).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update on conflict ignore - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?', 'id = ?'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
      onConflict: 'IGNORE',
    })

    expect(result.query).toEqual(
      'UPDATE OR IGNORE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update on conflict replace - unnumbered parameters', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
      },
      where: {
        conditions: ['field = ?', 'id = ?'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
      onConflict: 'REPLACE',
    })

    expect(result.query).toEqual(
      'UPDATE OR REPLACE testTable SET my_field = ?3, another = ?4 WHERE (field = ?1) AND (id = ?2) RETURNING id, field'
    )
    expect(result.arguments).toEqual(['test', 345, 'test_update', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update multiple field with multiple where without returning - unnumbered parameters - complex case', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        my_field: 'test_update',
        another: 123,
        third_field: 'third value',
      },
      where: {
        conditions: ['field = ? AND another_field = ?', 'id = ?'],
        params: ['test', 'another_test', 345],
      },
    })

    expect(result.query).toEqual(
      'UPDATE testTable SET my_field = ?4, another = ?5, third_field = ?6 WHERE (field = ?1 AND another_field = ?2) AND (id = ?3)'
    )
    expect(result.arguments).toEqual(['test', 'another_test', 345, 'test_update', 123, 'third value'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update with where numbered param reuse', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        status: 'processed',
      },
      where: {
        conditions: 'owner_id = ?1 OR assignee_id = ?1',
        params: ['user456'],
      },
    })

    expect(result.query).toEqual('UPDATE testTable SET status = ?2 WHERE owner_id = ?1 OR assignee_id = ?1')
    expect(result.arguments).toEqual(['user456', 'processed'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('update with multiple conditions reusing numbered params', async () => {
    const result = new QuerybuilderTest().update({
      tableName: 'testTable',
      data: {
        reviewed: true,
      },
      where: {
        conditions: ['created_by = ?1', 'approved_by = ?1'],
        params: ['admin_user'],
      },
    })

    expect(result.query).toEqual('UPDATE testTable SET reviewed = ?2 WHERE (created_by = ?1) AND (approved_by = ?1)')
    expect(result.arguments).toEqual(['admin_user', true])
    expect(result.fetchType).toEqual('ALL')
  })
})
