## Fetching a single record

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchOne({
  tableName: 'employees',
  fields: 'count(*) as count',
  where: {
    conditions: 'department = ?1',
    params: ['HQ'],
  },
})

console.log(`There are ${fetched.results.count} employees in the HR department`)
```

## Fetching multiple records

```ts
import { OrderTypes } from 'workers-qb'
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
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

console.log(`Roles in the HR department:`)

fetched.results.forEach((employee) => {
  console.log(`${employee.role} has ${employee.count} employees`)
})
```

## Inserting rows

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

const inserted = await qb.insert({
  tableName: 'employees',
  data: {
    name: 'Joe',
    role: 'manager',
    department: 'store',
    created_at: new Raw('CURRENT_TIMESTAMP'),
  },
  returning: '*',
})

console.log(`Joe just got the employee id: ${inserted.results.id}`)
```

## Bulk Inserting rows

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

const inserted = await qb.insert({
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
})
```

## Updating rows

```ts
const updated = await qb.update({
  tableName: 'employees',
  data: {
    role: 'CEO',
    department: 'HQ',
  },
  where: {
    conditions: 'id = ?1',
    params: [123],
  },
})

console.log(`Lines affected in this query: ${updated.changes}`)
```

## Deleting rows

```ts
const deleted = await qb.delete({
  tableName: 'employees',
  where: {
    conditions: 'id = ?1',
    params: [123],
  },
})

console.log(`Lines affected in this query: ${deleted.changes}`)
```

## Dropping and creating tables

```ts
const created = await qb.createTable({
  tableName: 'testTable',
  schema: `
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    `,
  ifNotExists: true,
})

const dropped = await qb.dropTable({
  tableName: 'testTable',
})
```
