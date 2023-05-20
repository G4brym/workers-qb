Because workers-qb is built in a modular way, you can actually use it with almost any database you like.
All you need to do is implement your own `QueryBuilder` class and return types.

For example here is the code that implements support for the node-postgres library.

```ts
// filename: src/interfaces.ts

// other interfaces...

export interface PGResult {
  command: string
  lastRowId?: string | number
  rowCount: number
  results?: Array<Record<string, string | boolean | number | null>>
}

export interface PGResultOne {
  command: string
  lastRowId?: string | number
  rowCount: number
  results?: Record<string, string | boolean | number | null>
}
```

```ts
// filename: src/databases/pg.ts

import { QueryBuilder } from '../Builder'
import { FetchTypes } from '../enums'
import { Raw } from '../tools'
import { PGResult, PGResultOne } from '../interfaces'

let pg: any
try {
  pg = require('pg')
} catch (er) {
  pg = null
}

export class PGQB extends QueryBuilder<PGResult, PGResultOne> {
  private dbUrl: string
  private client: any

  constructor(dbUrl: string) {
    if (pg === null) {
      throw new Error('You must have "pg" installed, in order to use PGQB!')
    }

    super()

    this.dbUrl = dbUrl
    this.client = new pg.Client(this.dbUrl)
  }

  async connect() {
    await this.client.connect()
  }

  async close() {
    await this.client.end()
  }

  async execute(params: {
    query: String
    arguments?: (string | number | boolean | null | Raw)[]
    fetchType?: FetchTypes
  }): Promise<any> {
    const query = params.query.replaceAll('?', '$')

    let result

    if (params.arguments) {
      const args = params.arguments.map((value) => {
        if (value instanceof Raw) {
          return value.content
        }
        return value
      })

      result = await this.client.query({
        values: args,
        text: query,
      })
    } else {
      result = await this.client.query({
        text: query,
      })
    }

    if (params.fetchType === FetchTypes.ONE || params.fetchType === FetchTypes.ALL) {
      return {
        command: result.command,
        lastRowId: result.oid,
        rowCount: result.rowCount,
        results: result.rows,
      }
    }

    return null
  }
}
```

Then we can initiate this PGQB class and call it with the usual workers-qb interface

```ts
const qb = new PGQB('postgresql://user:password@hostname:5432/db_name')
const fetched = await qb.fetchAll({
  tableName: 'devices',
  fields: '*',
})
```
