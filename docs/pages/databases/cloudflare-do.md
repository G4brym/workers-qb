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

    return fetched.results
  }
}
```
