# workers-qb

### [Read the documentation here!](https://workers-qb.massadas.com/)

Zero dependencies Query Builder for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

This module provides a simple standardized interface while keeping the benefits and speed of using raw queries over a
traditional ORM.

`workers-qb` is not intended to provide ORM-like functionality, rather to make it easier to interact with the database
from code for direct SQL access using convenient wrapper methods.

Currently, 2 databases are supported:

- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [PostgreSQL (using node-postgres)](https://developers.cloudflare.com/workers/databases/connect-to-postgres/)

## Features

- [x] Zero dependencies.
- [x] Fully typed/TypeScript support
- [x] SQL Type checking with compatible IDE's
- [x] Create/drop tables
- [x] [Insert/Bulk Inserts/Update/Select/Delete/Join queries](https://workers-qb.massadas.com/basic-queries/)
- [x] [On Conflict for Inserts and Updates](https://workers-qb.massadas.com/advanced-queries/onConflict/)
- [x] [Upsert](https://workers-qb.massadas.com/advanced-queries/upsert/)
- [x] [Support for Cloudflare Workers D1](https://workers-qb.massadas.com/databases/cloudflare-d1/)
- [x] [Support for Cloudflare Workers PostgreSQL (using node-postgres)](https://workers-qb.massadas.com/databases/postgresql/)
- [ ] Named parameters (waiting for full support in D1)

## Installation

```
npm install workers-qb --save
```

## Example for Cloudflare Workers D1

```ts
import { D1QB } from 'workers-qb'

export interface Env {
  DB: any
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB)

    type Employee = {
      name: string
      role: string
      level: number
    }

    const employeeList = await qb
      .fetchOne<Employee>({
        tableName: 'employees',
        fields: '*',
        where: {
          conditions: 'active = ?1',
          params: [true],
        },
      })
      .execute()

    // You get IDE type hints on each employee data, like:
    // employeeList.results[0].name

    return Response.json({
      activeEmployees: employeeList.results?.length || 0,
    })
  },
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
