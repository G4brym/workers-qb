Currently the having field just supports receiving a single string, but you can insert there as many
conditions as you want

## Having with one condition

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: ['department', 'count(*) as total'],
    groupBy: 'department',
    having: 'active = true',
  })
  .execute()

fetched.results.forEach((obj) => {
  console.log(`Department ${obj.department} has ${obj.total} active employees`)
})
```
