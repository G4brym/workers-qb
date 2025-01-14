# workers-qb

### [Read the documentation here!](https://workers-qb.massadas.com/)

Zero dependencies Query Builder for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

This module provides a simple standardized interface while keeping the benefits and speed of using raw queries over a
traditional ORM.

`workers-qb` is not intended to provide ORM-like functionality, rather to make it easier to interact with the database
from code for direct SQL access using convenient wrapper methods.

Currently, 3 databases are supported:

- [Cloudflare D1](https://workers-qb.massadas.com/databases/cloudflare-d1/)
- [Cloudflare Durable Objects](https://workers-qb.massadas.com/databases/cloudflare-do/)
- [PostgreSQL (using node-postgres)](https://workers-qb.massadas.com/databases/postgresql/)
- [Bring your own Database](https://workers-qb.massadas.com/databases/bring-your-own-database/)

## Features

- [x] Zero dependencies
- [x] Fully typed/TypeScript support
- [x] [Migrations](https://workers-qb.massadas.com/migrations/)
- [x] [Type Checks for data read](https://workers-qb.massadas.com/type-check/)
- [x] [Create/drop tables](https://workers-qb.massadas.com/basic-queries/#dropping-and-creating-tables)
- [x] [Insert/Bulk Inserts/Update/Select/Delete/Join queries](https://workers-qb.massadas.com/basic-queries/)
- [x] [Modular selects](https://workers-qb.massadas.com/modular-selects/) (qb.select(...).where(...).where(...).one())
- [x] [On Conflict for Inserts and Updates](https://workers-qb.massadas.com/advanced-queries/onConflict/)
- [x] [Upsert](https://workers-qb.massadas.com/advanced-queries/upsert/)
- [x] Lazy Load Rows

## Installation

```
npm install workers-qb --save
```

## Example for Cloudflare Workers D1

```ts
import { D1QB } from 'workers-qb'

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB)

    type Employee = {
      name: string
      role: string
      level: number
    }

    // Generated query: SELECT * FROM employees WHERE active = ?1
    const employeeList = await qb
      .fetchAll<Employee>({
        tableName: 'employees',
        where: {
          conditions: 'active = ?1',
          params: [true],
        },
      })
      .execute()

    // Or in a modular approach
    const employeeListModular = await qb.select<Employee>('employees').where('active = ?', true).execute()

    // You get IDE type hints on each employee data, like:
    // employeeList.results[0].name

    return Response.json({
      activeEmployees: employeeList.results?.length || 0,
    })
  },
}
```

## Example for Cloudflare Durable Objects

```ts
import { DOQB } from 'workers-qb'

export class DOSRS extends DurableObject {
  getEmployees() {
    const qb = new DOQB(this.ctx.storage.sql)

    const fetched = qb
      .fetchAll({
        tableName: 'employees',
      })
      .execute()

    return fetched.results
  }
}
```

## Example for Cloudflare Workers with PostgreSQL

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
import { Client } from 'pg'

export interface Env {
  DB_URL: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new PGQB(new Client(env.DB_URL))
    await qb.connect()

    // Generated query: SELECT count(*) as count FROM employees WHERE active = ?1 LIMIT 1
    const fetched = await qb
      .fetchOne({
        tableName: 'employees',
        fields: 'count(*) as count',
        where: {
          conditions: 'active = ?1',
          params: [true],
        },
      })
      .execute()

    ctx.waitUntil(qb.close())
    return Response.json({
      activeEmployees: fetched.results?.count || 0,
    })
  },
}
```
