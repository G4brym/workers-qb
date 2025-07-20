import { describe, expect, it } from 'vitest'
import { QuerybuilderTest } from '../utils'

describe('Subqueries using SelectBuilder instance', () => {
  it('column IN (subquery) - passing SelectBuilder directly', () => {
    const sub = new QuerybuilderTest().select('allowed_ids').fields('id')
    const q = new QuerybuilderTest().select('users').where('id IN ?', [sub]).getQueryAll()

    expect(q.query).toEqual('SELECT * FROM users WHERE id IN (SELECT id FROM allowed_ids)')
    expect(q.arguments).toEqual([])
  })

  it('column IN (subquery) - subquery with parameters', () => {
    const sub = new QuerybuilderTest().select('projects').fields('id').where('status = ?', 'active')
    const q = new QuerybuilderTest().select('tasks').where('project_id IN ?', [sub]).getQueryAll()

    expect(q.query).toEqual('SELECT * FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE status = ?)')
    expect(q.arguments).toEqual(['active'])
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
