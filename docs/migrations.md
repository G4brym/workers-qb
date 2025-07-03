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

#### Applying Migrations in D1

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization and migrations definition as before) ...

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);
    const migrationBuilder = qb.migrations({ migrations });

    await migrationBuilder.apply(); // Apply pending migrations for D1

    // ... your application logic ...
  },
};
```

#### Applying Migrations in Durable Objects

```typescript
import { DOQB } from 'workers-qb';

export class MyDurableObject extends DurableObject {
  #qb: DOQB;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    this.#qb = new DOQB(this.ctx.storage.sql);
    void this.ctx.blockConcurrencyWhile(() => {
      // Assuming 'migrations' is an array of Migration objects defined elsewhere
      const migrationBuilder = this.#qb.migrations({ migrations });
      migrationBuilder.apply();
    });
  }

  getUsers(): Array<object> {
    // Example method, ensure migrations are applied before accessing tables
    // Operations within Durable Objects are generally synchronous after the initial setup.
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

