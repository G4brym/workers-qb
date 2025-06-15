import { describe, expect, it } from 'vitest'
import { QuerybuilderTest } from '../utils'

import { FetchTypes } from '../../src/enums'

describe('Raw Query Tests', () => {
  it('raw SELECT query with fetchType ALL', async () => {
    const result = new QuerybuilderTest().raw({
      query: 'SELECT * FROM testTable WHERE name = ?1',
      args: ['testName'],
      fetchType: FetchTypes.ALL,
    })
    expect(result.query).toEqual('SELECT * FROM testTable WHERE name = ?1')
    expect(result.arguments).toEqual(['testName'])
    expect(result.fetchType).toEqual(FetchTypes.ALL)
  })

  it('raw SELECT query with fetchType ONE', async () => {
    const result = new QuerybuilderTest().raw({
      query: 'SELECT * FROM testTable WHERE id = ?1',
      args: [1],
      fetchType: FetchTypes.ONE,
    })
    expect(result.query).toEqual('SELECT * FROM testTable WHERE id = ?1')
    expect(result.arguments).toEqual([1])
    expect(result.fetchType).toEqual(FetchTypes.ONE)
  })

  it('raw SELECT query without fetchType (default behavior)', async () => {
    const result = new QuerybuilderTest().raw({ query: 'SELECT * FROM testTable' })
    expect(result.query).toEqual('SELECT * FROM testTable')
    expect(result.arguments).toBeUndefined()
    expect(result.fetchType).toBeUndefined()
  })

  it('raw INSERT query', async () => {
    const result = new QuerybuilderTest().raw({
      query: 'INSERT INTO testTable (name, value) VALUES (?1, ?2)',
      args: ['newName', 100],
    })
    expect(result.query).toEqual('INSERT INTO testTable (name, value) VALUES (?1, ?2)')
    expect(result.arguments).toEqual(['newName', 100])
    expect(result.fetchType).toBeUndefined()
  })

  it('raw UPDATE query', async () => {
    const result = new QuerybuilderTest().raw({
      query: 'UPDATE testTable SET name = ?1 WHERE id = ?2',
      args: ['updatedName', 2],
    })
    expect(result.query).toEqual('UPDATE testTable SET name = ?1 WHERE id = ?2')
    expect(result.arguments).toEqual(['updatedName', 2])
    expect(result.fetchType).toBeUndefined()
  })

  it('raw DELETE query', async () => {
    const result = new QuerybuilderTest().raw({ query: 'DELETE FROM testTable WHERE id = ?1', args: [3] })
    expect(result.query).toEqual('DELETE FROM testTable WHERE id = ?1')
    expect(result.arguments).toEqual([3])
    expect(result.fetchType).toBeUndefined()
  })

  it('raw query with positional parameters (?)', async () => {
    const result = new QuerybuilderTest().raw({
      query: 'SELECT * FROM anotherTable WHERE col1 = ? AND col2 = ?',
      args: ['val1', 'val2'],
      fetchType: FetchTypes.ALL,
    })
    expect(result.query).toEqual('SELECT * FROM anotherTable WHERE col1 = ? AND col2 = ?')
    expect(result.arguments).toEqual(['val1', 'val2'])
    expect(result.fetchType).toEqual(FetchTypes.ALL)
  })
})
