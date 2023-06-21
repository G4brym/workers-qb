import { QuerybuilderTest } from './utils'
import { ConflictTypes, FetchTypes, JoinTypes, OrderTypes } from '../src/enums'
import { Query, Raw } from '../src/tools'

describe('QueryBuilder', () => {
  //////
  // Insert
  //////
  test('insert one field without returning', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
      },
    })

    expect(query).toEqual('INSERT INTO testTable (my_field) VALUES (?1)')
  })

  test('insert with Raw sql values', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        created_at: new Raw('CURRENT_TIMESTAMP'),
      },
    })

    expect(query).toEqual('INSERT INTO testTable (my_field, created_at) VALUES (?1, CURRENT_TIMESTAMP)')
  })

  test('insert multiple fields without returning', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
    })

    expect(query).toEqual('INSERT INTO testTable (my_field, another) VALUES (?1, ?2)')
  })

  test('insert multiple fields with one returning', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: 'id',
    })

    expect(query).toEqual('INSERT INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id')
  })

  test('insert multiple fields with multiple returning', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: ['id', 'my_field'],
    })

    expect(query).toEqual('INSERT INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id, my_field')
  })

  test('insert on conflict ignore', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: ['id', 'my_field'],
      onConflict: ConflictTypes.IGNORE,
    })

    expect(query).toEqual('INSERT OR IGNORE INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id, my_field')
  })

  test('insert on conflict replace', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: ['id', 'my_field'],
      onConflict: 'REPLACE',
    })

    expect(query).toEqual('INSERT OR REPLACE INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id, my_field')
  })

  test('insert in bulk', async () => {
    const qb = new QuerybuilderTest()
    let execute = jest.spyOn(qb, 'execute')

    const query = qb
      .insert({
        tableName: 'testTable',
        data: [
          {
            my_field: 'test1',
            another: 123,
          },
          {
            my_field: 'test2',
            another: 456,
          },
          {
            my_field: 'test3',
            another: 789,
          },
        ],
        returning: ['id', 'my_field'],
        onConflict: 'REPLACE',
      })
      .execute()

    expect(execute).toHaveBeenCalledWith(
      new Query(
        qb.execute,
        'INSERT OR REPLACE INTO testTable (my_field, another) VALUES (?1, ?2), (?3, ?4), (?5, ?6) RETURNING id, my_field',
        ['test1', 123, 'test2', 456, 'test3', 789],
        FetchTypes.ALL
      )
    )
  })

  //////
  // Update
  //////
  test('update one field with one where and verify arguments', async () => {
    const qb = new QuerybuilderTest()
    let execute = jest.spyOn(qb, 'execute')

    qb.update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
      },
      where: {
        conditions: 'field = ?1',
        params: ['test_where'],
      },
    }).execute()

    expect(execute).toHaveBeenCalledWith(
      new Query(
        qb.execute,
        'UPDATE testTable SET my_field = ?2 WHERE field = ?1',
        ['test_where', 'test_data'],
        FetchTypes.ALL
      )
    )
  })

  test('update with Raw sql values', async () => {
    const qb = new QuerybuilderTest()
    let execute = jest.spyOn(qb, 'execute')

    qb.update({
      tableName: 'testTable',
      data: {
        my_field: 'test_data',
        updated_at: new Raw('CURRENT_TIMESTAMP'),
        another: '123',
      },
      where: {
        conditions: 'field = ?1',
        params: ['test_where'],
      },
    }).execute()

    expect(execute).toHaveBeenCalledWith(
      new Query(
        qb.execute,
        'UPDATE testTable SET my_field = ?2, updated_at = CURRENT_TIMESTAMP, another = ?3 WHERE field = ?1',
        ['test_where', 'test_data', '123'],
        FetchTypes.ALL
      )
    )
  })

  test('update one field with one where without returning', async () => {
    const query = new QuerybuilderTest()._update({
      tableName: 'testTable',
      data: {
        my_field: 'test',
      },
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(query).toEqual('UPDATE testTable SET my_field = ?2 WHERE field = ?1')
  })

  test('update multiple field with one where without returning', async () => {
    const query = new QuerybuilderTest()._update({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(query).toEqual('UPDATE testTable SET my_field = ?2, another = ?3 WHERE field = ?1')
  })

  test('update multiple field with multiple where without returning', async () => {
    const query = new QuerybuilderTest()._update({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
    })

    expect(query).toEqual('UPDATE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2')
  })

  test('update multiple field with multiple where with one returning', async () => {
    const query = new QuerybuilderTest()._update({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: 'id',
    })

    expect(query).toEqual('UPDATE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id')
  })

  test('update multiple field with multiple where with multiple returning', async () => {
    const query = new QuerybuilderTest()._update({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
    })

    expect(query).toEqual(
      'UPDATE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id, field'
    )
  })

  test('update on conflict ignore', async () => {
    const query = new QuerybuilderTest()._update({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
      onConflict: ConflictTypes.IGNORE,
    })

    expect(query).toEqual(
      'UPDATE OR IGNORE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id, field'
    )
  })

  test('update on conflict replace', async () => {
    const query = new QuerybuilderTest()._update({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 345],
      },
      returning: ['id', 'field'],
      onConflict: 'REPLACE',
    })

    expect(query).toEqual(
      'UPDATE OR REPLACE testTable SET my_field = ?3, another = ?4 WHERE field = ?1 AND id = ?2 RETURNING id, field'
    )
  })

  //////
  // Delete
  //////
  test('delete with one where without returning', async () => {
    const query = new QuerybuilderTest()._delete({
      tableName: 'testTable',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(query).toEqual('DELETE FROM testTable WHERE field = ?1')
  })

  test('delete with multiple where without returning', async () => {
    const query = new QuerybuilderTest()._delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
    })

    expect(query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2')
  })

  test('delete with multiple where with one returning', async () => {
    const query = new QuerybuilderTest()._delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: 'id',
    })

    expect(query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2 RETURNING id')
  })

  test('delete with multiple where with multiple returning', async () => {
    const query = new QuerybuilderTest()._delete({
      tableName: 'testTable',
      where: {
        conditions: ['field = ?1', 'id = ?2'],
        params: ['test', 123],
      },
      returning: ['id', 'field'],
    })

    expect(query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2 RETURNING id, field')
  })

  //////
  // Select
  //////
  test('select simple', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
    })

    expect(query).toEqual('SELECT * FROM testTable')
  })

  test('select with one where', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: 'field = ?1',
        params: ['test'],
      },
    })

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1')
  })

  test('select with simple join', async () => {
    const query = new QuerybuilderTest()._select({
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

    expect(query).toEqual(
      'SELECT * FROM testTable JOIN employees ON testTable.employee_id = employees.id ' + 'WHERE field = ?1'
    )
  })

  test('select with multiple joins', async () => {
    const query = new QuerybuilderTest()._select({
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

    expect(query).toEqual(
      'SELECT * FROM testTable' +
        ' JOIN employees ON testTable.employee_id = employees.id' +
        ' JOIN offices ON testTable.office_id = offices.id' +
        ' WHERE field = ?1'
    )
  })

  test('select with left join', async () => {
    const query = new QuerybuilderTest()._select({
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

    expect(query).toEqual(
      'SELECT * FROM testTable LEFT JOIN employees ON testTable.employee_id = employees.id ' + 'WHERE field = ?1'
    )
  })

  test('select with subquery join', async () => {
    const query = new QuerybuilderTest()._select({
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

    expect(query).toEqual(
      'SELECT * FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) AS attributes FROM otherTable GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.test_table_id WHERE field = ?1'
    )
  })

  test('select with nested subquery joins', async () => {
    const query = new QuerybuilderTest()._select({
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

    expect(query).toEqual(
      'SELECT * FROM testTable JOIN (SELECT test_table_id, GROUP_CONCAT(attribute) AS attributes, GROUP_CONCAT(other_attributes, ";") AS other_attributes FROM otherTable JOIN (SELECT other_table_id, GROUP_CONCAT(other_attribute) AS other_attributes FROM otherTableTwo GROUP BY other_table_id) AS otherTableTwoGrouped ON otherTable.id = otherTableTwoGrouped.other_table_id GROUP BY test_table_id) AS otherTableGrouped ON testTable.id = otherTableGrouped.test_table_id WHERE field = ?1'
    )
  })

  test('select with one where no parameters', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: "field = 'test'",
      },
    })

    expect(query).toEqual("SELECT * FROM testTable WHERE field = 'test'")
  })

  test('select with multiple where', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
    })

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2')
  })

  test('select with multiple where and one group by', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
    })

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type')
  })

  test('select with multiple where and multiple group by', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: ['type', 'day'],
    })

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type, day')
  })

  test('select with multiple where and one group by and having', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      having: 'COUNT(trackid) > 15',
    })

    expect(query).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type HAVING COUNT(trackid) > 15'
    )
  })

  test('select with multiple where and one group by and one order by', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      orderBy: 'id',
    })

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id')
  })

  test('select with multiple where and one group by and multiple order by', async () => {
    const query = new QuerybuilderTest()._select({
      tableName: 'testTable',
      fields: '*',
      where: {
        conditions: ['field = ?1', 'test = ?2'],
        params: ['test', 123],
      },
      groupBy: 'type',
      orderBy: ['id', 'timestamp'],
    })

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id, timestamp')
  })

  test('select with multiple where and one group by and object order by', async () => {
    const query = new QuerybuilderTest()._select({
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

    expect(query).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type ORDER BY id ASC, timestamp DESC'
    )
  })

  test('select with multiple where and one group by and limit and offset', async () => {
    const query = new QuerybuilderTest()._select({
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

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 GROUP BY type LIMIT 10 OFFSET 15')
  })
})
