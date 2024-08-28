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
