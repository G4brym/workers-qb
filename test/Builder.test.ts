import { QuerybuilderTest } from './utils'
import { OrderTypes } from '../src/enums'

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

    expect(query).toEqual('INSERT INTO testTable (my_field) VALUES(?1)')
  })

  test('insert multiple fields without returning', async () => {
    const query = new QuerybuilderTest()._insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
    })

    expect(query).toEqual('INSERT INTO testTable (my_field, another) VALUES(?1, ?2)')
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

    expect(query).toEqual('INSERT INTO testTable (my_field, another) VALUES(?1, ?2) RETURNING id')
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

    expect(query).toEqual('INSERT INTO testTable (my_field, another) VALUES(?1, ?2) RETURNING id, my_field')
  })

  //////
  // Update
  //////
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

    expect(query).toEqual('UPDATE testTable SET (my_field = ?2) ' + 'WHERE field = ?1')
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

    expect(query).toEqual('UPDATE testTable SET (my_field = ?2, another = ?3) ' + 'WHERE field = ?1')
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

    expect(query).toEqual('UPDATE testTable SET (my_field = ?3, another = ?4) ' + 'WHERE field = ?1 AND id = ?2')
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

    expect(query).toEqual(
      'UPDATE testTable SET (my_field = ?3, another = ?4) ' + 'WHERE field = ?1 AND id = ?2 RETURNING id'
    )
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
      'UPDATE testTable SET (my_field = ?3, another = ?4) ' + 'WHERE field = ?1 AND id = ?2 RETURNING id, field'
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

    expect(query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2 ' + 'RETURNING id')
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

    expect(query).toEqual('DELETE FROM testTable WHERE field = ?1 AND id = ?2 ' + 'RETURNING id, field')
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

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 ' + 'GROUP BY type')
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

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 ' + 'GROUP BY type, day')
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
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 ' + 'GROUP BY type HAVING COUNT(trackid) > 15'
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

    expect(query).toEqual('SELECT * FROM testTable WHERE field = ?1 AND test = ?2 ' + 'GROUP BY type ORDER BY id')
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

    expect(query).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 ' + 'GROUP BY type ORDER BY id, timestamp'
    )
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
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 ' + 'GROUP BY type ORDER BY id ASC, timestamp DESC'
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

    expect(query).toEqual(
      'SELECT * FROM testTable WHERE field = ?1 AND test = ?2 ' + 'GROUP BY type LIMIT 10 OFFSET 15'
    )
  })
})
