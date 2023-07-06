The where parameter can receive multiple inputs and all of them will result in the same query:
Currently due to a limitation in D1, there is only support for ordered parameters (but named parameters is in progress)

## Simple where

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    where: {
      conditions: 'active = true',
    },
  })
  .execute()
```

## Where with multiple conditions

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    where: {
      conditions: ['active = true', 'department = "HR"'],
    },
  })
  .execute()
```

## Simple where with parameters

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    where: {
      conditions: 'department = ?1',
      params: ['HR'],
    },
  })
  .execute()
```

## Where with advanced conditions

```ts
const qb = new D1QB(env.DB)

async function countEmployees(department?: string): number {
  const conditions = []

  if (department) conditions.push('department = ?1')

  const fetched = await qb
    .fetchAll({
      tableName: 'employees',
      fields: 'count(*) as count',
      where: {
        conditions: conditions,
        params: ['HR'],
      },
    })
    .execute()

  return fetched.results.count
}

const allEmployees = await countEmployees()

const hrEmployees = await countEmployees('HR')
```
