import { describe, expect, it } from 'vitest'
import { QuerybuilderTest } from '../utils'

describe('Subqueries using SelectBuilder instance', () => {
  it('column IN (subquery) - passing SelectBuilder directly', () => {
    const sub = new QuerybuilderTest().select('allowed_ids').fields('id')
    const q = new QuerybuilderTest().select('users').where('id IN ?', sub).getQueryAll()

    expect(q.query).toEqual('SELECT * FROM users WHERE id IN (SELECT id FROM allowed_ids)')
    expect(q.arguments).toEqual([])
  })

  it('column IN (subquery) - subquery with parameters', () => {
    const sub = new QuerybuilderTest().select('projects').fields('id').where('status = ?', 'active')
    const q = new QuerybuilderTest().select('tasks').where('project_id IN ?', sub).getQueryAll()

    expect(q.query).toEqual('SELECT * FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE status = ?)')
    expect(q.arguments).toEqual(['active'])
  })

  it('column IN (subquery) - using an inline function', () => {
    const q = new QuerybuilderTest()
      .select('tasks')
      .where('project_id IN ?', (qb) => qb.select('projects').fields('id').where('status = ?', 'active'))
      .getQueryAll()

    expect(q.query).toEqual('SELECT * FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE status = ?)')
    expect(q.arguments).toEqual(['active'])
  })

  it('EXISTS (subquery)', () => {
    const sub = new QuerybuilderTest().select('permissions').where('user_id = ?', 100).where('action = ?', 'edit')
    const q = new QuerybuilderTest().select('documents').where('EXISTS ?', sub).getQueryAll()

    expect(q.query).toEqual('SELECT * FROM documents WHERE EXISTS (SELECT * FROM permissions WHERE user_id = ? AND action = ?)')
    expect(q.arguments).toEqual([100, 'edit'])
  })

  it('Scalar subquery', () => {
    const sub = new QuerybuilderTest().select('settings').fields('value').where('key = ?', 'default_role').limit(1)
    const q = new QuerybuilderTest().select('users').where('role_id = ?', sub).getQueryAll()

    expect(q.query).toEqual('SELECT * FROM users WHERE role_id = (SELECT value FROM settings WHERE key = ? LIMIT 1)')
    expect(q.arguments).toEqual(['default_role'])
  })

  it('Subquery in a HAVING clause', () => {
    const sub = new QuerybuilderTest()
      .select('orders')
      .fields('customer_id')
      .groupBy('customer_id')
      .having('SUM(total) > ?', 1000)
    const q = new QuerybuilderTest()
      .select('customers')
      .fields(['id', 'name'])
      .having('id IN ?', sub)
      .getQueryAll()

    expect(q.query).toEqual(
      'SELECT id, name FROM customers HAVING id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(total) > ?)'
    )
    expect(q.arguments).toEqual([1000])
  })

  it('Subquery in a JOIN clause', () => {
    const subquery = new QuerybuilderTest()
      .select('orders')
      .fields(['customer_id', 'COUNT(id) as order_count'])
      .groupBy('customer_id')

    const query = new QuerybuilderTest()
      .select('customers')
      .fields(['customers.name', 'oc.order_count'])
      .join({
        table: subquery,
        alias: 'oc',
        on: 'customers.id = oc.customer_id',
      })
      .getQueryAll()

    expect(query.query).toEqual(
      'SELECT customers.name, oc.order_count FROM customers' +
        ' JOIN (SELECT customer_id, COUNT(id) as order_count FROM orders GROUP BY customer_id) AS oc' +
        ' ON customers.id = oc.customer_id'
    )
    expect(query.arguments).toEqual([])
  })

  it('Subquery in a JOIN clause with params', () => {
    const subquery = new QuerybuilderTest()
      .select('orders')
      .fields(['customer_id', 'COUNT(id) as order_count'])
      .where('status = ?', 'completed')
      .groupBy('customer_id')

    const query = new QuerybuilderTest()
      .select('customers')
      .fields(['customers.name', 'oc.order_count'])
      .join({
        table: subquery,
        alias: 'oc',
        on: 'customers.id = oc.customer_id',
      })
      .getQueryAll()

    expect(query.query).toEqual(
      'SELECT customers.name, oc.order_count FROM customers' +
        ' JOIN (SELECT customer_id, COUNT(id) as order_count FROM orders WHERE status = ? GROUP BY customer_id) AS oc' +
        ' ON customers.id = oc.customer_id'
    )
    expect(query.arguments).toEqual(['completed'])
  })
})
