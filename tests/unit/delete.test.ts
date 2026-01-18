import { describe, expect, it } from 'vitest'
import { QuerybuilderTest } from '../utils'

describe('Delete Builder', () => {
  it('delete with one where without returning', async () => {
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

  it('delete with simplified where', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: 'field = false',
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = false')
    expect(result.arguments).toEqual(undefined)
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with limit', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: 'field = false',
      limit: 10,
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = false LIMIT 10')
    expect(result.arguments).toEqual(undefined)
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with limit and offset', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: 'field = false',
      limit: 10,
      offset: 10,
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE field = false LIMIT 10 OFFSET 10')
    expect(result.arguments).toEqual(undefined)
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with simplified where list', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: ['field = false', 'active = false'],
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE (field = false) AND (active = false)')
    expect(result.arguments).toEqual(undefined)
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with multiple where without returning', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE (field = ?1) AND (id = ?2)')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with multiple where with one returning', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: 'id',
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE (field = ?1) AND (id = ?2) RETURNING id')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with multiple where with multiple returning', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: ['id', 'field'],
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE (field = ?1) AND (id = ?2) RETURNING id, field')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with multiple where with multiple returning and limit', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: ['id', 'field'],
      limit: 10000,
    })

    expect(result.query).toEqual(
      'DELETE FROM testTable WHERE (field = ?1) AND (id = ?2) RETURNING id, field LIMIT 10000'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with multiple where with multiple returning and limit and order', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: ['id', 'field'],
      orderBy: 'id',
      limit: 10000,
    })

    expect(result.query).toEqual(
      'DELETE FROM testTable WHERE (field = ?1) AND (id = ?2) RETURNING id, field ORDER BY id LIMIT 10000'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with where numbered param reuse', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: 'owner_id = ?1 OR created_by = ?1',
        params: ['user123'],
      },
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE owner_id = ?1 OR created_by = ?1')
    expect(result.arguments).toEqual(['user123'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('delete with multiple conditions reusing numbered params', async () => {
    const result = new QuerybuilderTest().delete({
      tableName: 'testTable',
      where: {
        conditions: ['user_id = ?1', 'approver_id = ?1'],
        params: ['admin'],
      },
    })

    expect(result.query).toEqual('DELETE FROM testTable WHERE (user_id = ?1) AND (approver_id = ?1)')
    expect(result.arguments).toEqual(['admin'])
    expect(result.fetchType).toEqual('ALL')
  })
})
