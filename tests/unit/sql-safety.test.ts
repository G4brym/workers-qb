import { describe, expect, it } from 'vitest'
import { InvalidConfigurationError, Raw } from '../../src'
import { QuerybuilderTest } from '../utils'

describe('SQL fragment safety', () => {
  it('rejects unsafe table names', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.select('users; DELETE FROM users; --').toSQL()).toThrow(InvalidConfigurationError)
  })

  it('requires Raw for field expressions', () => {
    const qb = new QuerybuilderTest()

    expect(() => qb.select('users').fields('COUNT(*) AS total').toSQL()).toThrow(InvalidConfigurationError)
    expect(qb.select('users').fields(new Raw('COUNT(*) AS total')).toSQL().sql).toBe(
      'SELECT COUNT(*) AS total FROM users'
    )
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
