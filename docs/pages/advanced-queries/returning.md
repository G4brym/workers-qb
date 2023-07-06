The returning field allows you to return data after inserts/updates have been performed while in the same query

## Returning a single field

```ts
const qb = new D1QB(env.DB)

const inserted = await qb
  .insert({
    tableName: 'employees',
    data: {
      name: 'Joe',
      role: 'manager',
      department: 'store',
    },
    returning: 'id',
  })
  .execute()

console.log(`Joe just got the employee id: ${inserted.results.id}`)
```

## Returning all fields

```ts
const qb = new D1QB(env.DB)

const inserted = await qb
  .insert({
    tableName: 'employees',
    data: {
      name: 'Joe',
      role: 'manager',
      department: 'store',
    },
    returning: '*',
  })
  .execute()
```

## Returning multiple fields

```ts
const qb = new D1QB(env.DB)

const inserted = await qb
  .insert({
    tableName: 'employees',
    data: {
      name: 'Joe',
      role: 'manager',
      department: 'store',
    },
    returning: ['id', 'salary'],
  })
  .execute()
```
