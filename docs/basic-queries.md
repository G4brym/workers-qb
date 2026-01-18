# Basic Queries

This section covers the fundamental query operations in `workers-qb`, including connecting to databases, table operations, and basic CRUD (Create, Read, Update, Delete) operations.

## Connecting to Databases

Before you can start querying your database, you need to establish a connection using the appropriate `workers-qb` class for your database. Define your schema type for full type safety and autocomplete.

### Cloudflare D1

For Cloudflare D1, you'll use the `D1QB` class, passing your D1 database binding from your Worker environment:

```typescript
import { D1QB } from 'workers-qb';

// Define your database schema for type-safe queries
type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
    created_at: string;
    login_count: number;
    last_login: string;
  };
};

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB<Schema>(env.DB);
    // ... your queries using qb with full type safety ...
  },
};
```

### Cloudflare Durable Objects

For Cloudflare Durable Objects storage, use the `DOQB` class, passing the `DurableObjectStorage` instance:

```typescript
import { DOQB } from 'workers-qb';

// Define your database schema
type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
  };
};

export class MyDurableObject extends DurableObject {
  #qb: DOQB<Schema>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.#qb = new DOQB<Schema>(this.storage.sql);
  }

  async fetch(request: Request): Promise<Response> {
    // ... your queries using this.#qb ...
  }
}
```

### PostgreSQL

For PostgreSQL, use the `PGQB` class and instantiate the `pg.Client` with your database connection URL. Remember to install `pg` and enable Node compatibility in your `wrangler.toml`.

```typescript
import { PGQB } from 'workers-qb';
import { Client } from 'pg';

// Define your database schema
type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
  };
};

export interface Env {
  DB_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const dbClient = new Client(env.DB_URL);
    const qb = new PGQB<Schema>(dbClient);
    await qb.connect(); // Connect to PostgreSQL

    // ... your queries using qb ...

    ctx.waitUntil(qb.close()); // Close the connection when done
  },
};
```

## Table Operations

`workers-qb` provides methods for creating and dropping database tables.

### Creating Tables

Use the `createTable` method to define and create a new table. You need to specify the `tableName` and the `schema` as a string defining the table columns and their types.

```typescript
import { D1QB } from 'workers-qb';

type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
};

// ... (D1QB initialization) ...
const qb = new D1QB<Schema>(env.DB);

await qb.createTable({
  tableName: 'users',  // ✓ Autocomplete from schema
  schema: `
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `,
}).execute();

console.log('Table "users" created successfully.');
```

You can also use the `ifNotExists: true` option to prevent errors if the table already exists:

```typescript
await qb.createTable({
  tableName: 'users',
  schema: `
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `,
  ifNotExists: true,
}).execute();
```

### Dropping Tables

Use the `dropTable` method to remove a table from the database. Specify the `tableName` to be dropped.

```typescript
await qb.dropTable({
  tableName: 'users',
}).execute();

console.log('Table "users" dropped successfully.');
```

You can use `ifExists: true` to avoid errors if the table doesn't exist:

```typescript
await qb.dropTable({
  tableName: 'users',
  ifExists: true,
}).execute();
```

## Insert

### Insert One

Use the `insert` method with a single data object to insert a new row into a table.

```typescript
import { D1QB } from 'workers-qb';

type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
  };
};

// ... (D1QB initialization) ...
const qb = new D1QB<Schema>(env.DB);

const newUser = await qb.insert({
  tableName: 'users',  // ✓ Autocomplete from schema
  data: {
    name: 'John Doe',  // ✓ Only valid columns allowed
    email: 'john.doe@example.com',
  },
  returning: ['id', 'name', 'email'],  // ✓ Autocomplete for columns
}).execute();

// newUser.results is typed based on schema
console.log('New user inserted:', newUser.results);
```

### Insert Multiple

To insert multiple rows efficiently, provide an array of data objects to the `insert` method.

```typescript
const newUsers = await qb.insert({
  tableName: 'users',
  data: [
    { name: 'Jane Doe', email: 'jane.doe@example.com' },
    { name: 'Peter Pan', email: 'peter.pan@example.com' },
  ],
  returning: ['id', 'name', 'email'],
}).execute();

console.log('New users inserted:', newUsers.results);
```

### Insert Without Returning

If you don't need to retrieve data after insertion, you can omit the `returning` option for a slightly more performant operation.

```typescript
await qb.insert({
  tableName: 'users',
  data: {
    name: 'Anonymous User',
    email: 'anonymous@example.com',
  },
}).execute();

console.log('User inserted without returning data.');
```

### On Conflict - IGNORE

Use `onConflict: 'IGNORE'` to skip insertion if a conflict occurs (e.g., due to a unique constraint).

```typescript
await qb.insert({
  tableName: 'users',
  data: {
    email: 'john.doe@example.com', // Assuming 'email' is a unique key and already exists
    name: 'Duplicate User',
  },
  onConflict: 'IGNORE',
}).execute();

console.log('Insert attempted, conflict ignored if email exists.');
```

### On Conflict - REPLACE

Use `onConflict: 'REPLACE'` to replace the existing row if a conflict occurs.

```typescript
await qb.insert({
  tableName: 'users',
  data: {
    email: 'john.doe@example.com', // Assuming 'email' is a unique key and already exists
    name: 'Updated John Doe', // Will update the name if email exists
  },
  onConflict: 'REPLACE',
}).execute();

console.log('Insert attempted, row replaced if email exists.');
```

### On Conflict - UPSERT (UPDATE)

For more complex conflict resolution, you can perform an UPSERT operation, updating specific columns if a conflict occurs. Use `onConflict` with an object to define the columns causing conflict, the data to update, and optional `where` conditions for the update.

```typescript
import { D1QB, Raw } from 'workers-qb';

type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
    login_count: number;
    updated_at: string;
  };
};

const qb = new D1QB<Schema>(env.DB);

await qb.insert({
  tableName: 'users',
  data: {
    email: 'john.doe@example.com', // Assuming 'email' is a unique key and already exists
    name: 'John Doe',
    login_count: 1, // New login, should increment if user exists
  },
  onConflict: {
    column: 'email', // Column that might cause conflict
    data: {
      // Data to update on conflict
      login_count: new Raw('login_count + 1'), // Increment login_count using Raw SQL
      updated_at: new Raw('CURRENT_TIMESTAMP'), // Update timestamp
    },
  },
}).execute();

console.log('Insert attempted, row updated (UPSERT) if email exists.');
```

**Note:**  `Raw` is used here to execute raw SQL functions like `login_count + 1` and `CURRENT_TIMESTAMP` within the `data` object for `onConflict`.

## Select

### Simple Select All

The most basic select operation retrieves all columns and rows from a table.

```typescript
import { D1QB } from 'workers-qb';

type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
  };
};

const qb = new D1QB<Schema>(env.DB);

const allUsers = await qb.fetchAll({
  tableName: 'users',
}).execute();

// allUsers.results is typed as Schema['users'][]
console.log('All users:', allUsers.results);
```

### Select Specific Fields

To retrieve only specific columns, use the `fields` option with an array of column names or a comma-separated string.

```typescript
const userNamesAndEmails = await qb.fetchAll({
  tableName: 'users',
  fields: ['name', 'email'],  // ✓ Autocomplete for column names
}).execute();

// Result is typed as Pick<Schema['users'], 'name' | 'email'>[]
console.log('User names and emails:', userNamesAndEmails.results);
```

### `fetchOne`

Use `fetchOne` to retrieve a single row that matches the specified criteria. It's ideal for fetching records by ID or unique identifiers.

```typescript
const singleUser = await qb.fetchOne({
  tableName: 'users',
  where: {
    conditions: 'id = ?',
    params: 1, // Assuming you want to fetch user with ID 1
  },
}).execute();

// singleUser.results is typed as Schema['users']
console.log('Single user:', singleUser.results);
```

### `fetchAll`

`fetchAll` retrieves multiple rows based on your query. It's used for fetching lists of data, potentially with filters and ordering.

```typescript
const activeUsers = await qb.fetchAll({
  tableName: 'users',
  where: {
    conditions: 'created_at > ?',
    params: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(), // Users created in last 30 days
  },
  orderBy: 'created_at DESC',
}).execute();

console.log('Active users:', activeUsers.results);
```

## Update

### Simple Update

Update rows in a table using the `update` method. Specify the `tableName`, the `data` to update (as an object), and `where` conditions to target specific rows.

```typescript
await qb.update({
  tableName: 'users',
  data: {
    name: 'Updated Name',  // ✓ Only valid columns allowed
  },
  where: {
    conditions: 'email = ?',
    params: 'john.doe@example.com',
  },
}).execute();

console.log('User name updated.');
```

### Update Returning Fields

To retrieve the updated rows, use the `returning` option.

```typescript
const updatedUser = await qb.update({
  tableName: 'users',
  data: {
    name: 'Corrected John Doe',
  },
  where: {
    conditions: 'id = ?',
    params: 1,
  },
  returning: ['id', 'name', 'email'],  // ✓ Autocomplete for columns
}).execute();

console.log('Updated user:', updatedUser.results);
```

### Update Without Returning

For performance optimization when you don't need the updated rows, omit the `returning` option.

```typescript
import { Raw } from 'workers-qb';

await qb.update({
  tableName: 'users',
  data: {
    last_login: new Raw('CURRENT_TIMESTAMP'), // Update with current timestamp
  },
  where: {
    conditions: 'email = ?',
    params: 'john.doe@example.com',
  },
}).execute();

console.log('User last login updated without returning data.');
```

## Delete

### Simple Delete

Delete rows from a table using the `delete` method. Specify the `tableName` and `where` conditions to target rows for deletion. **Be cautious when using `delete` without `where` conditions as it will delete all rows in the table.**

```typescript
await qb.delete({
  tableName: 'users',
  where: {
    conditions: 'email = ?',
    params: 'anonymous@example.com',
  },
}).execute();

console.log('Anonymous user deleted.');
```

### Delete Returning Fields

To retrieve the deleted rows, use the `returning` option.

```typescript
const deletedUser = await qb.delete({
  tableName: 'users',
  where: {
    conditions: 'id = ?',
    params: 5, // Assuming you want to delete user with ID 5
  },
  returning: ['id', 'name', 'email'],
}).execute();

console.log('Deleted user:', deletedUser.results);
```

### Delete Without Returning

For performance when you don't need the deleted rows, omit the `returning` option.

```typescript
await qb.delete({
  tableName: 'users',
  where: {
    conditions: 'created_at < ?',
    params: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(), // Delete users created more than a year ago
  },
}).execute();

console.log('Old users deleted without returning data.');
```
