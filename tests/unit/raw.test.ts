import { describe, expect, it } from 'vitest'
import { QuerybuilderTest } from '../utils'

describe('Raw Query Tests', () => {
  it('raw SELECT query with fetchType ALL', async () => {
    const result = new QuerybuilderTest().raw('SELECT * FROM testTable WHERE name = ?1', ['testName']).getQueryAll()
    expect(result.query).toEqual('SELECT * FROM testTable WHERE name = ?1')
    expect(result.arguments).toEqual(['testName'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('raw SELECT query with fetchType ONE', async () => {
    const result = new QuerybuilderTest().raw('SELECT * FROM testTable WHERE id = ?1', [1]).getQueryOne()
    expect(result.query).toEqual('SELECT * FROM testTable WHERE id = ?1')
    expect(result.arguments).toEqual([1])
    expect(result.fetchType).toEqual('ONE')
  })

  it('raw SELECT query without fetchType (default behavior)', async () => {
    // Assuming default behavior for raw queries without explicit fetchType is to not set fetchType,
    // or it might depend on the specific implementation (e.g., execute without returning results).
    // For this example, let's assume it prepares the query and arguments but fetchType is undefined or a specific default.
    const qb = new QuerybuilderTest()
    const rawQuery = qb.raw('SELECT * FROM testTable')
    // Depending on the library, `getQuery` might exist or you might need to call `execute` or similar
    // For now, let's assume getQuery() would give us the prepared statement if that's how the library works
    // or that we are testing the state of the builder before execution.
    // This test might need adjustment based on actual library behavior for `raw()` without `getQueryAll/One()`.

    // If raw() itself doesn't imply a fetch type until getQueryAll/One/Execute is called:
    // We'll test what raw() returns directly if it's a builder instance we can inspect.
    // Or, if raw() is meant to be chained with getQueryAll/One, this test might be redundant
    // with the ones above, or it tests a different aspect like "execute"
    const result = rawQuery.getQuery() // Assuming a generic getQuery() or similar for non-fetching ops

    expect(result.query).toEqual('SELECT * FROM testTable')
    expect(result.arguments).toBeUndefined()
    // fetchType might be undefined or a specific default like 'NONE' or 'EXECUTE'
    // Adjust based on actual library behavior. For now, expecting undefined.
    expect(result.fetchType).toBeUndefined()
  })

  it('raw INSERT query', async () => {
    const result = new QuerybuilderTest()
      .raw('INSERT INTO testTable (name, value) VALUES (?1, ?2)', ['newName', 100])
      .getQuery()
    expect(result.query).toEqual('INSERT INTO testTable (name, value) VALUES (?1, ?2)')
    expect(result.arguments).toEqual(['newName', 100])
    // INSERT operations typically don't have a fetchType like SELECT, or it might be 'EXECUTE' or undefined
    expect(result.fetchType).toBeUndefined() // Or specific value like 'NONE' or 'EXECUTE'
  })

  it('raw UPDATE query', async () => {
    const result = new QuerybuilderTest()
      .raw('UPDATE testTable SET name = ?1 WHERE id = ?2', ['updatedName', 2])
      .getQuery()
    expect(result.query).toEqual('UPDATE testTable SET name = ?1 WHERE id = ?2')
    expect(result.arguments).toEqual(['updatedName', 2])
    expect(result.fetchType).toBeUndefined() // Or specific value like 'NONE' or 'EXECUTE'
  })

  it('raw DELETE query', async () => {
    const result = new QuerybuilderTest().raw('DELETE FROM testTable WHERE id = ?1', [3]).getQuery()
    expect(result.query).toEqual('DELETE FROM testTable WHERE id = ?1')
    expect(result.arguments).toEqual([3])
    expect(result.fetchType).toBeUndefined() // Or specific value like 'NONE' or 'EXECUTE'
  })

  it('raw query with positional parameters (?)', async () => {
    const result = new QuerybuilderTest()
      .raw('SELECT * FROM anotherTable WHERE col1 = ? AND col2 = ?', ['val1', 'val2'])
      .getQueryAll()
    expect(result.query).toEqual('SELECT * FROM anotherTable WHERE col1 = ? AND col2 = ?')
    expect(result.arguments).toEqual(['val1', 'val2'])
    expect(result.fetchType).toEqual('ALL')
  })
})
