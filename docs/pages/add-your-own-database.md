Because workers-qb is built in a modular way, you can actually use it with almost any database you like.
All you need to do is implement your own `QueryBuilder` class.

In this example we followed the tutorial [Query Postgres from Workers using a database connector](https://developers.cloudflare.com/workers/tutorials/query-postgres-from-workers-using-database-connectors/)
from the official docs and successfully made workers-qb work on the Postgres database.

```ts
import { Client } from './driver/postgres'
import { FetchTypes, QueryBuilder, Raw } from 'workers-qb'

export class PGQB extends QueryBuilder {
  constructor() {
    super()
  }

  async execute(params: {
    query: String
    arguments?: (string | number | boolean | null | Raw)[]
    fetchType?: FetchTypes
  }): Promise<any> {
    const client = new Client({
      user: 'postgres',
      database: 'postgres',
      hostname: 'https://REPLACE_WITH_TUNNEL_HOSTNAME',
      password: '',
      port: '5432',
    })
    await client.connect()

    let result

    const buildArgs = {}
    if (params.arguments) {
      const args = params.arguments.map((value) => {
        if (value instanceof Raw) {
          return value.content
        }
        return value
      })

      let index = 1
      for (const arg of args) {
        buildArgs[index.toString()] = arg

        index += 1
      }

      result = await client.queryObject(params.query, buildArgs)
    } else {
      result = await client.queryObject(params.query)
    }

    if (result.rows.length === 0) {
      return null
    }

    if (params.fetchType === FetchTypes.ONE) {
      return result.rows[0]
    } else if (params.fetchType === FetchTypes.ALL) {
      return result.rows
    }

    return null
  }
}
```

Then we can initiate this PGQB class and call it with the usual workers-qb interface

```ts
const qb = new PGQB()
const fetched = await qb.fetchAll({
  tableName: 'devices',
  fields: '*',
})
```
