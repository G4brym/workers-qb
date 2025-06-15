import { describe, expect, it } from 'vitest'
import { JoinTypes, OrderTypes } from '../../src/enums'
import { QuerybuilderTest } from '../utils'

describe('Select Builder', () => {
  it('select simple', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
      }),
      new QuerybuilderTest().select('testTable').fields('*').getQueryAll(),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable')
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select fields default value', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
      }),
      new QuerybuilderTest().select('testTable').getQueryAll(),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable')
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select fields default value one', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
      }),
      new QuerybuilderTest().select('testTable').getQueryOne(),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable LIMIT 1')
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ONE')
    }
  })

  it('select with one where', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: 'field = ?',
          params: ['test'],
        },
      }),
      new QuerybuilderTest().select('testTable').where('field = ?', 'test').getQueryOne(),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable WHERE field = ? LIMIT 1')
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ONE')
    }
  })

  it('select with simplified where', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: 'field = true',
      }),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable WHERE field = true LIMIT 1')
      expect(result.arguments).toEqual(undefined)
      expect(result.fetchType).toEqual('ONE')
    }
  })

  it('select with empty where', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        // @ts-ignore
        where: null,
      }),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable LIMIT 1')
      expect(result.arguments).toEqual(undefined)
      expect(result.fetchType).toEqual('ONE')
    }
  })

  it('select with empty where 2', async () => {
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
      expect(result.query).toEqual('SELECT * FROM testTable LIMIT 1')
      expect(result.arguments).toEqual([])
      expect(result.fetchType).toEqual('ONE')
    }
  })

  it('count with empty where 2', async () => {
    for (const result of [
      await new QuerybuilderTest()
        .fetchOne({
          tableName: 'testTable',
          fields: '*',
          where: {
            conditions: [],
            params: [],
          },
        })
        .count(),
    ]) {
      expect((result.results as any).query).toEqual('SELECT count(*) as total FROM testTable LIMIT 1')
      expect((result.results as any).arguments).toEqual([])
      expect((result.results as any).fetchType).toEqual('ONE')
    }
  })

  it('count from fetchOne with offset defined', async () => {
    for (const result of [
      await new QuerybuilderTest()
        .fetchOne({
          tableName: 'testTable',
          fields: '*',
          where: {
            conditions: [],
            params: [],
          },
          offset: 3,
        })
        .count(),
    ]) {
      expect((result.results as any).query).toEqual('SELECT count(*) as total FROM testTable LIMIT 1')
      expect((result.results as any).arguments).toEqual([])
      expect((result.results as any).fetchType).toEqual('ONE')
    }
  })

  it('count from fetchAll with offset defined', async () => {
    for (const result of [
      await new QuerybuilderTest()
        .fetchAll({
          tableName: 'testTable',
          offset: 4,
        })
        .count(),
    ]) {
      expect((result.results as any).query).toEqual('SELECT count(*) as total FROM testTable LIMIT 1')
      expect((result.results as any).arguments).toEqual(undefined)
      expect((result.results as any).fetchType).toEqual('ONE')
    }
  })

  it('count should remove group by', async () => {
    for (const result of [
      await new QuerybuilderTest()
        .fetchAll({
          tableName: 'testTable',
          offset: 4,
          groupBy: ['field'],
        })
        .count(),
    ]) {
      expect((result.results as any).query).toEqual('SELECT count(*) as total FROM testTable LIMIT 1')
      expect((result.results as any).arguments).toEqual(undefined)
      expect((result.results as any).fetchType).toEqual('ONE')
    }
  })

  it('select with simplified where list', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: ['field = true', 'active = false'],
      }),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable WHERE (field = true) AND (active = false) LIMIT 1')
      expect(result.arguments).toEqual(undefined)
      expect(result.fetchType).toEqual('ONE')
    }
  })

  it('select with simple join', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable JOIN employees ON testTable.employee_id = employees.id ' + 'WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple joins', async () => {
    for (const result of [
      await new QuerybuilderTest()
        .fetchAll({
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
        .execute(),
      await new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .join({ table: 'employees', on: 'testTable.employee_id = employees.id' })
        .join({ table: 'offices', on: 'testTable.office_id = offices.id' })
        .execute(),
    ]) {
      expect((result.results as any).query).toEqual(
        'SELECT * FROM testTable' +
          ' JOIN employees ON testTable.employee_id = employees.id' +
          ' JOIN offices ON testTable.office_id = offices.id' +
          ' WHERE field = ?1'
      )
      expect((result.results as any).arguments).toEqual(['test'])
      expect((result.results as any).fetchType).toEqual('ALL')
    }
  })

  it('count with multiple joins', async () => {
    for (const result of [
      await new QuerybuilderTest()
        .fetchAll({
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
        .count(),
      await new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1', 'test')
        .join({ table: 'employees', on: 'testTable.employee_id = employees.id' })
        .join({ table: 'offices', on: 'testTable.office_id = offices.id' })
        .count(),
    ]) {
      expect((result.results as any).query).toEqual(
        'SELECT count(*) as total FROM testTable' +
          ' JOIN employees ON testTable.employee_id = employees.id' +
          ' JOIN offices ON testTable.office_id = offices.id' +
          ' WHERE field = ?1 LIMIT 1'
      )
      expect((result.results as any).arguments).toEqual(['test'])
      expect((result.results as any).fetchType).toEqual('ONE')
    }
  })

  it('select with left join', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT id, name FROM testTable LEFT JOIN employees ON testTable.employee_id = employees.id WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with subquery join', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) ' +
          'AS attributes FROM otherTable GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.' +
          'test_table_id WHERE field = ?1'
      )
      expect(result.arguments).toEqual(['test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('count with subquery join', async () => {
    for (const result of [
      await new QuerybuilderTest()
        .fetchAll({
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
        .count(),
      await new QuerybuilderTest()
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
        .count(),
    ]) {
      expect((result.results as any).query).toEqual(
        'SELECT count(*) as total FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) ' +
          'AS attributes FROM otherTable GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.' +
          'test_table_id WHERE field = ?1 LIMIT 1'
      )
      expect((result.results as any).arguments).toEqual(['test'])
      expect((result.results as any).fetchType).toEqual('ONE')
    }
  })

  it('select with nested subquery joins', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
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

  it('select with one where no parameters', async () => {
    for (const result of [
      new QuerybuilderTest().fetchOne({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: "field = 'test'",
        },
      }),
    ]) {
      expect(result.query).toEqual("SELECT * FROM testTable WHERE field = 'test' LIMIT 1")
      expect(result.arguments).toBeUndefined()
      expect(result.fetchType).toEqual('ONE')
    }
  })

  it('select with multiple where', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable WHERE (field = ?) AND (test = ?)')
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and one group by', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type')
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and multiple group by', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual('SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type, day')
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and one group by and having', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type HAVING COUNT(trackid) > 15'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and one group by and multiple having', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type HAVING COUNT(trackid) > 15 AND COUNT(trackid) < 30'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and one group by and one order by', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type ORDER BY id'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and one group by and multiple order by', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type ORDER BY id, timestamp'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and one group by and object order by', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type ORDER BY id ASC, timestamp DESC'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where and one group by and limit and offset', async () => {
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
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable WHERE (field = ?1) AND (test = ?2) GROUP BY type LIMIT 10 OFFSET 15'
      )
      expect(result.arguments).toEqual(['test', 123])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select with multiple where with OR conditions', async () => {
    for (const result of [
      new QuerybuilderTest().fetchAll({
        tableName: 'testTable',
        fields: '*',
        where: {
          conditions: ['field = ?1 OR test = ?2', 'test = ?3 OR field = ?4'],
          params: ['test', 123, 456, 'test'],
        },
      }),
      new QuerybuilderTest()
        .select('testTable')
        .fields('*')
        .where('field = ?1 OR test = ?2', ['test', 123])
        .where('test = ?3 OR field = ?4', [456, 'test'])
        .getQueryAll(),
    ]) {
      expect(result.query).toEqual(
        'SELECT * FROM testTable WHERE (field = ?1 OR test = ?2) AND (test = ?3 OR field = ?4)'
      )
      expect(result.arguments).toEqual(['test', 123, 456, 'test'])
      expect(result.fetchType).toEqual('ALL')
    }
  })

  it('select whereIn single field', async () => {
    const result = new QuerybuilderTest().select('testTable').whereIn('field', [1, 2, 3, 4]).getQueryAll()

    expect(result.query).toEqual('SELECT * FROM testTable WHERE (field) IN (VALUES (?), (?), (?), (?))')
    expect(result.arguments).toEqual([1, 2, 3, 4])
    expect(result.fetchType).toEqual('ALL')
  })

  it('select whereIn multiple fields', async () => {
    const result = new QuerybuilderTest()
      .select('testTable')
      .whereIn(
        ['field', 'test'],
        [
          ['somebody', 1],
          ['once', 2],
          ['told', 3],
          ['me', 4],
        ]
      )
      .getQueryAll()

    expect(result.query).toEqual(
      'SELECT * FROM testTable WHERE (field, test) IN (VALUES (?, ?), (?, ?), (?, ?), (?, ?))'
    )
    expect(result.arguments).toEqual(['somebody', 1, 'once', 2, 'told', 3, 'me', 4])
    expect(result.fetchType).toEqual('ALL')
  })

  it('select whereIn multiple fields with another where', async () => {
    const result = new QuerybuilderTest()
      .select('testTable')
      .where('commited = ?', 1)
      .whereIn(
        ['field', 'test'],
        [
          ['somebody', 1],
          ['once', 2],
          ['told', 3],
          ['me', 4],
        ]
      )
      .getQueryAll()

    expect(result.query).toEqual(
      'SELECT * FROM testTable WHERE (commited = ?) AND ((field, test) IN (VALUES (?, ?), (?, ?), (?, ?), (?, ?)))'
    )
    expect(result.arguments).toEqual([1, 'somebody', 1, 'once', 2, 'told', 3, 'me', 4])
    expect(result.fetchType).toEqual('ALL')

    const result2 = new QuerybuilderTest()
      .select('testTable')
      .whereIn(
        ['field', 'test'],
        [
          ['somebody', 1],
          ['once', 2],
          ['told', 3],
          ['me', 4],
        ]
      )
      .where('commited = ?', 1)
      .getQueryAll()

    expect(result2.query).toEqual(
      'SELECT * FROM testTable WHERE ((field, test) IN (VALUES (?, ?), (?, ?), (?, ?), (?, ?))) AND (commited = ?)'
    )
    expect(result2.arguments).toEqual(['somebody', 1, 'once', 2, 'told', 3, 'me', 4, 1])
    expect(result2.fetchType).toEqual('ALL')
  })

  it('select whereIn with SelectBuilder instance as subquery', () => {
    const qb = new QuerybuilderTest()
    const subQuery = qb.select('anotherTable').fields('id').where('status = ?', 'active')
    const result = qb.select('testTable').where('val = ?', 10).whereIn('fk_id', subQuery).getQueryAll()

    expect(result.query).toEqual(
      'SELECT * FROM testTable WHERE (val = ?) AND (fk_id IN (SELECT id FROM anotherTable WHERE status = ?))'
    )
    expect(result.arguments).toEqual([10, 'active'])
    expect(result.fetchType).toEqual('ALL')

    const resultOne = qb.select('testTable').where('val = ?', 10).whereIn('fk_id', subQuery).getQueryOne()
    expect(resultOne.query).toEqual(
      'SELECT * FROM testTable WHERE (val = ?) AND (fk_id IN (SELECT id FROM anotherTable WHERE status = ?)) LIMIT 1'
    )
    expect(resultOne.arguments).toEqual([10, 'active'])
    expect(resultOne.fetchType).toEqual('ONE')
  })

  it('select whereIn with SelectBuilder (multiple columns) as subquery', () => {
    const qb = new QuerybuilderTest()
    const subQuery = qb.select('subTable').fields(['fk1', 'fk2']).where('state = ?', 'CA')
    const result = qb.select('mainTable').whereIn(['m_fk1', 'm_fk2'], subQuery).getQueryAll()

    expect(result.query).toEqual(
      'SELECT * FROM mainTable WHERE (m_fk1, m_fk2) IN (SELECT fk1, fk2 FROM subTable WHERE state = ?)'
    )
    expect(result.arguments).toEqual(['CA'])
    expect(result.fetchType).toEqual('ALL')
  })

  it('select whereIn subquery with its own arguments', () => {
    const qb = new QuerybuilderTest()
    const subQuery = qb.select('logs').fields('user_id').where('action = ?', 'login').where('time > ?', 1000)
    const result = qb.select('users').where('company_id = ?', 123).whereIn('id', subQuery).orderBy('name').getQueryAll()

    expect(result.query).toEqual(
      'SELECT * FROM users WHERE (company_id = ?) AND (id IN (SELECT user_id FROM logs WHERE (action = ?) AND (time > ?))) ORDER BY name'
    )
    expect(result.arguments).toEqual([123, 'login', 1000])
    expect(result.fetchType).toEqual('ALL')
  })
})
