import { expectTypeOf } from 'vitest'
import { D1QB } from '../../src'

// User-defined database schema from the proposal
interface MyDBSchema {
  users: {
    id: number
    name: string
    email: string
    role_id: number
  }
  posts: {
    id: number
    title: string
    body: string
    author_id: number
  }
}

// Mock D1Database
const mockD1 = {} as D1Database

// Create a typed query builder instance
const qb = new D1QB<MyDBSchema>(mockD1)

// --- Positive Tests (Should Compile) ---

// 1. `tableName` should accept valid table names
qb.select('users')
qb.select('posts')

// 2. `fields` should provide autocompletion for valid column names
qb.select('users').fields(['id', 'name'])

// 3. `fields` should also accept arbitrary strings (as per the proposal)
qb.select('users').fields(['id', 'name as userName', 'non_schema_field'])

// 4. `returning` in other methods should also be flexible
qb.insert({
  tableName: 'users',
  data: { name: 'test', email: 'test@test.com', role_id: 1 },
  returning: ['id', 'name', 'email as user_email'],
})

// 5. The result type should remain generic/any, as per the proposal
const result = await qb.select('users').execute()
expectTypeOf(result.results).toBeAny

// --- Negative Tests (Should Fail to Compile without @ts-expect-error) ---

// 1. `tableName` should not accept a table name that is not in the schema
// @ts-expect-error
qb.select('non_existent_table')

// 2. `data` object in `insert` should not accept fields that are not in the schema
qb.insert({
  tableName: 'users',
  // @ts-expect-error
  data: { unknown_field: 'test' },
})

// 3. `data` object in `update` should not accept fields that are not in the schema
qb.update({
  tableName: 'users',
  // @ts-expect-error
  data: { age: 30 },
})
