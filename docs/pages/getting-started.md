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
