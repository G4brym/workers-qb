---
name: write-queries
description: Guide for writing SELECT, INSERT, UPDATE, DELETE queries with workers-qb
---

# Write Queries Skill

## When to Use

Use this skill when:
- Writing database queries for Cloudflare Workers
- Implementing CRUD operations (Create, Read, Update, Delete)
- Building complex queries with JOINs, subqueries, or aggregations
- Working with D1, Durable Objects SQLite, or PostgreSQL

## Database Selection

| Database | Class | Sync/Async | Import |
|----------|-------|------------|--------|
| Cloudflare D1 | `D1QB` | **async** | `import { D1QB } from 'workers-qb'` |
| Durable Objects | `DOQB` | **sync** | `import { DOQB } from 'workers-qb'` |
| PostgreSQL | `PGQB` | **async** | `import { PGQB } from 'workers-qb'` |

## Critical: Sync vs Async

```typescript
// D1QB/PGQB - ALWAYS use await
const result = await qb.fetchAll({ tableName: 'users' }).execute();

// DOQB - NEVER use await (synchronous)
const result = qb.fetchAll({ tableName: 'users' }).execute();
```

**DOQB is synchronous.** This is the most common mistake. Inside Durable Objects:

```typescript
// CORRECT
const users = qb.fetchAll({ tableName: 'users' }).execute();

// WRONG - don't await DOQB
const users = await qb.fetchAll({ tableName: 'users' }).execute();
```

## Schema Definition

Define a schema type for autocomplete and type safety:

```typescript
type Schema = {
  users: {
    id: number;
    name: string;
    email: string;
    created_at: string;
  };
  posts: {
    id: number;
    user_id: number;
    title: string;
    content: string;
  };
};

const qb = new D1QB<Schema>(env.DB);
// Now tableName, fields, returning all have autocomplete
```

---

## SELECT Patterns

### Object Syntax

```typescript
// Fetch all rows
const users = await qb.fetchAll({
  tableName: 'users',
}).execute();

// Fetch one row
const user = await qb.fetchOne({
  tableName: 'users',
  where: {
    conditions: 'id = ?',
    params: [1],
  },
}).execute();

// Select specific fields
const emails = await qb.fetchAll({
  tableName: 'users',
  fields: ['id', 'email'],
}).execute();
```

### Fluent API (SelectBuilder)

```typescript
// Basic chain
const users = await qb.select('users')
  .where('is_active = ?', true)
  .orderBy({ name: 'ASC' })
  .limit(10)
  .all();

// Single row
const user = await qb.select('users')
  .where('id = ?', userId)
  .one();

// Count query
const count = await qb.select('users')
  .where('is_active = ?', true)
  .count();

console.log(count.results?.total);
```

### WHERE Clauses

```typescript
// Single condition
where: {
  conditions: 'email = ?',
  params: ['john@example.com'],
}

// Multiple conditions (AND)
where: {
  conditions: ['status = ?', 'role_id = ?'],
  params: ['active', 2],
}

// Numbered parameters (for reuse)
where: {
  conditions: 'owner_id = ?1 OR assignee_id = ?1',
  params: ['user123'],
}

// Simple string (no params)
where: 'is_active = true'

// String array (AND, no params)
where: ['is_active = true', 'deleted_at IS NULL']
```

### whereIn for Bulk Lookups

```typescript
// Single column
const users = await qb.select('users')
  .whereIn('id', [1, 2, 3, 4, 5])
  .all();

// Multiple columns (composite key)
const records = await qb.select('assignments')
  .whereIn(['user_id', 'project_id'], [[1, 101], [2, 102], [3, 103]])
  .all();
```

### JOINs

```typescript
// INNER JOIN
const usersWithRoles = await qb.fetchAll({
  tableName: 'users',
  fields: ['users.name', 'roles.name AS role_name'],
  join: {
    type: 'INNER',
    table: 'roles',
    on: 'users.role_id = roles.id',
  },
}).execute();

// LEFT JOIN
join: {
  type: 'LEFT',
  table: 'profiles',
  on: 'users.id = profiles.user_id',
}

// Multiple JOINs
join: [
  { type: 'INNER', table: 'roles', on: 'users.role_id = roles.id' },
  { type: 'LEFT', table: 'profiles', on: 'users.id = profiles.user_id' },
]
```

### Subqueries

```typescript
// IN with subquery
const activeProjectsQuery = qb
  .select('projects')
  .fields('id')
  .where('status = ?', 'active');

const tasks = await qb.select('tasks')
  .where('project_id IN ?', activeProjectsQuery)
  .all();

// EXISTS with subquery
const permissionQuery = qb
  .select('permissions')
  .where('user_id = ?', userId)
  .where('action = ?', 'edit');

const docs = await qb.select('documents')
  .where('EXISTS ?', permissionQuery)
  .all();
```

### Pagination

```typescript
const pageSize = 20;
const page = 2;

const users = await qb.fetchAll({
  tableName: 'users',
  orderBy: 'created_at DESC',
  limit: pageSize,
  offset: (page - 1) * pageSize,
}).execute();
```

### Order By

```typescript
// Simple
orderBy: 'name'

// With direction
orderBy: { name: 'DESC' }

// Multiple columns
orderBy: [
  { created_at: 'DESC' },
  'name ASC',
]
```

### Group By and Having

```typescript
const stats = await qb.fetchAll({
  tableName: 'orders',
  fields: ['customer_id', 'COUNT(*) as order_count', 'SUM(total) as total_spent'],
  groupBy: 'customer_id',
  having: 'SUM(total) > 1000',
}).execute();
```

### Lazy Execution (Large Datasets)

```typescript
// D1/PostgreSQL - AsyncIterable
const lazyResult = await qb.fetchAll({
  tableName: 'large_table',
  lazy: true,
}).execute();

for await (const row of lazyResult.results!) {
  processRow(row);
}

// DOQB - Iterable (sync)
const lazyResult = qb.fetchAll({
  tableName: 'large_table',
  lazy: true,
}).execute();

for (const row of lazyResult.results!) {
  processRow(row);
}
```

---

## INSERT Patterns

### Single Row

```typescript
const newUser = await qb.insert({
  tableName: 'users',
  data: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  returning: '*',
}).execute();
```

### Multiple Rows

```typescript
const newUsers = await qb.insert({
  tableName: 'users',
  data: [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
  ],
  returning: ['id', 'name'],
}).execute();
```

### ON CONFLICT - IGNORE

Skip insertion if conflict occurs:

```typescript
await qb.insert({
  tableName: 'users',
  data: { email: 'existing@example.com', name: 'Ignored' },
  onConflict: 'IGNORE',
}).execute();
```

### ON CONFLICT - REPLACE

Replace existing row on conflict:

```typescript
await qb.insert({
  tableName: 'users',
  data: { email: 'existing@example.com', name: 'Replaced' },
  onConflict: 'REPLACE',
}).execute();
```

### UPSERT (ON CONFLICT DO UPDATE)

```typescript
import { Raw } from 'workers-qb';

await qb.insert({
  tableName: 'users',
  data: {
    email: 'john@example.com',
    name: 'John',
    login_count: 1,
  },
  onConflict: {
    column: 'email',  // or ['email', 'tenant_id'] for composite
    data: {
      login_count: new Raw('login_count + 1'),
      updated_at: new Raw('CURRENT_TIMESTAMP'),
    },
    // Optional: conditional update
    where: 'excluded.updated_at > users.updated_at',
  },
}).execute();
```

### Using Raw for SQL Expressions

```typescript
import { Raw } from 'workers-qb';

await qb.insert({
  tableName: 'posts',
  data: {
    title: 'My Post',
    created_at: new Raw('CURRENT_TIMESTAMP'),
    slug: new Raw("LOWER(REPLACE('My Post', ' ', '-'))"),
  },
}).execute();
```

---

## UPDATE Patterns

### Basic Update

```typescript
await qb.update({
  tableName: 'users',
  data: {
    name: 'Updated Name',
  },
  where: {
    conditions: 'id = ?',
    params: [userId],
  },
}).execute();
```

### Update with Raw Expressions

```typescript
import { Raw } from 'workers-qb';

await qb.update({
  tableName: 'posts',
  data: {
    view_count: new Raw('view_count + 1'),
    updated_at: new Raw('CURRENT_TIMESTAMP'),
  },
  where: {
    conditions: 'id = ?',
    params: [postId],
  },
}).execute();
```

### Update with Returning

```typescript
const updated = await qb.update({
  tableName: 'users',
  data: { status: 'verified' },
  where: {
    conditions: 'email = ?',
    params: ['john@example.com'],
  },
  returning: ['id', 'status', 'updated_at'],
}).execute();

console.log(updated.results);
```

### Multiple WHERE Conditions

```typescript
await qb.update({
  tableName: 'tasks',
  data: { status: 'completed' },
  where: {
    conditions: ['project_id = ?', 'assignee_id = ?'],
    params: [projectId, userId],
  },
}).execute();
```

---

## DELETE Patterns

### Basic Delete

```typescript
await qb.delete({
  tableName: 'sessions',
  where: {
    conditions: 'user_id = ?',
    params: [userId],
  },
}).execute();
```

### Delete with Returning

```typescript
const deleted = await qb.delete({
  tableName: 'users',
  where: {
    conditions: 'id = ?',
    params: [userId],
  },
  returning: ['id', 'email'],
}).execute();

console.log('Deleted:', deleted.results);
```

### Ordered Delete with Limit

```typescript
// Delete oldest 100 expired sessions
await qb.delete({
  tableName: 'sessions',
  where: 'expires_at < CURRENT_TIMESTAMP',
  orderBy: 'expires_at ASC',
  limit: 100,
}).execute();
```

---

## Raw Queries

For complex SQL not covered by the builder:

```typescript
import { FetchTypes } from 'workers-qb';

// Fetch multiple rows
const results = await qb.raw({
  query: 'SELECT * FROM users WHERE email LIKE ?',
  args: ['%@example.com'],
  fetchType: FetchTypes.ALL,  // or 'ALL'
}).execute();

// Fetch single row
const user = await qb.raw({
  query: 'SELECT * FROM users WHERE id = ? LIMIT 1',
  args: [userId],
  fetchType: FetchTypes.ONE,  // or 'ONE'
}).execute();

// Execute without fetching (INSERT/UPDATE/DELETE)
await qb.raw({
  query: 'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?',
  args: [userId],
}).execute();
```

---

## Checklist

Before executing queries, verify:

- [ ] Called `.execute()` on the query
- [ ] Using `await` for D1QB/PGQB, **no** `await` for DOQB
- [ ] Using parameterized queries (`?` placeholders), not string interpolation
- [ ] WHERE clause is provided for UPDATE/DELETE (to avoid affecting all rows)
- [ ] Schema type is defined for autocomplete and type safety
- [ ] Using `Raw` for SQL expressions (not strings) in data objects

## Common Mistakes

```typescript
// WRONG: Forgot .execute()
const users = await qb.fetchAll({ tableName: 'users' });

// CORRECT
const users = await qb.fetchAll({ tableName: 'users' }).execute();

// WRONG: String interpolation (SQL injection risk)
where: `email = '${userEmail}'`

// CORRECT: Parameterized
where: { conditions: 'email = ?', params: [userEmail] }

// WRONG: Using await with DOQB
const result = await doqb.fetchAll({ tableName: 'users' }).execute();

// CORRECT: No await with DOQB
const result = doqb.fetchAll({ tableName: 'users' }).execute();
```
