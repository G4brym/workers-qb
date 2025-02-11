# Database Migrations

`workers-qb` provides a built-in migration system to manage changes to your database schema in a structured and version-controlled way. Migrations are essential for evolving your database schema over time, ensuring consistency across different environments, and enabling collaboration among developers.

## Introduction to Database Migrations

Database migrations are scripts that define changes to your database schema. Each migration typically represents a specific set of changes, such as creating a new table, adding a column, or modifying an existing column. Migrations are applied in a sequential order, allowing you to track and manage the evolution of your database schema.

`workers-qb` migrations offer:

*   **Schema Versioning:** Track database schema changes over time.
*   **Reproducibility:** Apply migrations consistently across development, staging, and production environments.

## Setting up Migrations

To use migrations with `workers-qb`, you need to set up a migrations folder and initialize the migrations system.

### Creating a Migrations Folder

Create a dedicated folder in your project to store your migration files. A common convention is to name it `migrations`.

```
project-root/
├── migrations/
│   └── ... migration files will go here ...
├── src/
│   └── ... your application code ...
├── wrangler.toml
└── package.json
```

### Initializing Migrations Table

`workers-qb` uses a table to track applied migrations. You need to initialize this table in your database. This is typically done once when you set up migrations for your project.

#### For Cloudflare D1

For Cloudflare D1, you will use the `asyncMigrationsBuilder`.

```typescript
import { D1QB } from 'workers-qb';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);

    const migrations = [
        {
            name: '0001_create_users_table',
            sql: `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `
        }
        // ... more migrations ...
    ];

    const migrationBuilder = qb.migrations({
        migrations: migrations,
    });

    await migrationBuilder.initialize(); // Initialize migrations table for D1

    // ... your application logic ...
  },
};
```

#### For Cloudflare Durable Objects

For Cloudflare Durable Objects, you will use the `syncMigrationsBuilder`.

```typescript
import { DOQB } from 'workers-qb';

export class MyDurableObject extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const qb = new DOQB(this.storage.sql);

    const migrations = [
        {
            name: '0001_create_items_table',
            sql: `
                CREATE TABLE IF NOT EXISTS items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    value TEXT
                );
            `
        }
        // ... more migrations ...
    ];

    const migrationBuilder = qb.migrations({
        migrations: migrations,
    });

    migrationBuilder.initialize(); // Initialize migrations table for Durable Objects

    // ... your Durable Object logic ...
    return new Response("Migrations initialized");
  }
}
```

## Creating Migration Files

Each migration is defined as an object with a `name` and `sql` property. The `name` should be a unique identifier for the migration. The `sql` property contains the SQL statements to be executed.

**Example Migration Structure (in code):**

```typescript
// migrations/0001_create_users_table.ts (if using separate files)
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
const migrations = [
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

    const appliedMigrations = await migrationBuilder.apply(); // Apply pending migrations for D1

    if (appliedMigrations.length > 0) {
      console.log('Applied D1 migrations:', appliedMigrations.map(m => m.name));
    } else {
      console.log('No new D1 migrations to apply.');
    }

    // ... your application logic ...
  },
};
```

#### Applying Migrations in Durable Objects

```typescript
import { DOQB } from 'workers-qb';

export class MyDurableObject extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const qb = new DOQB(this.storage.sql);
    const migrationBuilder = qb.migrations({ migrations });

    const appliedMigrations = migrationBuilder.apply(); // Apply pending migrations for Durable Objects

    if (appliedMigrations.length > 0) {
      console.log('Applied DO migrations:', appliedMigrations.map(m => m.name));
    } else {
      console.log('No new DO migrations to apply.');
    }

    // ... your Durable Object logic ...
    return new Response("Migrations applied");
  }
}
```

## Checking Migration Status

You can check the status of your migrations using the `getApplied()` and `getUnapplied()` methods, which work similarly for both D1 and Durable Objects.

### Listing Applied Migrations

#### For D1

```typescript
import { D1QB } from 'workers-qb';
// ...
const appliedMigrations = await migrationBuilder.getApplied(); // For D1
// ...
```

#### For Durable Objects

```typescript
import { DOQB } from 'workers-qb';
// ...
const appliedMigrations = migrationBuilder.getApplied(); // For Durable Objects
// ...
```

### Listing Unapplied Migrations

#### For D1

```typescript
import { D1QB } from 'workers-qb';
// ...
const unappliedMigrations = await migrationBuilder.getUnapplied(); // For D1
// ...
```

#### For Durable Objects

```typescript
import { DOQB } from 'workers-qb';
// ...
const unappliedMigrations = migrationBuilder.getUnapplied(); // For Durable Objects
// ...
```
