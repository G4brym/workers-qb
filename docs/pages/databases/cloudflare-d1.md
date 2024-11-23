# Cloudflare D1

## Create a database

```bash
wrangler d1 create <DATABASE_NAME>
```

```
----
filename: wrangler.toml
----

[[d1_databases]]
binding = "DB" # i.e. available in your Worker on env.DB
database_name = "<DATABASE_NAME>"
database_id = "<unique-ID-for-your-database>"
```

## Write queries within your Worker

```ts
import { D1QB } from 'workers-qb'

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB)

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

    return Response.json({
      activeEmployees: fetched.results?.count || 0,
    })
  },
}
```

## Batch queries

One of the main Cloudflare D1 features is the ability to batch together a bunch of queries and execute them in a single
run.

```ts
import { D1QB } from 'workers-qb'

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB)

    const fetched = await qb.batchExecute([
      qb.fetchAll({
        tableName: 'tableA',
      }),
      qb.fetchAll({
        tableName: 'tableB',
      }),
    ])

    return Response.json({
      tableARows: fetched[0].results,
      tableBRows: fetched[1].results,
    })
  },
}
```
