# Gemini Project Overview: workers-qb

This document provides a comprehensive overview of the `workers-qb` project for language models.

## Project Overview

`workers-qb` is a zero-dependency, lightweight, and performance-oriented query builder designed specifically for Cloudflare Workers and other edge computing environments. It offers a fluent and intuitive API for constructing SQL queries while maintaining the performance of raw SQL by avoiding the overhead of a traditional ORM.

### Key Features

- **Zero Dependencies:** Extremely lightweight, perfect for the resource-constrained environment of Cloudflare Workers.
- **High Performance:** Bypasses ORM overhead for near-raw SQL performance.
- **Full TypeScript Support:** Provides end-to-end type safety for robust and maintainable code.
- **Modular `select` Builder:** A chainable and intuitive interface for building complex `SELECT` queries.
- **Database Migrations:** Built-in support for managing database schema evolution.
- **Cloudflare Optimized:** Designed and optimized for Cloudflare Workers, D1, and Durable Objects.
- **Extensible:** Can be extended to support other SQL-based databases.

## Core Concepts

The core of `workers-qb` is the `QueryBuilder` class, which provides the fundamental query-building methods. This base class is extended by database-specific classes that handle the actual query execution.

- **`QueryBuilder`:** The main class that provides methods like `select`, `insert`, `update`, `delete`, `createTable`, and `dropTable`. It constructs the SQL queries but does not execute them.
- **`D1QB`:** Extends `QueryBuilder` to work with **Cloudflare D1**. It implements the `execute` and `batchExecute` methods using the D1 client API.
- **`DOQB`:** Extends `QueryBuilder` for **Cloudflare Durable Objects**' SQLite-based storage. It provides a synchronous `execute` method and a `lazyExecute` method for iterating over large result sets.
- **`PGQB`:** Extends `QueryBuilder` to connect to external **PostgreSQL** databases using the `node-postgres` library.

## Supported Databases

- **Cloudflare D1:** Use the `D1QB` class.
- **Cloudflare Durable Objects:** Use the `DOQB` class.
- **PostgreSQL:** Use the `PGQB` class.
- **Bring Your Own Database (BYODB):** The library is designed to be extensible. You can create your own `QueryBuilder` subclass to support other databases.

## Basic Usage (CRUD)

### Connecting to a Database

**Cloudflare D1:**
```typescript
import { D1QB } from 'workers-qb';
const qb = new D1QB(env.DB);
```

**Cloudflare Durable Objects:**
```typescript
import { DOQB } from 'workers-qb';
const qb = new DOQB(this.storage.sql);
```

**PostgreSQL:**
```typescript
import { PGQB } from 'workers-qb';
import { Client } from 'pg';
const dbClient = new Client(env.DB_URL);
const qb = new PGQB(dbClient);
await qb.connect();
// ...
ctx.waitUntil(qb.close());
```

### `INSERT`

```typescript
const newUser = await qb.insert({
  tableName: 'users',
  data: { name: 'John Doe', email: 'john.doe@example.com' },
  returning: ['id', 'name', 'email'],
}).execute();
```

### `SELECT`

**Fetch all:**
```typescript
const allUsers = await qb.fetchAll({
  tableName: 'users',
}).execute();
```

**Fetch one:**
```typescript
const user = await qb.fetchOne({
  tableName: 'users',
  where: { conditions: 'id = ?', params: 1 },
}).execute();
```

### `UPDATE`

```typescript
const updatedUser = await qb.update({
  tableName: 'users',
  data: { name: 'Jane Doe' },
  where: { conditions: 'id = ?', params: 1 },
  returning: ['id', 'name'],
}).execute();
```

### `DELETE`

```typescript
const deletedUser = await qb.delete({
  tableName: 'users',
  where: { conditions: 'id = ?', params: 1 },
  returning: ['id', 'name'],
}).execute();
```

## Advanced Usage

### Joins

```typescript
const usersWithRoles = await qb.fetchAll({
  tableName: 'users',
  fields: ['users.name', 'roles.name as roleName'],
  join: {
    type: 'LEFT',
    table: 'roles',
    on: 'users.role_id = roles.id',
  },
}).execute();
```

### Subqueries

Subqueries can be used in `WHERE`, `HAVING`, and `JOIN` clauses.

```typescript
const activeProjectsSubquery = qb.select('projects').fields('id').where('status = ?', 'active');

const tasksInActiveProjects = await qb
  .select('tasks')
  .where('project_id IN ?', activeProjectsSubquery)
  .execute();
```

### Modular `select` Builder

The `select` method provides a chainable interface for building queries.

```typescript
const users = await qb.select('users')
  .fields(['name', 'email'])
  .where('is_active = ?', true)
  .orderBy('name ASC')
  .limit(10)
  .execute();
```

### Raw Queries

For complex queries, you can use the `raw` method.

```typescript
const rawResults = await qb.raw({
  query: 'SELECT COUNT(*) as count FROM users WHERE name LIKE ?',
  args: ['J%'],
  fetchType: 'ONE',
}).execute();
```

## Migrations

`workers-qb` includes a migration system to manage database schema changes.

1.  **Define Migrations:** Create an array of migration objects, each with a unique `name` and the `sql` to be executed.

    ```typescript
    import { type Migration } from 'workers-qb';

    const migrations: Migration[] = [
      {
        name: '0001_create_users_table',
        sql: `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);`,
      },
      {
        name: '0002_add_email_to_users',
        sql: `ALTER TABLE users ADD COLUMN email TEXT;`,
      },
    ];
    ```

2.  **Apply Migrations:** Use the `migrations` builder to apply them.

    ```typescript
    const migrationBuilder = qb.migrations({ migrations });
    await migrationBuilder.apply();
    ```

## Type Safety

`workers-qb` is designed to be used with TypeScript for type-safe database interactions.

-   **Define Types:** Create TypeScript types that represent your database tables.
-   **Use Generics:** Provide these types as generics to the query methods (`fetchAll<User>`, `fetchOne<User>`, etc.) to get typed results.

```typescript
type User = {
  id: number;
  name: string;
  email: string;
};

const users = await qb.fetchAll<User>({
  tableName: 'users',
}).execute();

// users.results is now typed as User[] | undefined
```

## Extensibility

You can extend `workers-qb` to support other databases by creating a new class that inherits from `QueryBuilder` and implements the `execute` and `batchExecute` methods for your target database.

## File Structure

-   `src/`: Contains the core source code.
    -   `builder.ts`: The main `QueryBuilder` class.
    -   `modularBuilder.ts`: The `SelectBuilder` for chainable select queries.
    -   `databases/`: Contains the database-specific query builders (`d1.ts`, `do.ts`, `pg.ts`).
    -   `migrations.ts`: The migration system.
    -   `interfaces.ts`: TypeScript interfaces for query options and results.
    -   `tools.ts`: Utility classes like `Raw` and `Query`.
-   `docs/`: Contains the project documentation.
-   `tests/`: Contains unit and integration tests.
