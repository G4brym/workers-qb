# Cloudflare Durable Objects

## Write queries within your DO

Because of the nature of Durable Objects, all sql query are executed sync, so there is no need for you to await the execute!

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

## Transactions

Durable objects support transaction queries

```ts
import { DOQB } from 'workers-qb'

export class DOSRS extends DurableObject {
  getEmployeePayments() {
    // you can also use `transaction`, which is useful for multiple queries:
    this.ctx.storage.transactionSync(() => {
      // `execute` blocks synchronously until the query has been executed
      // this is avaliable on DODB (and might not be on other providers)
      const fetched = qb
        .fetchAll({
          tableName: 'employees',
        })
        .execute()

      const result = fetched.map((val) => qb.select('payments').where('name = ?', val.name).execute())

      return result
    })
  }
}
```
