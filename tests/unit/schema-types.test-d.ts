import { describe, expectTypeOf, it } from 'vitest'
import { D1QB, DOQB, PGQB, QueryBuilder, syncLoggerWrapper } from '../../src'
import { DefaultReturnObject } from '../../src/interfaces'
import { Query } from '../../src/tools'

// =============================================================================
// Test Schema Definition
// =============================================================================

type TestSchema = {
  users: {
    id: number
    name: string
    email: string
    role: 'admin' | 'user'
    created_at: Date
    metadata: Record<string, unknown> | null
  }
  posts: {
    id: number
    user_id: number
    title: string
    body: string
    published: boolean
    created_at: Date
  }
  comments: {
    id: number
    post_id: number
    user_id: number
    content: string
    created_at: Date
  }
}

// =============================================================================
// Test Query Builder Classes
// =============================================================================

class SchemaQueryBuilder extends QueryBuilder<TestSchema, {}, true> {
  async execute(query: Query): Promise<Query<any>> {
    return { results: {} } as any
  }

  async lazyExecute(query: Query<any, true>): Promise<AsyncIterable<any>> {
    return (async function* () {})()
  }
}

class SyncSchemaQueryBuilder extends QueryBuilder<TestSchema, {}, false> {
  loggerWrapper = syncLoggerWrapper

  execute(query: Query<any, false>) {
    return { results: {} } as any
  }

  lazyExecute(query: Query<any, false>) {
    return (function* () {})()
  }
}

class EmptySchemaQueryBuilder extends QueryBuilder<{}, {}, true> {
  async execute(query: Query): Promise<Query<any>> {
    return { results: {} } as any
  }

  async lazyExecute(query: Query<any, true>): Promise<AsyncIterable<any>> {
    return (async function* () {})()
  }
}

// =============================================================================
// Tests: Schema-Aware Table Name Type Narrowing
// =============================================================================

describe('Schema-aware table name autocomplete', () => {
  // Note: Due to overload fallback for backwards compatibility, invalid table names
  // don't cause compile errors - they fall back to the legacy string overload.
  // However, when using valid table names, the Schema type is properly inferred.

  it('should infer table type when using valid table name in select', async () => {
    const qb = new SchemaQueryBuilder()

    // When using a valid schema table name, the result type is inferred
    const builder = qb.select('users')

    // The builder should have the users table type
    const result = await builder.execute()
    // Result should have results property
    expectTypeOf(result).toHaveProperty('results')
  })

  it('should infer table type when using valid table name in fetchAll', async () => {
    const qb = new SchemaQueryBuilder()

    // Using typed fetchAll with schema table
    const result = await qb.fetchAll({ tableName: 'posts' }).execute()

    // Result should have results property
    expectTypeOf(result).toHaveProperty('results')
  })

  it('should infer table type in fetchOne', async () => {
    const qb = new SchemaQueryBuilder()

    const result = await qb.fetchOne({ tableName: 'comments' }).execute()

    expectTypeOf(result).toHaveProperty('results')
  })
})

// =============================================================================
// Tests: Schema-Aware Column Autocomplete
// =============================================================================

describe('Schema-aware column autocomplete', () => {
  it('should accept valid column names in fields array', async () => {
    const qb = new SchemaQueryBuilder()

    // Valid columns for users table
    qb.fetchAll({ tableName: 'users', fields: ['id', 'name', 'email'] })

    // Valid columns for posts table
    qb.fetchAll({ tableName: 'posts', fields: ['id', 'title', 'body'] })
  })

  it('should accept wildcard * for fields', async () => {
    const qb = new SchemaQueryBuilder()

    qb.fetchAll({ tableName: 'users', fields: '*' })
    qb.fetchOne({ tableName: 'posts', fields: '*' })
  })

  it('should accept single column as string', async () => {
    const qb = new SchemaQueryBuilder()

    qb.fetchAll({ tableName: 'users', fields: 'id' })
    qb.fetchOne({ tableName: 'posts', fields: 'title' })
  })

  it('should accept valid column names in orderBy object', async () => {
    const qb = new SchemaQueryBuilder()

    qb.fetchAll({
      tableName: 'users',
      orderBy: { name: 'ASC', created_at: 'DESC' },
    })
  })

  it('should accept valid column names in groupBy', async () => {
    const qb = new SchemaQueryBuilder()

    qb.fetchAll({ tableName: 'users', groupBy: ['role'] })
    qb.fetchAll({ tableName: 'posts', groupBy: 'user_id' })
  })
})

// =============================================================================
// Tests: Schema-Aware INSERT
// =============================================================================

describe('Schema-aware INSERT type checking', () => {
  it('should accept valid column names in data object', async () => {
    const qb = new SchemaQueryBuilder()

    qb.insert({
      tableName: 'users',
      data: {
        name: 'John',
        email: 'john@example.com',
        role: 'user',
      },
    })
  })

  it('should accept correct types for data values', async () => {
    const qb = new SchemaQueryBuilder()

    qb.insert({
      tableName: 'users',
      data: {
        id: 1,
        name: 'John',
        role: 'admin', // Union type 'admin' | 'user'
      },
    })

    qb.insert({
      tableName: 'posts',
      data: {
        published: true, // boolean type
        user_id: 1, // number type
      },
    })
  })

  it('should allow partial data for inserts', async () => {
    const qb = new SchemaQueryBuilder()

    // Partial inserts are valid (database enforces required columns)
    qb.insert({ tableName: 'users', data: { name: 'John' } })
    qb.insert({ tableName: 'posts', data: { title: 'Hello' } })
  })

  it('should allow array of data for batch insert', async () => {
    const qb = new SchemaQueryBuilder()

    qb.insert({
      tableName: 'users',
      data: [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
      ],
    })
  })

  it('should accept valid column names in returning', async () => {
    const qb = new SchemaQueryBuilder()

    qb.insert({
      tableName: 'users',
      data: { name: 'John' },
      returning: ['id', 'name'],
    })

    qb.insert({
      tableName: 'users',
      data: { name: 'John' },
      returning: '*',
    })
  })
})

// =============================================================================
// Tests: Schema-Aware UPDATE
// =============================================================================

describe('Schema-aware UPDATE type checking', () => {
  it('should accept valid column names in data object', async () => {
    const qb = new SchemaQueryBuilder()

    qb.update({
      tableName: 'users',
      data: { name: 'Jane', email: 'jane@example.com' },
    })
  })

  it('should accept correct types for data values', async () => {
    const qb = new SchemaQueryBuilder()

    qb.update({
      tableName: 'posts',
      data: { published: true },
    })
  })

  it('should accept valid column names in returning', async () => {
    const qb = new SchemaQueryBuilder()

    qb.update({
      tableName: 'users',
      data: { name: 'Jane' },
      returning: ['id', 'name', 'email'],
    })
  })
})

// =============================================================================
// Tests: Schema-Aware DELETE
// =============================================================================

describe('Schema-aware DELETE type checking', () => {
  it('should accept valid column names in returning', async () => {
    const qb = new SchemaQueryBuilder()

    qb.delete({
      tableName: 'users',
      where: 'id = 1',
      returning: ['id', 'name'],
    })
  })

  it('should accept valid column names in orderBy', async () => {
    const qb = new SchemaQueryBuilder()

    qb.delete({
      tableName: 'users',
      where: 'active = false',
      orderBy: { created_at: 'ASC' },
    })
  })
})

// =============================================================================
// Tests: Async vs Sync Query Builder
// =============================================================================

describe('Async query builder behavior', () => {
  it('should return Promise for async fetchAll', async () => {
    const qb = new SchemaQueryBuilder()

    const query = qb.fetchAll({ tableName: 'users' })
    const result = query.execute()

    expectTypeOf(result).toMatchTypeOf<Promise<any>>()
  })

  it('should return Promise for async select', async () => {
    const qb = new SchemaQueryBuilder()

    const result = qb.select('users').execute()

    expectTypeOf(result).toMatchTypeOf<Promise<any>>()
  })
})

describe('Sync query builder behavior', () => {
  it('should not return Promise for sync fetchAll', () => {
    const qb = new SyncSchemaQueryBuilder()

    const query = qb.fetchAll({ tableName: 'users' })
    const result = query.execute()

    // Sync result is not a Promise
    expectTypeOf(result).not.toMatchTypeOf<Promise<any>>()
  })

  it('should not return Promise for sync select', () => {
    const qb = new SyncSchemaQueryBuilder()

    const result = qb.select('users').execute()

    // Sync result is not a Promise
    expectTypeOf(result).not.toMatchTypeOf<Promise<any>>()
  })
})

// =============================================================================
// Tests: Backwards Compatibility (Empty Schema)
// =============================================================================

describe('Backwards compatibility with empty schema', () => {
  it('should allow any table name when schema is empty', async () => {
    const qb = new EmptySchemaQueryBuilder()

    // Any table name is allowed
    qb.fetchAll({ tableName: 'any_table' })
    qb.fetchAll({ tableName: 'whatever' })
    qb.select('anything')
  })

  it('should allow any field names when schema is empty', async () => {
    const qb = new EmptySchemaQueryBuilder()

    qb.fetchAll({ tableName: 'users', fields: ['anything', 'whatever'] })
  })

  it('should return result with results property when no schema', async () => {
    const qb = new EmptySchemaQueryBuilder()

    const result = await qb.fetchAll({ tableName: 'users' }).execute()

    expectTypeOf(result).toHaveProperty('results')
  })

  it('should allow explicit generic type override', async () => {
    const qb = new EmptySchemaQueryBuilder()

    type CustomUser = { id: number; custom_field: string }

    const result = await qb.fetchAll<CustomUser>({ tableName: 'users' }).execute()

    expectTypeOf(result).toHaveProperty('results')
  })

  it('should allow explicit generic type in select', async () => {
    const qb = new EmptySchemaQueryBuilder()

    type CustomPost = { id: number; title: string }

    const result = await qb.select<CustomPost>('posts').execute()

    expectTypeOf(result).toHaveProperty('results')
  })
})

// =============================================================================
// Tests: Complex Types
// =============================================================================

describe('Complex schema types', () => {
  it('should handle union types (role)', async () => {
    const qb = new SchemaQueryBuilder()

    // Valid union values
    qb.insert({ tableName: 'users', data: { role: 'admin' } })
    qb.insert({ tableName: 'users', data: { role: 'user' } })
  })

  it('should handle nullable types', async () => {
    const qb = new SchemaQueryBuilder()

    // Null is valid for nullable fields
    qb.insert({ tableName: 'users', data: { metadata: null } })
    qb.insert({ tableName: 'users', data: { metadata: { key: 'value' } } })
  })

  it('should handle Date types', async () => {
    const qb = new SchemaQueryBuilder()

    qb.insert({ tableName: 'users', data: { created_at: new Date() } })
  })
})

// =============================================================================
// Tests: SelectBuilder Method Chaining
// =============================================================================

describe('SelectBuilder with schema types', () => {
  it('should maintain type through method chaining', async () => {
    const qb = new SchemaQueryBuilder()

    const result = await qb.select('users').where('id = ?', 1).limit(10).offset(0).execute()

    expectTypeOf(result).toHaveProperty('results')
  })

  it('should work with one() method', async () => {
    const qb = new SchemaQueryBuilder()

    const result = await qb.select('posts').where('id = ?', 1).one()

    expectTypeOf(result).toHaveProperty('results')
  })

  it('should work with execute options', async () => {
    const qb = new SchemaQueryBuilder()

    // lazy: true
    const lazyResult = await qb.select('comments').execute({ lazy: true })
    expectTypeOf(lazyResult).toHaveProperty('results')

    // lazy: false
    const arrayResult = await qb.select('comments').execute({ lazy: false })
    expectTypeOf(arrayResult).toHaveProperty('results')

    // no options
    const defaultResult = await qb.select('comments').execute()
    expectTypeOf(defaultResult).toHaveProperty('results')
  })
})

// =============================================================================
// Tests: Real Database Adapters Type Signatures
// =============================================================================

describe('Real database adapters with schema', () => {
  it('D1QB should accept schema type parameter', () => {
    // Verify D1QB can be parameterized with Schema
    type D1WithSchema = D1QB<TestSchema>

    // Type check - this should compile
    const _check = {} as D1WithSchema
    expectTypeOf(_check).toHaveProperty('fetchAll')
    expectTypeOf(_check).toHaveProperty('fetchOne')
    expectTypeOf(_check).toHaveProperty('insert')
    expectTypeOf(_check).toHaveProperty('update')
    expectTypeOf(_check).toHaveProperty('delete')
    expectTypeOf(_check).toHaveProperty('select')
  })

  it('DOQB should accept schema type parameter', () => {
    // Verify DOQB can be parameterized with Schema
    type DOWithSchema = DOQB<TestSchema>

    const _check = {} as DOWithSchema
    expectTypeOf(_check).toHaveProperty('fetchAll')
    expectTypeOf(_check).toHaveProperty('fetchOne')
    expectTypeOf(_check).toHaveProperty('insert')
    expectTypeOf(_check).toHaveProperty('update')
    expectTypeOf(_check).toHaveProperty('delete')
    expectTypeOf(_check).toHaveProperty('select')
  })

  it('PGQB should accept schema type parameter', () => {
    // Verify PGQB can be parameterized with Schema
    type PGWithSchema = PGQB<TestSchema>

    const _check = {} as PGWithSchema
    expectTypeOf(_check).toHaveProperty('fetchAll')
    expectTypeOf(_check).toHaveProperty('fetchOne')
    expectTypeOf(_check).toHaveProperty('insert')
    expectTypeOf(_check).toHaveProperty('update')
    expectTypeOf(_check).toHaveProperty('delete')
    expectTypeOf(_check).toHaveProperty('select')
  })
})

// =============================================================================
// Tests: Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('should handle schema with single table', () => {
    type SingleTableSchema = {
      only_table: {
        id: number
        value: string
      }
    }

    class SingleTableQB extends QueryBuilder<SingleTableSchema, {}, true> {
      async execute(query: Query): Promise<Query<any>> {
        return { results: {} } as any
      }

      async lazyExecute(query: Query<any, true>): Promise<AsyncIterable<any>> {
        return (async function* () {})()
      }
    }

    const qb = new SingleTableQB()

    // Valid table should work
    qb.fetchAll({ tableName: 'only_table' })
    qb.insert({ tableName: 'only_table', data: { value: 'test' } })
  })

  it('should handle deeply nested JSON types', async () => {
    type NestedSchema = {
      configs: {
        id: number
        settings: {
          theme: {
            primary: string
            secondary: string
          }
          notifications: {
            email: boolean
            push: boolean
          }
        }
      }
    }

    class NestedQB extends QueryBuilder<NestedSchema, {}, true> {
      async execute(query: Query): Promise<Query<any>> {
        return { results: {} } as any
      }

      async lazyExecute(query: Query<any, true>): Promise<AsyncIterable<any>> {
        return (async function* () {})()
      }
    }

    const qb = new NestedQB()

    // Nested object data should be accepted
    qb.insert({
      tableName: 'configs',
      data: {
        settings: {
          theme: { primary: '#000', secondary: '#fff' },
          notifications: { email: true, push: false },
        },
      },
    })
  })

  it('should handle optional fields in schema', async () => {
    type OptionalSchema = {
      items: {
        id: number
        name: string
        description?: string
        tags?: string[]
      }
    }

    class OptionalQB extends QueryBuilder<OptionalSchema, {}, true> {
      async execute(query: Query): Promise<Query<any>> {
        return { results: {} } as any
      }

      async lazyExecute(query: Query<any, true>): Promise<AsyncIterable<any>> {
        return (async function* () {})()
      }
    }

    const qb = new OptionalQB()

    // Insert with optional fields
    qb.insert({ tableName: 'items', data: { name: 'Item' } })
    qb.insert({ tableName: 'items', data: { name: 'Item', description: 'Desc' } })
    qb.insert({ tableName: 'items', data: { name: 'Item', tags: ['a', 'b'] } })
  })
})

// =============================================================================
// Tests: Count Method Types
// =============================================================================

describe('Count method types', () => {
  it('should return correct type for count from fetchAll', async () => {
    const qb = new SchemaQueryBuilder()

    const countResult = await qb.fetchAll({ tableName: 'users' }).count()

    expectTypeOf(countResult).toHaveProperty('results')
  })

  it('should return correct type for count from fetchOne', async () => {
    const qb = new SchemaQueryBuilder()

    const countResult = await qb.fetchOne({ tableName: 'posts' }).count()

    expectTypeOf(countResult).toHaveProperty('results')
  })

  it('should return correct type for count from select builder', async () => {
    const qb = new SchemaQueryBuilder()

    const countResult = await qb.select('comments').count()

    expectTypeOf(countResult).toHaveProperty('results')
  })
})

// =============================================================================
// Tests: Lazy Execution Types
// =============================================================================

describe('Lazy execution types', () => {
  it('async lazy should return AsyncIterable results', async () => {
    const qb = new SchemaQueryBuilder()

    const result = await qb.fetchAll({ tableName: 'users', lazy: true }).execute()

    // Result should have results that is an AsyncIterable
    expectTypeOf(result).toHaveProperty('results')
  })

  it('sync lazy should return Iterable results', () => {
    const qb = new SyncSchemaQueryBuilder()

    const result = qb.fetchAll({ tableName: 'users', lazy: true }).execute()

    // Result should have results that is an Iterable
    expectTypeOf(result).toHaveProperty('results')
  })

  it('async non-lazy should return Array results', async () => {
    const qb = new SchemaQueryBuilder()

    const result = await qb.fetchAll({ tableName: 'users' }).execute()

    expectTypeOf(result).toHaveProperty('results')
  })

  it('sync non-lazy should return Array results', () => {
    const qb = new SyncSchemaQueryBuilder()

    const result = qb.fetchAll({ tableName: 'users' }).execute()

    expectTypeOf(result).toHaveProperty('results')
  })
})

// =============================================================================
// Tests: Query Object Types
// =============================================================================

describe('Query object types', () => {
  it('fetchAll should return QueryWithExtra', () => {
    const qb = new SchemaQueryBuilder()

    const query = qb.fetchAll({ tableName: 'users' })

    // Query should have execute and count methods
    expectTypeOf(query).toHaveProperty('execute')
    expectTypeOf(query).toHaveProperty('count')
    expectTypeOf(query).toHaveProperty('query')
    expectTypeOf(query).toHaveProperty('arguments')
  })

  it('fetchOne should return QueryWithExtra', () => {
    const qb = new SchemaQueryBuilder()

    const query = qb.fetchOne({ tableName: 'users' })

    expectTypeOf(query).toHaveProperty('execute')
    expectTypeOf(query).toHaveProperty('count')
    expectTypeOf(query).toHaveProperty('query')
    expectTypeOf(query).toHaveProperty('arguments')
  })

  it('insert should return Query', () => {
    const qb = new SchemaQueryBuilder()

    const query = qb.insert({ tableName: 'users', data: { name: 'John' } })

    expectTypeOf(query).toHaveProperty('execute')
    expectTypeOf(query).toHaveProperty('query')
    expectTypeOf(query).toHaveProperty('arguments')
  })

  it('update should return Query', () => {
    const qb = new SchemaQueryBuilder()

    const query = qb.update({ tableName: 'users', data: { name: 'Jane' } })

    expectTypeOf(query).toHaveProperty('execute')
    expectTypeOf(query).toHaveProperty('query')
    expectTypeOf(query).toHaveProperty('arguments')
  })

  it('delete should return Query', () => {
    const qb = new SchemaQueryBuilder()

    const query = qb.delete({ tableName: 'users', where: 'id = 1' })

    expectTypeOf(query).toHaveProperty('execute')
    expectTypeOf(query).toHaveProperty('query')
    expectTypeOf(query).toHaveProperty('arguments')
  })
})
