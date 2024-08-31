## .count()

On selects, you have the option to `.count()` the rows without having to build a new query everytime.

```ts
import { OrderTypes } from 'workers-qb'
const qb = new D1QB(env.DB)

type EmployeeRoles = {
  role: string
  count: number
}

async function listEmployees(page = 0) {
  const qs = qb.fetchAll<EmployeeRoles>({
    tableName: 'employees',
    limit: 20,
    offset: page * 20,
  })

  const thisPageEmployees = await qs.execute()
  const employeeCount = await qs.count()

  return {
    employees: thisPageEmployees.results,
    total: employeeCount.results.total,
  }
}
```

## Logger

To enable simple `console.log(...)` with the query and execution duration

```ts
const qb = new D1QB(env.DB)
qb.setDebugger(true) // This call will define the default logger

await qb
  .fetchAll<EmployeeRoles>({
    tableName: 'employees',
    fields: ['id', 'name'],
  })
  .execute()
```

Running the example above will print into the console this:

```
[workers-qb][34ms] {"query": "SELECT id, name FROM employees"}
```

### Advanced Logger

You can overwrite the default `console.log()` by passing a parameter to the query builder initializer

```ts
import { RawQuery, QueryLoggerMeta } from 'workers-qb'

const qb = new D1QB(env.DB, {
  logger: async (query: RawQuery, meta: QueryLoggerMeta) => {
    // run your own logic
    // query timmings available in meta.duration in milliseconds
  },
})

await qb
  .fetchAll<EmployeeRoles>({
    tableName: 'employees',
    fields: ['id', 'name'],
  })
  .execute()
```

With this, your function will always be called after the query is executed, even if the query throws an error.
