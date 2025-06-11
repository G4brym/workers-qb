# Basic Queries

This section covers the fundamental query operations in `workers-qb`, including connecting to databases, table operations, and basic CRUD (Create, Read, Update, Delete) operations.

## Connecting to Databases

Before you can start querying your database, you need to establish a connection using the appropriate `workers-qb` class for your database.

### Cloudflare D1

For Cloudflare D1, you'll use the `D1QB` class, passing your D1 database binding from your Worker environment:

```typescript
import { D1QB } from 'workers-qb'; // Or your specific path if not using npm module yet

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);
    // ... your queries using qb ...
    // Example: const allUsers = await qb.select('users').all();
    return new Response("Queries executed (check console for D1QB)");
  },
};
```

### Cloudflare Durable Objects

For Cloudflare Durable Objects storage, use the `DOQB` class, passing the `DurableObjectStorage` instance (often `this.storage.sql` or `this.state.storage.sql` depending on your DO setup):

```typescript
import { DOQB } from 'workers-qb'; // Or your specific path
import { DurableObject } from '@cloudflare/workers-types';


// Assuming this is part of your Durable Object class
// @ts-ignore
export class MyDurableObject extends DurableObject {
  // ... constructor and other DO methods

  async someMethod() {
    // @ts-ignore
    const qb = new DOQB(this.ctx.storage.sql);
    // ... your queries using qb ...
    // Example: const user = await qb.select('users').where("id = ?", [1]).one();
  }
}
```
*Note: The exact way to access `DurableObjectStorage.sql()` might vary slightly based on your Durable Object structure (`this.state.storage.sql` or `this.env.CTX.storage.sql` etc.).*

### PostgreSQL

For PostgreSQL, use the `PGQB` class and instantiate the `pg.Client` with your database connection URL. Remember to install `pg` and enable Node compatibility in your `wrangler.toml`.

```typescript
import { PGQB } from 'workers-qb'; // Or your specific path
import { Client } from 'pg';

export interface Env {
  DB_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const dbClient = new Client({ connectionString: env.DB_URL }); // Ensure pg.Client is instantiated
    const qb = new PGQB(dbClient);

    try {
      await qb.connect(); // Connect to PostgreSQL
      // ... your queries using qb ...
      // Example: const products = await qb.select('products').where("category = ?", ['electronics']).all();
    } catch (e) {
      console.error("Error with PGQB:", e);
      return new Response("Error connecting or querying PG", { status: 500 });
    } finally {
      ctx.waitUntil(qb.close()); // Close the connection when done
    }
    return new Response("Queries executed (check console for PGQB)");
  },
};
```

## Table Operations

`workers-qb` provides methods for creating and dropping database tables. These methods are executed directly.

### Creating Tables

Use the `createTable` method to define and create a new table. You need to specify the `tableName` and the `schema` as a string defining the table columns and their types.

```typescript
import { D1QB } from 'workers-qb'; // Or your specific QB class

// ... (QB initialization: const qb = new D1QB(env.DB);) ...

const createResult = await qb.createTable({
  tableName: 'users',
  schema: `
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `,
});

// For D1, createResult will be D1Result<unknown>
if (createResult.success) {
  console.log('Table "users" created successfully.');
} else {
  console.error('Failed to create table:', createResult.meta);
}
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
});
```

### Dropping Tables

Use the `dropTable` method to remove a table from the database. Specify the `tableName` to be dropped.

```typescript
import { D1QB } from 'workers-qb'; // Or your specific QB class

// ... (QB initialization) ...

const dropResult = await qb.dropTable({
  tableName: 'users',
});

if (dropResult.success) { // Example for D1Result
  console.log('Table "users" dropped successfully.');
}
```

You can use `ifExists: true` to avoid errors if the table doesn't exist:

```typescript
await qb.dropTable({
  tableName: 'users',
  ifExists: true,
});
```

## Insert

### Insert One

Use the `insertInto` method, followed by `values` and `execute`, to insert a new row. Use `returning` to get back specific fields.

```typescript
import { D1QB } from 'workers-qb'; // Or your specific QB class
import { D1Result } from 'workers-qb'; // For typing the result

// ... (QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

// D1QB.insertInto will return InsertBuilder<D1Result<User>, User, true>
// The .execute() call then returns Promise<D1Result<User>>
const insertResult: D1Result<User> = await qb
  .insertInto<User>('users')
  .values({
    name: 'John Doe',
    email: 'john.doe@example.com',
  })
  .returning(['id', 'name', 'email']) // Specify fields to return
  .execute();

if (insertResult.success && insertResult.results) {
  // For single insert with returning, D1 results is an array with one item
  console.log('New user inserted:', insertResult.results[0]);
}
```

### Insert Multiple

To insert multiple rows, provide an array of data objects to the `values` method.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

const insertResult: D1Result<User[]> = await qb
  .insertInto<User>('users') // Specify User as the RowType
  .values([
    { name: 'Jane Doe', email: 'jane.doe@example.com' },
    { name: 'Peter Pan', email: 'peter.pan@example.com' },
  ])
  .returning(['id', 'name', 'email'])
  .execute();

if (insertResult.success && insertResult.results) {
  console.log('New users inserted:', insertResult.results);
}
```

### Insert Without Returning

If you don't need data back, omit `returning`. The result will typically contain metadata about the operation.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

// RowType can be unknown or a generic object if not returning specific fields
const insertResult: D1Result<unknown> = await qb
  .insertInto('users')
  .values({
    name: 'Anonymous User',
    email: 'anonymous@example.com',
  })
  .execute();

if (insertResult.success) {
  console.log('User inserted. Changes:', insertResult.meta?.changes);
}
```

### On Conflict - IGNORE

Use `onConflict` with `'IGNORE'` (or the `ConflictTypes` enum).

```typescript
import { D1QB, ConflictTypes } from 'workers-qb';

// ... (QB initialization) ...

await qb
  .insertInto('users')
  .values({
    email: 'john.doe@example.com', // Assuming 'email' is unique and may exist
    name: 'Duplicate User Attempt',
  })
  .onConflict(ConflictTypes.IGNORE) // or .onConflict('IGNORE')
  .execute();

console.log('Insert attempted, conflict ignored if email exists.');
```

### On Conflict - REPLACE

Use `onConflict` with `'REPLACE'` (or the `ConflictTypes` enum). *Note: `REPLACE` is specific to SQLite/D1.*

```typescript
import { D1QB, ConflictTypes } from 'workers-qb';

// ... (QB initialization) ...

await qb
  .insertInto('users')
  .values({
    email: 'john.doe@example.com',
    name: 'Updated John Doe Name',
  })
  .onConflict(ConflictTypes.REPLACE) // or .onConflict('REPLACE')
  .execute();

console.log('Insert attempted, row replaced if email exists.');
```

### On Conflict - UPSERT (UPDATE)

For UPSERT, use `onConflict` with an object detailing the conflict target and update actions.

```typescript
import { D1QB, Raw } from 'workers-qb';

// ... (QB initialization) ...

await qb
  .insertInto('users')
  .values({
    email: 'john.doe@example.com',
    name: 'John Doe',
    login_count: 1,
  })
  .onConflict({
    column: 'email', // Conflict target column(s)
    data: {
      login_count: new Raw('login_count + 1'),
      name: 'John Doe Verified', // Example: update name as well
      // For PG, you might use something like:
      // login_count: new Raw('users.login_count + 1'),
      // name: new Raw('EXCLUDED.name'),
    },
    // where: { conditions: 'users.isActive = ?', params: [true] } // Optional: for targeted upsert on PG
  })
  .execute();

console.log('Insert attempted, row updated (UPSERT) if email exists.');
```
*Note: For PostgreSQL, the `data` in `onConflict` can use `EXCLUDED.column_name` to refer to values from the attempted insert using `Raw`. D1's `ON CONFLICT DO UPDATE` is simpler and doesn't use `EXCLUDED`.*

## Select

### Simple Select All

Retrieve all columns and rows using `select('tableName').all()`.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

// The .select<User>() call informs the RowType for the D1Result
const allUsersResult: D1Result<User[]> = await qb
  .select<User>('users')
  .all();

if (allUsersResult.success) {
  console.log('All users:', allUsersResult.results);
}
```

### Select Specific Fields

Use the `fields()` method.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

type UserNameAndEmail = {
  name: string;
  email: string;
};

const userNamesAndEmailsResult: D1Result<UserNameAndEmail[]> = await qb
  .select<UserNameAndEmail>('users')
  .fields(['name', 'email']) // Or .fields('name, email')
  .all();

if (userNamesAndEmailsResult.success) {
  console.log('User names and emails:', userNamesAndEmailsResult.results);
}
```

### `one()`

Use `one()` to retrieve a single row.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

// D1Result will contain User | undefined in its 'results' field
const singleUserResult: D1Result<User | undefined> = await qb
  .select<User>('users')
  .where('id = ?', [1])
  .one();

if (singleUserResult.success) {
  console.log('Single user:', singleUserResult.results);
}
```

### `all()`

`all()` retrieves multiple rows.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

const activeUsersResult: D1Result<User[]> = await qb
  .select<User>('users')
  .where('created_at > ?', [new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()])
  .orderBy('created_at DESC')
  .all();

if (activeUsersResult.success) {
  console.log('Active users:', activeUsersResult.results);
}
```

## Update

### Simple Update

Use `updateTable('tableName').set({ ... }).where(...).execute()`.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

// For updates without returning, RowType might be unknown or a generic object
const updateResult: D1Result<unknown> = await qb
  .updateTable('users')
  .set({ name: 'Updated Name' })
  .where('email = ?', ['john.doe@example.com'])
  .execute();

if (updateResult.success) {
  console.log('User name updated. Changes:', updateResult.meta?.changes);
}
```

### Update Returning Fields

Use `returning()` to get back the updated rows.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

type UpdatedUser = {
  id: number;
  name: string;
  email: string;
};

const updatedUserResult: D1Result<UpdatedUser[]> = await qb
  .updateTable<UpdatedUser>('users') // Specify RowType for returning
  .set({ name: 'Corrected John Doe' })
  .where('id = ?', [1])
  .returning(['id', 'name', 'email'])
  .execute();

if (updatedUserResult.success && updatedUserResult.results) {
  console.log('Updated user(s):', updatedUserResult.results);
}
```

### Update Without Returning

Omit `returning()` for performance.

```typescript
import { D1QB, Raw } from 'workers-qb';

// ... (QB initialization) ...

await qb
  .updateTable('users')
  .set({ last_login: new Raw('CURRENT_TIMESTAMP') })
  .where('email = ?', ['john.doe@example.com'])
  .execute();

console.log('User last login updated.');
```

## Delete

### Simple Delete

Use `deleteFrom('tableName').where(...).execute()`.

```typescript
import { D1QB } from 'workers-qb';

// ... (QB initialization) ...

await qb
  .deleteFrom('users')
  .where('email = ?', ['anonymous@example.com'])
  .execute();

console.log('Anonymous user deleted.');
```

### Delete Returning Fields

Use `returning()` to get back deleted rows.

```typescript
import { D1QB } from 'workers-qb';
import { D1Result } from 'workers-qb';

// ... (QB initialization) ...

type DeletedUser = {
  id: number;
  name: string;
  email: string;
};

const deletedUserResult: D1Result<DeletedUser[]> = await qb
  .deleteFrom<DeletedUser>('users') // Specify RowType for returning
  .where('id = ?', [5])
  .returning(['id', 'name', 'email'])
  .execute();

if (deletedUserResult.success && deletedUserResult.results) {
  console.log('Deleted user(s):', deletedUserResult.results);
}
```

### Delete Without Returning

Omit `returning()` for performance.

```typescript
import { D1QB } from 'workers-qb';

// ... (QB initialization) ...

await qb
  .deleteFrom('users')
  .where('created_at < ?', [new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()])
  .execute();

console.log('Old users deleted.');
```
