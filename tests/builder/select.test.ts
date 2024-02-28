import { QuerybuilderTest, trimQuery } from '../utils'
import { JoinTypes, OrderTypes } from '../../src/enums'

describe('Select Builder', () => {
  test('select simple', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
    })

    expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable')
    expect(result.arguments).toBeUndefined()
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with one where', async () => {
    const result = new QuerybuilderTest().fetchOne({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = ?1 LIMIT 1')
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ONE')
  })

  test('select with simple join', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
      join: {
        table: 'employees',
        on: 'testTable.employee_id = employees.id',
      },
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable JOIN employees ON testTable.employee_id = employees.id ' + 'WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple joins', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
      join: [
        {
          table: 'employees',
          on: 'testTable.employee_id = employees.id',
        },
        {
          table: 'offices',
          on: 'testTable.office_id = offices.id',
        },
      ],
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable' +
        ' JOIN employees ON testTable.employee_id = employees.id' +
        ' JOIN offices ON testTable.office_id = offices.id' +
        ' WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with left join', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
      join: {
        type: JoinTypes.LEFT,
        table: 'employees',
        on: 'testTable.employee_id = employees.id',
      },
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable LEFT JOIN employees ON testTable.employee_id = employees.id WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with subquery join', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
      join: {
        table: {
          tableName: 'otherTable',
          fields: ['test_table_id', 'GROUP_CONCAT(attribute) AS attributes'],
          groupBy: 'test_table_id',
        },
        on: 'testTable.id = otherTableGrouped.test_table_id',
        alias: 'otherTableGrouped',
      },
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) ' +
        'AS attributes FROM otherTable GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.' +
        'test_table_id WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with nested subquery joins', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
      join: {
        table: {
          tableName: 'otherTable',
          fields: [
            'test_table_id',
            'GROUP_CONCAT(attribute) AS attributes',
            'GROUP_CONCAT(other_attributes, ";") AS other_attributes',
          ],
          groupBy: 'test_table_id',
          join: {
            table: {
              tableName: 'otherTableTwo',
              fields: ['other_table_id', 'GROUP_CONCAT(other_attribute) AS other_attributes'],
              groupBy: 'other_table_id',
            },
            on: 'otherTable.id = otherTableTwoGrouped.other_table_id',
            alias: 'otherTableTwoGrouped',
          },
        },
        on: 'testTable.id = otherTableGrouped.test_table_id',
        alias: 'otherTableGrouped',
      },
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) ' +
        'AS attributes, GROUP_CONCAT(other_attributes, ";") AS other_attributes FROM otherTable JOIN ' +
        '(SELECT other_table_id, GROUP_CONCAT(other_attribute) AS other_attributes FROM otherTableTwo ' +
        'GROUP BY other_table_id) AS otherTableTwoGrouped ON otherTable.id = otherTableTwoGrouped.other_table_id ' +
        'GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.test_table_id WHERE field = ?1'
    )
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with one where no parameters', async () => {
    const result = new QuerybuilderTest().fetchOne({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: "field = 'test'",
      },
    })

    expect(trimQuery(result.query)).toEqual("SELECT * FROM testTable WHERE field = 'test' LIMIT 1")
    expect(result.arguments).toBeUndefined()
    expect(result.fetchType).toEqual('ONE')
  })

  test('select with multiple where', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
    })

    expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple where and one group by', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
    })

    expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple where and multiple group by', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: ['type', 'day'],
    })

    expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type, day')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple where and one group by and having', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      having: 'COUNT(trackid) > 15',
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type HAVING COUNT(trackid) > 15'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple where and one group by and one order by', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      orderBy: 'id',
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple where and one group by and multiple order by', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      orderBy: ['id', 'timestamp'],
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id, timestamp'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple where and one group by and object order by', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      orderBy: {
        id: 'ASC',
        timestamp: OrderTypes.DESC,
      },
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id ASC, timestamp DESC'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })

  test('select with multiple where and one group by and limit and offset', async () => {
    const result = new QuerybuilderTest().fetchAll({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      limit: 10,
      offset: 15,
    })

    expect(trimQuery(result.query)).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type LIMIT 10 OFFSET 15'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ALL')
  })
})
