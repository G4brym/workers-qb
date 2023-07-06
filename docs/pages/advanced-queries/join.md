Join are available in both fetchOne and fetchAll.

Available join methods are:

- INNER JOIN
- LEFT JOIN
- CROSS JOIN

Note that SQLite doesn't support RIGHT JOIN neither FULL JOIN.

## Implicit Inner Join

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: ['role', 'department', 'payroll.salary'],
    where: {
      conditions: 'department = ?1',
      params: ['HR'],
    },
    join: {
      table: 'payroll',
      on: 'payroll.employee_id = employees.id',
    },
  })
  .execute()
```

## Explicit Inner Join

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: ['role', 'department', 'payroll.salary'],
    where: {
      conditions: 'department = ?1',
      params: ['HR'],
    },
    join: {
      type: JoinTypes.INNER,
      table: 'payroll',
      on: 'payroll.employee_id = employees.id',
    },
  })
  .execute()
```

## Left Join

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    join: {
      type: JoinTypes.LEFT,
      table: 'payroll',
      on: 'payroll.employee_id = employees.id',
    },
  })
  .execute()
```

## Multiple Joins

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    join: [
      {
        table: 'payroll',
        on: 'payroll.employee_id = employees.id',
      },
      {
        table: 'offices',
        on: 'testTable.office_id = offices.id',
      },
    ],
  })
  .execute()
```
