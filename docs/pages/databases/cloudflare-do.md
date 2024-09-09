# Cloudflare Durable Objects

## Write queries within your DO

```ts
import { DOQB } from 'workers-qb'

export class DOSRS extends DurableObject {
  async getEmployees() {
    const qb = new DOQB(this.ctx.storage.sql)

    const fetched = await qb
      .fetchAll({
        tableName: 'employees',
      })
      .execute()

    // you can also use `transaction`, which is useful for multiple queries:
    this.ctx.storage.transactionSync(() => {
      // `executeSync` blocks synchronously until the query has been executed
      // this is avaliable on DODB (and might not be on other providers)
      const fetched = qb
        .fetchAll({
          tableName: 'employees',
        })
        .executeSync()

      const result = fetched.map((val) => qb.select('payments').where('name = ?', val.name).executeSync())

      return result
    })

    return fetched.results
  }
}
```
