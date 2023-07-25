import { QuerybuilderTest } from '../utils'
import { ConflictTypes } from '../../src/enums'
import { Raw } from '../../src/tools'

describe('Insert Builder', () => {
  test('insert one field without returning', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
      },
    })

    expect(result.query).toEqual('INSERT INTO testTable (my_field) VALUES (?1)')
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ONE')
  })

  test('insert with Raw sql values', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        created_at: new Raw('CURRENT_TIMESTAMP'),
      },
    })

    expect(result.query).toEqual('INSERT INTO testTable (my_field, created_at) VALUES (?1, CURRENT_TIMESTAMP)')
    expect(result.arguments).toEqual(['test'])
    expect(result.fetchType).toEqual('ONE')
  })

  test('insert multiple fields without returning', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
    })

    expect(result.query).toEqual('INSERT INTO testTable (my_field, another) VALUES (?1, ?2)')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ONE')
  })

  test('insert multiple fields with one returning', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: 'id',
    })

    expect(result.query).toEqual('INSERT INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ONE')
  })

  test('insert multiple fields with multiple returning', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: ['id', 'my_field'],
    })

    expect(result.query).toEqual('INSERT INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id, my_field')
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ONE')
  })

  test('insert on conflict ignore', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: ['id', 'my_field'],
      onConflict: ConflictTypes.IGNORE,
    })

    expect(result.query).toEqual(
      'INSERT OR IGNORE INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id, my_field'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ONE')
  })

  test('insert on conflict replace', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'testTable',
      data: {
        my_field: 'test',
        another: 123,
      },
      returning: ['id', 'my_field'],
      onConflict: 'REPLACE',
    })

    expect(result.query).toEqual(
      'INSERT OR REPLACE INTO testTable (my_field, another) VALUES (?1, ?2) RETURNING id, my_field'
    )
    expect(result.arguments).toEqual(['test', 123])
    expect(result.fetchType).toEqual('ONE')
  })

  test('insert in bulk', async () => {
    const result = new QuerybuilderTest().insert({
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

    expect(result.query).toEqual(
      'INSERT OR REPLACE INTO testTable (my_field, another) VALUES (?1, ?2), (?3, ?4), (?5, ?6) RETURNING id, my_field'
    )
    expect(result.arguments).toEqual(['test1', 123, 'test2', 456, 'test3', 789])
    expect(result.fetchType).toEqual('ALL')
  })

  test('upsert', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'phonebook2',
      data: {
        name: 'Alice',
        phonenumber: '704-555-1212',
        validDate: '2018-05-08',
      },
      onConflict: {
        column: 'name',
        data: {
          phonenumber: 'excluded.phonenumber',
          validDate: 'excluded.validDate',
        },
      },
    })

    expect(result.query).toEqual(
      'INSERT INTO phonebook2 (name, phonenumber, validDate) VALUES (?3, ?4, ?5) ON CONFLICT (name) DO ' +
        'UPDATE SET phonenumber = ?1, validDate = ?2'
    )
    expect(result.arguments).toEqual([
      'excluded.phonenumber',
      'excluded.validDate',
      'Alice',
      '704-555-1212',
      '2018-05-08',
    ])
    expect(result.fetchType).toEqual('ONE')
  })

  test('upsert with where', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'phonebook2',
      data: {
        name: 'Alice',
        phonenumber: '704-555-1212',
        validDate: '2018-05-08',
      },
      onConflict: {
        column: 'name',
        data: {
          phonenumber: 'excluded.phonenumber',
          validDate: 'excluded.validDate',
        },
        where: {
          conditions: 'excluded.validDate > ?1',
          params: ['2023-01-01'],
        },
      },
    })

    expect(result.query).toEqual(
      'INSERT INTO phonebook2 (name, phonenumber, validDate) VALUES (?4, ?5, ?6) ON CONFLICT (name) DO ' +
        'UPDATE SET phonenumber = ?2, validDate = ?3 WHERE excluded.validDate > ?1'
    )
    expect(result.arguments).toEqual([
      '2023-01-01',
      'excluded.phonenumber',
      'excluded.validDate',
      'Alice',
      '704-555-1212',
      '2018-05-08',
    ])
    expect(result.fetchType).toEqual('ONE')
  })

  test('upsert with inline where', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'phonebook2',
      data: {
        name: 'Alice',
        phonenumber: '704-555-1212',
        validDate: '2018-05-08',
      },
      onConflict: {
        column: 'name',
        data: {
          phonenumber: 'excluded.phonenumber',
          validDate: 'excluded.validDate',
        },
        where: {
          conditions: 'excluded.validDate > phonebook2.validDate',
        },
      },
    })

    expect(result.query).toEqual(
      'INSERT INTO phonebook2 (name, phonenumber, validDate) VALUES (?3, ?4, ?5) ON CONFLICT (name) DO ' +
        'UPDATE SET phonenumber = ?1, validDate = ?2 WHERE excluded.validDate > phonebook2.validDate'
    )
    expect(result.arguments).toEqual([
      'excluded.phonenumber',
      'excluded.validDate',
      'Alice',
      '704-555-1212',
      '2018-05-08',
    ])
    expect(result.fetchType).toEqual('ONE')
  })

  test('upsert with where and Raw', async () => {
    const result = new QuerybuilderTest().insert({
      tableName: 'phonebook2',
      data: {
        name: 'Alice',
        phonenumber: '704-555-1212',
        validDate: '2018-05-08',
      },
      onConflict: {
        column: 'name',
        data: {
          phonenumber: new Raw('excluded.phonenumber'),
          validDate: new Raw('excluded.validDate'),
        },
        where: {
          conditions: 'excluded.validDate > ?1',
          params: ['2023-01-01'],
        },
      },
    })

    expect(result.query).toEqual(
      'INSERT INTO phonebook2 (name, phonenumber, validDate) VALUES (?2, ?3, ?4) ON CONFLICT (name) DO ' +
        'UPDATE SET phonenumber = excluded.phonenumber, validDate = excluded.validDate WHERE excluded.validDate > ?1'
    )
    expect(result.arguments).toEqual(['2023-01-01', 'Alice', '704-555-1212', '2018-05-08'])
    expect(result.fetchType).toEqual('ONE')
  })
})
