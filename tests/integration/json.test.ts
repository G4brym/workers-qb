import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { D1QB, Raw } from '../../src'

describe('JSON operations', () => {
  it('should perform all json operations correctly', async () => {
    const qb = new D1QB(env.DB)

    // Setup table
    await qb.dropTable({ tableName: 'json_test', ifExists: true }).execute()
    await qb
      .createTable({
        tableName: 'json_test',
        schema: 'id INTEGER PRIMARY KEY, data TEXT',
      })
      .execute()

    // Insert test data
    await qb
      .insert({
        tableName: 'json_test',
        data: {
          id: 1,
          data: JSON.stringify({
            name: 'John Doe',
            age: 30,
            is_active: true,
            tags: ['a', 'b'],
          }),
        },
      })
      .execute()

    // Test Extracting Values
    const user = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ["json_extract(data, '$.name') as name"],
        where: { conditions: 'id = ?', params: [1] },
      })
      .execute()
    expect(user.results?.name).toBe('John Doe')

    const user2 = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ["data ->> '$.name' as name"],
        where: { conditions: 'id = ?', params: [1] },
      })
      .execute()
    expect(user2.results?.name).toBe('John Doe')

    // Test Array Operations
    const tagCount = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ["json_array_length(data, '$.tags') as count"],
        where: { conditions: 'id = ?', params: [1] },
      })
      .execute()
    expect(tagCount.results?.count).toBe(2)

    // Test Modifying JSON Data
    await qb
      .update({
        tableName: 'json_test',
        data: {
          data: new Raw(`json_set(data, '$.age', 31)`),
        },
        where: { conditions: 'id = ?', params: [1] },
      })
      .execute()

    const updatedUser = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ["json_extract(data, '$.age') as age"],
        where: { conditions: 'id = ?', params: [1] },
      })
      .execute()
    expect(updatedUser.results?.age).toBe(31)

    // Test Creating JSON
    const createdJson = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ["json_object('name', 'Jane', 'age', 25) as json_data"],
      })
      .execute()
    expect(createdJson.results?.json_data).toBe('{"name":"Jane","age":25}')

    // Test Other Useful Functions
    const ageType = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ["json_type(data, '$.age') as type"],
        where: { conditions: 'id = ?', params: [1] },
      })
      .execute()
    expect(ageType.results?.type).toBe('integer')

    const isValid = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ['json_valid(\'{"a":1}\') as valid'],
      })
      .execute()
    expect(isValid.results?.valid).toBe(1)

    const jsonString = await qb
      .fetchOne({
        tableName: 'json_test',
        fields: ["json_quote('[1, 2, 3]') as json_string"],
      })
      .execute()
    expect(jsonString.results?.json_string).toBe('"[1, 2, 3]"')

    // Test Expand Arrays for IN Queries
    await qb
      .insert({
        tableName: 'json_test',
        data: [
          { id: 2, data: '{}' },
          { id: 3, data: '{}' },
          { id: 4, data: '{}' },
        ],
      })
      .execute()

    const userIds = [1, 2, 3]
    const users = await qb
      .fetchAll({
        tableName: 'json_test',
        where: {
          conditions: 'id IN (SELECT value FROM json_each(?))',
          params: [JSON.stringify(userIds)],
        },
      })
      .execute()
    expect(users.results).toHaveLength(3)

    // Cleanup
    await qb.dropTable({ tableName: 'json_test' }).execute()
  })
})
