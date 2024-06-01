## Fetching a single record

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchOne<{ count: number }>({
    tableName: 'employees',
    fields: 'count(*) as count',
    where: {
      conditions: 'department = ?1',
      params: ['HQ'],
    },
  })
  .execute()

console.log(`There are ${fetched.results.count} employees in the HR department`)
```

## Fetching multiple records

```ts
import { OrderTypes } from 'workers-qb'
const qb = new D1QB(env.DB)

type EmployeeRoles = {
  role: string
  count: number
}

const fetched = await qb
  .fetchAll<EmployeeRoles>({
    tableName: 'employees',
    fields: ['role', 'count(*) as count'],
    where: {
      conditions: 'department = ?1',
      params: ['HR'],
    },
    groupBy: 'role',
    orderBy: {
      count: OrderTypes.DESC,
    },
  })
  .execute()

console.log(`Roles in the HR department:`)

fetched.results.forEach((employee) => {
  console.log(`${employee.role} has ${employee.count} employees`)
})
```

## Inserting rows

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

type Employee = {
  id: number
  name: string
  role: string
  department: string
  created_at: string
}

const inserted = await qb
  .insert<Employee>({
    tableName: 'employees',
    data: {
      name: 'Joe',
      role: 'manager',
      department: 'store',
      created_at: new Raw('CURRENT_TIMESTAMP'),
    },
    returning: '*',
  })
  .execute()

console.log(`Joe just got the employee id: ${inserted.results.id}`)
```

## Bulk Inserting rows

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

type Employee = {
  id: number
  name: string
  role: string
  department: string
  created_at: string
}

const inserted = await qb
  .insert<Employee>({
    tableName: 'employees',
    data: [
      {
        name: 'Joe',
        role: 'manager',
        department: 'store',
        created_at: new Raw('CURRENT_TIMESTAMP'),
      },
      {
        name: 'John',
        role: 'employee',
        department: 'store',
        created_at: new Raw('CURRENT_TIMESTAMP'),
      },
      {
        name: 'Mickael',
        role: 'employee',
        department: 'store',
        created_at: new Raw('CURRENT_TIMESTAMP'),
      },
    ],
    returning: '*',
  })
  .execute()
```

## Updating rows

```ts
type Employee = {
  id: number
  name: string
  role: string
  department: string
}

const updated = await qb
  .update<Employee>({
    tableName: 'employees',
    data: {
      role: 'CEO',
      department: 'HQ',
    },
    where: {
      conditions: 'id = ?1',
      params: [123],
    },
    returning: '*',
  })
  .execute()

console.log(`Lines affected in this query: ${updated.changes}`)
```

## Deleting rows

```ts
type Employee = {
  id: number
}

const deleted = await qb
  .delete({
    tableName: 'employees',
    where: {
      conditions: 'id = ?1',
      params: [123],
    },
    returning: 'id',
  })
  .execute()

console.log(`Lines affected in this query: ${deleted.changes}`)
```

## Dropping and creating tables

```ts
const created = await qb
  .createTable({
    tableName: 'testTable',
    schema: `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    `,
    ifNotExists: true,
  })
  .execute()

const dropped = await qb.dropTable({
  tableName: 'testTable',
})
```

## Raw Queries

```ts
type Employee = {
  id: number
  name: string
  role: string
  department: string
}

const result = await qb
  .raw<Employee>({
    query: 'select * from employees where department = $1',
    args: ['HQ'],
    fetchType: FetchTypes.ALL,
  })
  .execute()
```

## Access the underlying db client

```ts
const qb = new D1QB(env.DB)

let stmt = qb.db.prepare('select * from employees')

const resp = await stmt.all()
```
