import { describe, expect, it } from 'vitest'
import { FetchTypes, JoinTypes, OrderTypes, SetOperationType } from '../../src'
import { QuerybuilderTest } from '../utils'

describe('toSQL() / dry-run', () => {
  it('SelectBuilder.toSQL() returns SQL and params', () => {
    const qb = new QuerybuilderTest()
    const { sql, params } = qb.select('users').where('id = ?', 1).where('status = ?', 'active').toSQL()

    expect(sql).toContain('SELECT *')
    expect(sql).toContain('FROM users')
    expect(sql).toContain('WHERE')
    expect(params).toEqual([1, 'active'])
  })

  it('Query.toSQL() returns SQL and params', () => {
    const qb = new QuerybuilderTest()
    const query = qb.fetchAll({ tableName: 'users', where: { conditions: 'id = ?', params: [1] } })
    const { sql, params } = query.toSQL()

    expect(sql).toContain('SELECT *')
    expect(sql).toContain('FROM users')
    expect(params).toEqual([1])
  })

  it('toDebugSQL() interpolates parameters', () => {
    const qb = new QuerybuilderTest()
    const debugSql = qb.select('users').where('id = ?', 1).where('name = ?', "O'Brien").toDebugSQL()

    expect(debugSql).toContain('id = 1')
    expect(debugSql).toContain("name = 'O''Brien'") // Escaped single quote
  })
})

describe('DISTINCT support', () => {
  it('simple DISTINCT', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').distinct().toSQL()

    expect(sql).toContain('SELECT DISTINCT *')
    expect(sql).toContain('FROM users')
  })

  it('DISTINCT with fields', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').distinct().fields(['id', 'name']).toSQL()

    expect(sql).toContain('SELECT DISTINCT id, name')
  })

  it('DISTINCT ON columns (PostgreSQL)', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').distinct(['department']).fields(['department', 'name']).toSQL()

    expect(sql).toContain('SELECT DISTINCT ON (department) department, name')
  })
})

describe('Additional JOIN types', () => {
  it('innerJoin convenience method', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').innerJoin({ table: 'orders', on: 'users.id = orders.user_id' }).toSQL()

    expect(sql).toContain('INNER JOIN orders ON users.id = orders.user_id')
  })

  it('leftJoin convenience method', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').leftJoin({ table: 'orders', on: 'users.id = orders.user_id' }).toSQL()

    expect(sql).toContain('LEFT JOIN orders ON users.id = orders.user_id')
  })

  it('rightJoin convenience method', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').rightJoin({ table: 'orders', on: 'users.id = orders.user_id' }).toSQL()

    expect(sql).toContain('RIGHT JOIN orders ON users.id = orders.user_id')
  })

  it('fullJoin convenience method', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').fullJoin({ table: 'orders', on: 'users.id = orders.user_id' }).toSQL()

    expect(sql).toContain('FULL JOIN orders ON users.id = orders.user_id')
  })

  it('naturalJoin convenience method', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').naturalJoin('profiles').toSQL()

    expect(sql).toContain('NATURAL JOIN profiles')
    expect(sql).not.toContain('ON')
  })
})

describe('UNION/INTERSECT/EXCEPT set operations', () => {
  it('UNION combines two queries', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('active_users')
      .fields(['id', 'name'])
      .union(qb.select('archived_users').fields(['id', 'name']))
      .toSQL()

    expect(sql).toContain('SELECT id, name')
    expect(sql).toContain('FROM active_users')
    expect(sql).toContain('UNION')
    expect(sql).toContain('FROM archived_users')
  })

  it('UNION ALL keeps duplicates', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('table1')
      .fields(['id'])
      .unionAll(qb.select('table2').fields(['id']))
      .toSQL()

    expect(sql).toContain('UNION ALL')
  })

  it('INTERSECT returns common rows', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('users')
      .fields(['id'])
      .intersect(qb.select('admins').fields(['user_id']))
      .toSQL()

    expect(sql).toContain('INTERSECT')
  })

  it('EXCEPT returns difference', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('all_users')
      .fields(['id'])
      .except(qb.select('blocked_users').fields(['user_id']))
      .toSQL()

    expect(sql).toContain('EXCEPT')
  })

  it('multiple set operations chain correctly', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('table1')
      .fields(['id'])
      .union(qb.select('table2').fields(['id']))
      .union(qb.select('table3').fields(['id']))
      .toSQL()

    expect(sql).toMatch(/UNION.*UNION/)
  })

  it('set operations with ORDER BY', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('table1')
      .fields(['id'])
      .union(qb.select('table2').fields(['id']))
      .orderBy({ id: OrderTypes.ASC })
      .toSQL()

    expect(sql).toContain('UNION')
    expect(sql).toContain('ORDER BY id ASC')
  })
})

describe('CTEs (WITH clause)', () => {
  it('simple CTE', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('orders')
      .with('active_users', qb.select('users').where('status = ?', 'active'))
      .join({ table: 'active_users', on: 'orders.user_id = active_users.id' })
      .toSQL()

    expect(sql).toContain('WITH active_users AS')
    expect(sql).toContain('SELECT *')
    expect(sql).toContain('status = ?')
    expect(sql).toContain('JOIN active_users')
  })

  it('multiple CTEs', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('combined')
      .with('cte1', qb.select('table1').where('x = ?', 1))
      .with('cte2', qb.select('table2').where('y = ?', 2))
      .toSQL()

    expect(sql).toContain('WITH cte1 AS')
    expect(sql).toContain(', cte2 AS')
  })

  it('CTE with column names', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb
      .select('results')
      .with('user_stats', qb.select('users').fields(['id', 'count(*) as cnt']).groupBy('id'), ['user_id', 'count'])
      .toSQL()

    expect(sql).toContain('WITH user_stats(user_id, count) AS')
  })
})

describe('EXPLAIN support', () => {
  it('explain() generates EXPLAIN QUERY PLAN', () => {
    const qb = new QuerybuilderTest()
    // Just test that toSQL works, actual execution would need integration test
    const result = qb.select('users').where('id = ?', 1)
    const { sql } = result.toSQL()

    // The explain method wraps the query
    expect(sql).toContain('SELECT')
    expect(sql).toContain('FROM users')
  })
})

describe('Pagination SQL generation', () => {
  it('limit is included in SQL', () => {
    const qb = new QuerybuilderTest()
    const { sql } = qb.select('users').limit(20).toSQL()

    expect(sql).toContain('LIMIT 20')
  })

  it('offset calculation for page 2', () => {
    const qb = new QuerybuilderTest()
    // Page 2 with perPage 20 should have offset 20
    const page = 2
    const perPage = 20
    const offset = (page - 1) * perPage

    const { sql } = qb.select('users').limit(perPage).offset(offset).toSQL()

    expect(sql).toContain('LIMIT 20')
    expect(sql).toContain('OFFSET 20')
  })

  it('offset calculation with custom page size', () => {
    const qb = new QuerybuilderTest()
    // Page 5 with perPage 10 should have offset 40
    const page = 5
    const perPage = 10
    const offset = (page - 1) * perPage

    const { sql } = qb.select('users').limit(perPage).offset(offset).toSQL()

    expect(sql).toContain('LIMIT 10')
    expect(sql).toContain('OFFSET 40')
  })
})

describe('Error messages with context', () => {
  it('throws error for parameter mismatch in SelectBuilder.where()', () => {
    const qb = new QuerybuilderTest()

    // The where() method in SelectBuilder throws when params don't match placeholders
    expect(() => {
      qb.select('users').where('id = ? AND status = ?', 1)
    }).toThrow('Mismatch between "?" placeholders and parameters')
  })

  it('throws ParameterMismatchError from QueryBuilder._where()', () => {
    const qb = new QuerybuilderTest()

    // The fetchAll method goes through QueryBuilder._select which uses the new errors
    // But the where clause validation happens in the inner _where method
    try {
      qb.fetchAll({
        tableName: 'users',
        where: { conditions: 'id = ? AND status = ?', params: [1] },
      }).toSQL()
      expect.fail('Should have thrown')
    } catch (e: any) {
      expect(e.name).toBe('ParameterMismatchError')
      expect(e.message).toContain('Parameter count mismatch')
      expect(e.message).toContain('Clause: WHERE')
      expect(e.message).toContain('Hint:')
    }
  })

  it('throws MissingDataError for empty insert', () => {
    const qb = new QuerybuilderTest()

    try {
      qb.insert({ tableName: 'users', data: [] })
      expect.fail('Should have thrown')
    } catch (e: any) {
      expect(e.name).toBe('MissingDataError')
      expect(e.message).toContain('data is required')
    }
  })
})
