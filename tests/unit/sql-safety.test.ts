import { describe, expect, it } from 'vitest'
import { InvalidConfigurationError, Raw } from '../../src'
import { QuerybuilderTest } from '../utils'

describe('SQL fragment safety', () => {
  it('rejects unsafe table names', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.select('users; DELETE FROM users; --').toSQL()).toThrow(InvalidConfigurationError)
  })

  it('preserves existing field expressions', () => {
    const qb = new QuerybuilderTest()
    const jsonQuery = qb.select('users').fields("metadata ? 'verified' AS is_verified").getQueryAll()

    expect(qb.select('users').fields('COUNT(*) AS total').toSQL().sql).toBe('SELECT COUNT(*) AS total FROM users')
    expect(jsonQuery.query).toBe("SELECT metadata ? 'verified' AS is_verified FROM users")
    expect(jsonQuery.toStatement('postgres')).toBe("SELECT metadata ? 'verified' AS is_verified FROM users")
  })

  it('inlines Raw WHERE and HAVING values while binding ordinary values', () => {
    const qb = new QuerybuilderTest()
    const query = qb.fetchAll({
      tableName: 'users',
      fields: ['role', 'COUNT(*) AS total'],
      where: {
        conditions: 'created_at < ? AND status = ?',
        params: [new Raw('CURRENT_TIMESTAMP'), 'active'],
      },
      groupBy: 'role',
      having: {
        conditions: 'COUNT(*) > ? AND MAX(updated_at) < ?',
        params: [5, new Raw('CURRENT_TIMESTAMP')],
      },
    })

    expect(query.query).toBe(
      'SELECT role, COUNT(*) AS total FROM users WHERE created_at < CURRENT_TIMESTAMP AND status = ? GROUP BY role HAVING COUNT(*) > ? AND MAX(updated_at) < CURRENT_TIMESTAMP'
    )
    expect(query.arguments).toEqual(['active', 5])
  })

  it('renumbers bound values when numbered WHERE parameters include Raw', () => {
    const qb = new QuerybuilderTest()
    const query = qb.update({
      tableName: 'users',
      data: { status: 'inactive' },
      where: {
        conditions: 'updated_at < ?1 AND id = ?2',
        params: [new Raw('CURRENT_TIMESTAMP'), 42],
      },
    })

    expect(query.query).toBe('UPDATE users SET status = ?2 WHERE updated_at < CURRENT_TIMESTAMP AND id = ?1')
    expect(query.arguments).toEqual([42, 'inactive'])
    expect(query.toStatement('postgres')).toBe(
      'UPDATE users SET status = $2 WHERE updated_at < CURRENT_TIMESTAMP AND id = $1'
    )
  })

  it('keeps numbered parameters unique across WHERE and HAVING', () => {
    const qb = new QuerybuilderTest()
    const query = qb.fetchAll({
      tableName: 'users',
      fields: ['status', 'COUNT(*) AS total'],
      where: {
        conditions: 'status = ?1 AND created_at < ?2',
        params: ['active', new Raw('CURRENT_TIMESTAMP')],
      },
      groupBy: 'status',
      having: {
        conditions: 'COUNT(*) > ?1 AND MAX(updated_at) < ?2',
        params: [5, new Raw('CURRENT_TIMESTAMP')],
      },
    })

    expect(query.arguments).toEqual(['active', 5])
    expect(query.toStatement('postgres')).toBe(
      'SELECT status, COUNT(*) AS total FROM users WHERE status = $1 AND created_at < CURRENT_TIMESTAMP GROUP BY status HAVING COUNT(*) > $2 AND MAX(updated_at) < CURRENT_TIMESTAMP'
    )
    expect(query.toStatement('sqlite')).toBe(
      'SELECT status, COUNT(*) AS total FROM users WHERE status = ?1 AND created_at < CURRENT_TIMESTAMP GROUP BY status HAVING COUNT(*) > ?2 AND MAX(updated_at) < CURRENT_TIMESTAMP'
    )
  })

  it('does not treat question marks inside Raw as parameters', () => {
    const qb = new QuerybuilderTest()
    const query = qb.update({
      tableName: 'users',
      data: { status: 'active' },
      where: {
        conditions: '? AND id = ?',
        params: [new Raw("metadata ? 'verified'"), 42],
      },
    })

    expect(query.query).toBe("UPDATE users SET status = ?2 WHERE metadata ? 'verified' AND id = ?1")
    expect(query.arguments).toEqual([42, 'active'])
    expect(query.toStatement('postgres')).toBe("UPDATE users SET status = $2 WHERE metadata ? 'verified' AND id = $1")
  })

  it('compacts out-of-order numbered parameters that include Raw', () => {
    const qb = new QuerybuilderTest()
    const query = qb.fetchAll({
      tableName: 'users',
      where: {
        conditions: 'created_at < ?3 AND updated_at < ?2 AND id = ?1',
        params: [new Raw('CURRENT_TIMESTAMP'), new Raw('CURRENT_TIMESTAMP'), 42],
      },
    })

    expect(query.query).toBe(
      'SELECT * FROM users WHERE created_at < CURRENT_TIMESTAMP AND updated_at < CURRENT_TIMESTAMP AND id = ?1'
    )
    expect(query.arguments).toEqual([42])
    expect(query.toStatement('postgres')).toBe(
      'SELECT * FROM users WHERE created_at < CURRENT_TIMESTAMP AND updated_at < CURRENT_TIMESTAMP AND id = $1'
    )
  })

  it('preserves explicit out-of-order numbered parameter labels', () => {
    const qb = new QuerybuilderTest()
    const query = qb.fetchAll({
      tableName: 'users',
      where: {
        conditions: 'owner_id = ?2 AND reviewer_id = ?1',
        params: ['owner', 'reviewer'],
      },
    })

    expect(query.query).toBe('SELECT * FROM users WHERE owner_id = ?2 AND reviewer_id = ?1')
    expect(query.arguments).toEqual(['owner', 'reviewer'])
    expect(query.toStatement('postgres')).toBe('SELECT * FROM users WHERE owner_id = $2 AND reviewer_id = $1')
    expect(query.toStatement('sqlite')).toBe('SELECT * FROM users WHERE owner_id = ?2 AND reviewer_id = ?1')
  })

  it('preserves parameter identity when query text is modified', () => {
    const qb = new QuerybuilderTest()
    const query = qb.fetchAll({
      tableName: 'users',
      fields: ["metadata ? 'verified' AS is_verified", 'status', 'COUNT(*) AS total'],
      where: { conditions: 'status = ?1', params: ['active'] },
      groupBy: ['metadata', 'status'],
      having: { conditions: 'COUNT(*) > ?1', params: [5] },
    })

    query.query = query.query.replace('FROM users', 'FROM users /* scoped */')

    expect(query.toStatement('postgres')).toBe(
      "SELECT metadata ? 'verified' AS is_verified, status, COUNT(*) AS total FROM users /* scoped */ WHERE status = $1 GROUP BY metadata, status HAVING COUNT(*) > $2"
    )
    expect(query.arguments).toEqual(['active', 5])
  })

  it('rejects unsafe ORDER BY columns and directions', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.select('users').orderBy('id; DELETE FROM users; --').toSQL()).toThrow(InvalidConfigurationError)
    expect(() =>
      qb
        .select('users')
        .orderBy({ id: 'ASC; DELETE FROM users; --' } as any)
        .toSQL()
    ).toThrow(InvalidConfigurationError)
  })

  it('allows trusted ORDER BY expressions through Raw', () => {
    const qb = new QuerybuilderTest()

    expect(qb.select('users').orderBy(new Raw('RANDOM()')).toSQL().sql).toBe('SELECT * FROM users ORDER BY RANDOM()')
  })

  it('rejects unsafe JOIN structure', () => {
    const qb = new QuerybuilderTest()

    expect(() =>
      qb
        .select('users')
        .join({ type: 'LEFT; DELETE' as any, table: 'accounts', on: 'users.id = accounts.user_id' })
        .toSQL()
    ).toThrow(InvalidConfigurationError)
    expect(() =>
      qb.select('users').join({ table: 'accounts', on: 'users.id = accounts.user_id; DELETE FROM users' }).toSQL()
    ).toThrow(InvalidConfigurationError)
    expect(() =>
      qb.select('users').join({ table: 'accounts; DELETE', alias: 'a', on: 'users.id = a.user_id' }).toSQL()
    ).toThrow(InvalidConfigurationError)
    expect(() =>
      qb.select('users').join({ table: 'accounts', alias: 'a; DELETE', on: 'users.id = accounts.user_id' }).toSQL()
    ).toThrow(InvalidConfigurationError)
  })

  it('rejects unsafe CTE names and columns', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.select('users').with('active_users; DELETE', qb.select('users')).toSQL()).toThrow(
      InvalidConfigurationError
    )
    expect(() => qb.select('users').with('active_users', qb.select('users'), ['id; DELETE']).toSQL()).toThrow(
      InvalidConfigurationError
    )
  })

  it('rejects unsafe convenience-method columns', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.select('users').whereLike('name; DELETE FROM users; --', '%alice%')).toThrow(
      InvalidConfigurationError
    )
  })

  it('rejects unsafe write columns and conflict modes', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.insert({ tableName: 'users', data: { 'name) VALUES (1); DELETE --': 'Alice' } })).toThrow(
      InvalidConfigurationError
    )
    expect(() =>
      qb.insert({ tableName: 'users', data: { name: 'Alice' }, onConflict: 'IGNORE; DELETE' as any })
    ).toThrow(InvalidConfigurationError)
    expect(() =>
      qb.insert({
        tableName: 'users',
        data: { name: 'Alice' },
        onConflict: { column: 'email; DELETE', data: { name: 'Alice' } },
      })
    ).toThrow(InvalidConfigurationError)
    expect(() => qb.update({ tableName: 'users; DELETE', data: { name: 'Alice' } })).toThrow(InvalidConfigurationError)
    expect(() => qb.delete({ tableName: 'users; DELETE', where: 'id = 1' })).toThrow(InvalidConfigurationError)
  })

  it('rejects unsafe grouping, returning, and set operations', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.select('users').groupBy('role; DELETE').toSQL()).toThrow(InvalidConfigurationError)
    expect(() => qb.select('users').distinct(['role; DELETE']).toSQL()).toThrow(InvalidConfigurationError)
    expect(() => qb.insert({ tableName: 'users', data: { name: 'Alice' }, returning: 'id; DELETE' })).toThrow(
      InvalidConfigurationError
    )
    expect(() =>
      qb
        .fetchAll({
          tableName: 'users',
          setOperations: [{ type: 'UNION; DELETE' as any, query: { tableName: 'archived_users' } }],
        })
        .toSQL()
    ).toThrow(InvalidConfigurationError)
  })

  it('rejects unsafe limits and offsets', () => {
    const qb = new QuerybuilderTest()

    expect(() =>
      qb
        .select('users')
        .limit('1; DELETE FROM users' as any)
        .toSQL()
    ).toThrow(InvalidConfigurationError)
    expect(() => qb.select('users').offset(-1).toSQL()).toThrow(InvalidConfigurationError)
    expect(() => qb.delete({ tableName: 'users', where: 'id = 1', limit: Number.POSITIVE_INFINITY })).toThrow(
      InvalidConfigurationError
    )
  })

  it('accepts qualified, quoted, and Unicode identifiers', () => {
    const qb = new QuerybuilderTest()

    expect(qb.select('app.users').fields(['app.users.id', 'app.users.*']).toSQL().sql).toBe(
      'SELECT app.users.id, app.users.* FROM app.users'
    )
    expect(qb.select('"user records"').fields('naïve').toSQL().sql).toBe('SELECT naïve FROM "user records"')
  })
})
