# workers-qb

Zero dependencies Query Builder for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

This module provides a simple standardized interface while keeping the benefits and speed of using raw queries over a
traditional ORM.

`workers-qb` is not intended to provide ORM-like functionality, rather to make it easier to interact with the database
from code for direct SQL access using convenient wrapper methods.

Currently, 2 databases are supported:

- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [PostgreSQL (using node-postgres)](https://developers.cloudflare.com/workers/databases/connect-to-postgres/)

Read the documentation [workers-qb.massadas.com](https://workers-qb.massadas.com/)!

## Features

- [x] Zero dependencies.
- [x] Fully typed/TypeScript support
- [x] SQL Type checking with compatible IDE's
- [x] Insert/Update/Select/Delete/Join queries
- [x] On Conflict for Inserts and Updates
- [x] Create/drop tables
- [x] Keep where conditions simple in code
- [x] Bulk insert
- [x] Workers D1 Support
- [x] Workers PostgreSQL Support
- [ ] Named parameters (waiting for full support in D1)

## Installation

```
npm install workers-qb --save
```

## Example Cloudflare D1 Usage

```ts
import { D1QB } from 'workers-qb'

export interface Env {
  DB: any
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB)

    const fetched = await qb.fetchOne({
      tableName: 'employees',
      fields: 'count(*) as count',
      where: {
        conditions: 'active = ?1',
        params: [true],
      },
    })

    return Response.json({
      activeEmployees: fetched.results?.count || 0,
    })
  },
}
```

## Example Cloudflare Workers with PostgreSQL Usage

Remember to close the connection using `ctx.waitUntil(qb.close());` or `await qb.close();` at the end of your request.
You may also reuse this connection to execute multiple queries, or share it between multiple requests if you are using
a connection pool in front of your PostgreSQL.

You must also enable `node_compat = true` in your `wrangler.toml`

You need to install `node-postgres`:

```bash
npm install pg --save
```

```ts
import { PGQB } from 'workers-qb'

export interface Env {
  DB_URL: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new PGQB(env.DB_URL)
    await qb.connect()

    const fetched = await qb.fetchOne({
      tableName: 'employees',
      fields: 'count(*) as count',
      where: {
        conditions: 'active = ?1',
        params: [true],
      },
    })

    ctx.waitUntil(qb.close())
    return Response.json({
      activeEmployees: fetched.results?.count || 0,
    })
  },
}
```

#### Fetching a single record

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchOne({
  tableName: 'employees',
  fields: 'count(*) as count',
  where: {
    conditions: 'department = ?1',
    params: ['HQ'],
  },
})

console.log(`There are ${fetched.results.count} employees in the HR department`)
```

#### Fetching multiple records

```ts
import { OrderTypes } from 'workers-qb'
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
  tableName: 'employees',
  fields: ['role', 'count(*) as count'],
  where: {
    conditions: 'department = ?1',
    params: ['HR'],
  },
  groupBy: 'role',
  orderBy: {
    count: OrderTypes.DESC,
  },
})

console.log(`Roles in the HR department:`)

fetched.results.forEach((employee) => {
  console.log(`${employee.role} has ${employee.count} employees`)
})
```

#### Inserting rows

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

const inserted = await qb.insert({
  tableName: 'employees',
  data: {
    name: 'Joe',
    role: 'manager',
    department: 'store',
    created_at: new Raw('CURRENT_TIMESTAMP'),
  },
  returning: '*',
})

console.log(inserted) // This will contain the data after SQL triggers and primary keys that are automated
```

## Bulk Inserting rows

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

const inserted = await qb.insert({
  tableName: 'employees',
  data: [
    {
      name: 'Joe',
      role: 'manager',
      department: 'store',
      created_at: new Raw('CURRENT_TIMESTAMP'),
    },
    {
      name: 'John',
      role: 'employee',
      department: 'store',
      created_at: new Raw('CURRENT_TIMESTAMP'),
    },
    {
      name: 'Mickael',
      role: 'employee',
      department: 'store',
      created_at: new Raw('CURRENT_TIMESTAMP'),
    },
  ],
})
```

#### Updating rows

```ts
const updated = await qb.update({
  tableName: 'employees',
  data: {
    role: 'CEO',
    department: 'HQ',
  },
  where: {
    conditions: 'id = ?1',
    params: [123],
  },
})

console.log(`Lines affected in this query: ${updated.changes}`)
```

#### Deleting rows

```ts
const deleted = await qb.delete({
  tableName: 'employees',
  where: {
    conditions: 'id = ?1',
    params: [123],
  },
})

console.log(`Lines affected in this query: ${deleted.changes}`)
```

#### Dropping and creating tables

```ts
const created = await qb.createTable({
  tableName: 'testTable',
  schema: `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    `,
  ifNotExists: true,
})

const dropped = await qb.dropTable({
  tableName: 'testTable',
})
```
