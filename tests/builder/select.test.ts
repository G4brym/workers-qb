import { QuerybuilderTest, trimQuery } from '../utils'
import { JoinTypes, OrderTypes } from '../../src/enums'

describe('Select Builder', () => {
  test('select simple', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
      }),
      new QuerybuilderTest().select('testTable').fields('*').getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable')
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select fields default value', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
      }),
      new QuerybuilderTest().select('testTable').getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable')
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select fields default value one', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
      }),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable LIMIT 1')
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ONE')
    }
  })

  test('select with one where', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: 'field = ?1',
          params: ['test'],
        },
      }),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = ?1 LIMIT 1')
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ONE')
    }
  })

  test('select with simplified where', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: 'field = true',
      }),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = true LIMIT 1')
      expect(result.arguments).toEqual(undefined)
      expect(result.fetchType).toEqual('ONE')
    }
  })

  test('select with empty where', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        // @ts-ignore
        where: null,
      }),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable LIMIT 1')
      expect(result.arguments).toEqual(undefined)
      expect(result.fetchType).toEqual('ONE')
    }
  })

  test('select with empty where 2', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: [],
          params: [],
        },
      }),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable LIMIT 1')
      expect(result.arguments).toEqual([])
      expect(result.fetchType).toEqual('ONE')
    }
  })

  test('select with simplified where list', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: ['field = true', 'active = false'],
      }),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = true AND active = false LIMIT 1')
      expect(result.arguments).toEqual(undefined)
      expect(result.fetchType).toEqual('ONE')
    }
  })

  test('select with simple join', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
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
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .join({ table: 'employees', on: 'testTable.employee_id = employees.id' })
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable JOIN employees ON testTable.employee_id = employees.id ' + 'WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple joins', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
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
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .join({ table: 'employees', on: 'testTable.employee_id = employees.id' })
        .join({ table: 'offices', on: 'testTable.office_id = offices.id' })
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable' +
          ' JOIN employees ON testTable.employee_id = employees.id' +
          ' JOIN offices ON testTable.office_id = offices.id' +
          ' WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with left join', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: ['id', 'name'],
        where: {
          conditions: 'field = ?1',
          params: ['test'],
        },
        join: {
          type: JoinTypes.LEFT,
          table: 'employees',
          on: 'testTable.employee_id = employees.id',
        },
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields(['id', 'name'])
        .where('field = ?1', 'test')
        .join({ type: JoinTypes.LEFT, table: 'employees', on: 'testTable.employee_id = employees.id' })
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT id, name FROM testTable LEFT JOIN employees ON testTable.employee_id = employees.id WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with subquery join', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
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
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .join({
          table: {
            tableName: 'otherTable',
            fields: ['test_table_id', 'GROUP_CONCAT(attribute) AS attributes'],
            groupBy: 'test_table_id',
          },
          on: 'testTable.id = otherTableGrouped.test_table_id',
          alias: 'otherTableGrouped',
        })
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) ' +
          'AS attributes FROM otherTable GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.' +
          'test_table_id WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with nested subquery joins', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
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
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .join({
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
        })
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) ' +
          'AS attributes, GROUP_CONCAT(other_attributes, ";") AS other_attributes FROM otherTable JOIN ' +
          '(SELECT other_table_id, GROUP_CONCAT(other_attribute) AS other_attributes FROM otherTableTwo ' +
          'GROUP BY other_table_id) AS otherTableTwoGrouped ON otherTable.id = otherTableTwoGrouped.other_table_id ' +
          'GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.test_table_id WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with one where no parameters', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: "field = 'test'",
        },
      }),
    ]) {
      expect(trimQuery(result.query)).toEqual("SELECT * FROM testTable WHERE field = 'test' LIMIT 1")
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ONE')
    }
  })

  test('select with multiple where', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?', 'test = ?'],
          params: ['test', 123],
        },
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?', 'test')
        .where('test = ?', 123)
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = ? AND test = ?')
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and one group by', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1', 'test = ?2'],
          params: ['test', 123],
        },
        groupBy: 'type',
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type')
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and multiple group by', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1', 'test = ?2'],
          params: ['test', 123],
        },
        groupBy: ['type', 'day'],
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .groupBy('day')
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type, day'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and one group by and having', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1', 'test = ?2'],
          params: ['test', 123],
        },
        groupBy: 'type',
        having: 'COUNT(trackid) > 15',
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .having('COUNT(trackid) > 15')
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type HAVING COUNT(trackid) > 15'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and one group by and multiple having', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1', 'test = ?2'],
          params: ['test', 123],
        },
        groupBy: 'type',
        having: ['COUNT(trackid) > 15', 'COUNT(trackid) < 30'],
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .having('COUNT(trackid) > 15')
        .having('COUNT(trackid) < 30')
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type HAVING COUNT(trackid) > 15 AND COUNT(trackid) < 30'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and one group by and one order by', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1', 'test = ?2'],
          params: ['test', 123],
        },
        groupBy: 'type',
        orderBy: 'id',
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .orderBy('id')
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and one group by and multiple order by', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1', 'test = ?2'],
          params: ['test', 123],
        },
        groupBy: 'type',
        orderBy: ['id', 'timestamp'],
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .orderBy('id')
        .orderBy('timestamp')
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id, timestamp'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and one group by and object order by', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
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
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .orderBy({ id: 'ASC' })
        .orderBy({ timestamp: OrderTypes.DESC })
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id ASC, timestamp DESC'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  test('select with multiple where and one group by and limit and offset', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1', 'test = ?2'],
          params: ['test', 123],
        },
        groupBy: 'type',
        limit: 10,
        offset: 15,
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .where('test = ?2', 123)
        .groupBy('type')
        .limit(10)
        .offset(15)
        .getQuery(),
    ]) {
      expect(trimQuery(result.query)).toEqual(
        'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type LIMIT 10 OFFSET 15'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })
})
