# Database Migrations

`workers-qb` provides a built-in migration system to manage changes to your database schema in a structured and version-controlled way. Migrations are essential for evolving your database schema over time, ensuring consistency across different environments, and enabling collaboration among developers.

## Introduction to Database Migrations

Database migrations are scripts that define changes to your database schema. Each migration typically represents a specific set of changes, such as creating a new table, adding a column, or modifying an existing column. Migrations are applied in a sequential order, allowing you to track and manage the evolution of your database schema.

`workers-qb` migrations offer:

*   **Schema Versioning:** Track database schema changes over time.
*   **Reproducibility:** Apply migrations consistently across development, staging, and production environments.

## Creating Migration Files

Each migration is defined as an object with a `name` and `sql` property. The `name` should be a unique identifier for the migration (e.g., `YYYYMMDDHHMMSS_descriptive_name` or a sequential number like `0001_descriptive_name`). The `sql` property contains the SQL statements to be executed.

You can organize your migration files as you see fit. For example, you might have one `.ts` file per migration object, or a single file that exports an array of all migration objects.

**Example Migration Structure (in code):**

```typescript
// Optionally you can type the migrations with Migration
import { type Migration } from 'workers-qb';

// Example: migrations/0001_create_users_table.ts (if using separate files)
export const createUsersTableMigration = {
    name: '0001_create_users_table',
    sql: `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `
};

// migrations/0002_add_role_to_users.ts
export const addRoleToUsersMigration = {
    name: '0002_add_role_to_users',
    sql: `
        ALTER TABLE users ADD COLUMN role_id INTEGER;
    `
};

// ... more migration files ...

// In your main worker code, you would collect these migrations, e.g.,
const migrations: Migration[] = [
    createUsersTableMigration,
    addRoleToUsersMigration,
    // ... import/require more migrations ...
];
```

## Applying Migrations

To apply pending migrations, use the `apply()` method on the migrations builder.

### Return Types

The `apply()` method returns an array of applied `Migration` objects:

| Database | Return Type |
|----------|-------------|
| D1QB (Cloudflare D1) | `Promise<Migration[]>` |
| PGQB (PostgreSQL) | `Promise<Migration[]>` |
| DOQB (Durable Objects) | `Migration[]` (synchronous) |

Each `Migration` object contains:
- `name`: The unique identifier of the migration
- `sql`: The SQL that was executed

#### Applying Migrations in D1

```typescript
import { D1QB, type Migration } from 'workers-qb';

// Define your database schema (matches your migrations)
type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
    role_id: number;
    created_at: string;
  };
};

// Define your migrations
const migrations: Migration[] = [
  { name: '0001_create_users_table', sql: `CREATE TABLE IF NOT EXISTS users (...)` },
  { name: '0002_add_role_to_users', sql: `ALTER TABLE users ADD COLUMN role_id INTEGER` },
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB<Schema>(env.DB);
    const migrationBuilder = qb.migrations({ migrations });

    const appliedMigrations = await migrationBuilder.apply(); // Returns Migration[]
    console.log(`Applied ${appliedMigrations.length} migrations`);

    // Now use qb with full type safety
    const users = await qb.fetchAll({ tableName: 'users' }).execute();
    // ...
  },
};
```

#### Applying Migrations in Durable Objects

```typescript
import { DOQB, type Migration } from 'workers-qb';

// Define your database schema
type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
  };
};

const migrations: Migration[] = [
  { name: '0001_create_users_table', sql: `CREATE TABLE IF NOT EXISTS users (...)` },
];

export class MyDurableObject extends DurableObject {
  #qb: DOQB<Schema>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    this.#qb = new DOQB<Schema>(this.ctx.storage.sql);
    // Note: blockConcurrencyWhile expects a Promise, so we use async wrapper
    // even though DOQB operations are synchronous
    void this.ctx.blockConcurrencyWhile(async () => {
      const migrationBuilder = this.#qb.migrations({ migrations });
      const applied = migrationBuilder.apply(); // Synchronous - returns Migration[]
      console.log(`Applied ${applied.length} migrations`);
    });
  }

  getUsers() {
    // Type-safe query - results is typed as Schema['users'][]
    return this.#qb.select('users').all().results;
  }
}
```

## Checking Migration Status

You can check the status of your migrations using the `getApplied()` and `getUnapplied()` methods, which work similarly for both D1 and Durable Objects.

### Listing Applied Migrations

```typescript
import { D1QB } from 'workers-qb';
// ...
// Assuming 'env' and 'migrations' are defined as in previous examples
const qb = new D1QB(env.DB);
const migrationBuilder = qb.migrations({ migrations });
const appliedMigrations = await migrationBuilder.getApplied();
// ...
```

### Listing Unapplied Migrations

```typescript
import { D1QB } from 'workers-qb';
// ...
// Assuming 'env' and 'migrations' are defined as in previous examples
const qb = new D1QB(env.DB);
const migrationBuilder = qb.migrations({ migrations });
const unappliedMigrations = await migrationBuilder.getUnapplied();
// ...
```

