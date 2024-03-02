Starting from version `1.2.0` you can now get type checks when writing queries!

Just define your table schema as a typescript `type` and reference it when calling any function.

!!! note

    This is available to all methods, even `Delete` or `Update` when calling with returning.

```ts
const qb = new D1QB(env.DB)

type Employee = {
  name: string
  role: string
  level: number
}

// Generated query: SELECT * FROM employees WHERE active = ?1 LIMIT 1
const employeeList = await qb
  .fetchOne<Employee>({
    tableName: 'employees',
    where: {
      conditions: 'active = ?1',
      params: [true],
    },
  })
  .execute()

// You will get type checks on each row, like:
employeeList.results[0].name
```
