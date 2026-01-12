# Type Checking

`workers-qb` is built with TypeScript and provides excellent support for type safety throughout your database interactions. Leveraging TypeScript's static typing can significantly improve the robustness and maintainability of your Cloudflare Worker applications by catching type-related errors at compile time rather than runtime.

## TypeScript and Type Safety in workers-qb

TypeScript's type system allows you to define the shape of your data and enforce these types throughout your codebase. In the context of database interactions, this means you can define TypeScript types that represent the structure of your database tables and ensure that the data you fetch from the database conforms to these types.

Benefits of type checking in `workers-qb`: (No changes in this section)

## Defining Types for Database Tables

(No changes in this section)

## Using Generic Types with Query Methods

`workers-qb`'s `fetchAll`, `fetchOne`, `insert`, and `update` methods are generic, allowing you to specify the expected return type of your queries. By providing your defined types as type arguments to these methods, you enable type checking for your database queries.

**Example: Fetching Users with Type Checking** (No changes in this section)

**Example: Using Type Checking with `fetchOne`** (No changes in this section)

## Type Checking for `insert` and `update` with `returning`

You can also leverage type checking when using `insert` and `update` queries, especially when you use the `returning` option to retrieve data after these operations.

**Example: Type Checking with `insert` and `returning`**

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization and User type definition from previous examples) ...

type NewUserResult = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);

    const newUser = await qb.insert<NewUserResult>({ // Specify NewUserResult type
      tableName: 'users',
      data: {
        name: 'Jane Doe',
        email: 'jane.doe2@example.com',
      },
      returning: ['id', 'name', 'email', 'created_at'],
    }).execute();

    if (newUser.results) {
      // TypeScript knows 'newUser.results' is of type 'NewUserResult'
      console.log(`New User ID: ${newUser.results.id}, Name: ${newUser.results.name}`);
    }

    return Response.json({ newUser: newUser.results });
  },
};
```

In this example, we define a type `NewUserResult` that matches the structure of the data being returned by the `insert` query due to the `returning: ['id', 'name', 'email', 'created_at']` clause. By using `qb.insert<NewUserResult>()`, we ensure that TypeScript checks if the returned data conforms to the `NewUserResult` type.

**Example: Type Checking with `update` and `returning`**

```typescript
import { D1QB, Raw } from 'workers-qb';

// ... (D1QB initialization and User type definition) ...

type UpdatedUserResult = {
  id: number;
  name: string;
  email: string;
  updated_at: string;
};

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);

    const updatedUser = await qb.update<UpdatedUserResult>({ // Specify UpdatedUserResult type
      tableName: 'users',
      data: {
        name: 'Jane Doe Updated',
        updated_at: new Raw('CURRENT_TIMESTAMP')
      },
      where: {
        conditions: 'email = ?',
        params: 'jane.doe2@example.com',
      },
      returning: ['id', 'name', 'email', 'updated_at'],
    }).execute();

    if (updatedUser.results && updatedUser.results.length > 0) {
      const firstUpdatedUser = updatedUser.results[0];
      // TypeScript knows 'firstUpdatedUser' is of type 'UpdatedUserResult'
      console.log(`Updated User Name: ${firstUpdatedUser.name}, Updated At: ${firstUpdatedUser.updated_at}`);
    }

    return Response.json({ updatedUser: updatedUser.results?.[0] });
  },
};
```

Similarly, for the `update` query, we define `UpdatedUserResult` to match the expected return type from `returning: ['id', 'name', 'email', 'updated_at']`. `qb.update<UpdatedUserResult>()` enables type checking for the updated data retrieved by the `returning` clause.

**Type Inference Examples:** (No changes in this section)

**Best Practice:** (No changes in this section)

By consistently using generic types with `fetchAll`, `fetchOne`, `insert`, and `update` (especially with `returning`), you maximize the benefits of TypeScript's type system in your `workers-qb` database interactions, leading to more robust and maintainable code.

## Schema-Aware Type Inference

For even better type safety, you can define your entire database schema as a TypeScript type and pass it to the query builder. This enables **autocomplete for table names, column names, and automatic result type inference**.

### Defining Your Schema

Define your database schema as a TypeScript type where each key is a table name and the value is an object describing the columns:

```typescript
type Schema = {
  users: {
    id: number
    name: string
    email: string
    role: 'admin' | 'user'
    created_at: Date
  }
  posts: {
    id: number
    user_id: number
    title: string
    body: string
    published: boolean
  }
}
```

### Using Schema with Query Builders

Pass your schema type as a generic parameter when creating the query builder:

```typescript
import { D1QB } from 'workers-qb'

// Initialize with schema type
const qb = new D1QB<Schema>(env.DB)
```

Now you get full autocomplete and type checking:

```typescript
// Table name autocomplete: 'users' | 'posts'
const users = await qb.fetchAll({
  tableName: 'users',           // ✓ Autocomplete works
  fields: ['id', 'name'],       // ✓ Only valid column names allowed
  orderBy: { name: 'ASC' },     // ✓ Keys autocomplete to column names
}).execute()

// Result type is automatically inferred as { id: number; name: string }[]
users.results?.forEach(user => {
  console.log(user.id)    // ✓ TypeScript knows this is number
  console.log(user.name)  // ✓ TypeScript knows this is string
})
```

### Schema-Aware SELECT

The fluent API also supports schema-aware types:

```typescript
const post = await qb
  .select('posts')              // Table name autocomplete
  .fields('id', 'title')        // Column name autocomplete
  .where('user_id = ?', 1)
  .one()
  .execute()

// post.results is typed as { id: number; title: string }
```

### Schema-Aware INSERT

Insert operations get type checking for the data object:

```typescript
await qb.insert({
  tableName: 'users',
  data: {
    name: 'Alice',              // ✓ Autocomplete for column names
    email: 'alice@example.com',
    role: 'admin',              // ✓ Autocomplete: 'admin' | 'user'
  }
}).execute()

// TypeScript error: 'invalid_column' does not exist on type
await qb.insert({
  tableName: 'users',
  data: {
    invalid_column: 'value',    // ✗ Type error
  }
}).execute()
```

### Schema-Aware UPDATE and DELETE

Update and delete operations also benefit from schema types:

```typescript
// UPDATE with schema
await qb.update({
  tableName: 'users',
  data: { name: 'Bob' },        // ✓ Only valid columns
  where: { conditions: 'id = ?', params: [1] }
}).execute()

// DELETE with schema
await qb.delete({
  tableName: 'posts',           // ✓ Must be valid table name
  where: { conditions: 'user_id = ?', params: [1] }
}).execute()
```

### Backwards Compatibility

If you don't provide a schema type, the query builder works exactly as before with loose types:

```typescript
// Without schema - loose types (backwards compatible)
const qb = new D1QB(env.DB)

// Still works, but no autocomplete for table/column names
const users = await qb.fetchAll<User>({
  tableName: 'users',
  fields: ['id', 'name'],
}).execute()
```

### Works with All Database Adapters

Schema-aware types work with all database adapters:

```typescript
import { D1QB, DOQB, PGQB } from 'workers-qb'

// D1 (async)
const d1qb = new D1QB<Schema>(env.DB)

// Durable Objects (sync)
const doqb = new DOQB<Schema>(ctx.storage.sql)

// PostgreSQL (async)
const pgqb = new PGQB<Schema>(client)
```

### Tips for Schema Definition

1. **Match your actual database schema** - The TypeScript type should reflect your real database structure

2. **Use union types for enums** - Instead of `string`, use `'admin' | 'user'` for enum columns

3. **Date columns** - Use `Date` or `string` depending on how you handle dates

4. **Nullable columns** - Use `string | null` for nullable columns

```typescript
type Schema = {
  users: {
    id: number
    name: string
    email: string | null           // Nullable column
    role: 'admin' | 'user'         // Enum column
    created_at: Date               // Date column
    metadata: Record<string, any>  // JSON column
  }
}
```
