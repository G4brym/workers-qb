The order field can receive multiple inputs and all of them will result in the same query:

- a single string
- an array of strings
- an object of a {string: another string} (field + orientation)
- an object of a {string: instance of the Order Enum} (field + orientation)

## Order by a single field with the default orientation

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    orderBy: 'id',
  })
  .execute()
```

## Order by a single field with the Order Enum orientation

```ts
import { OrderTypes } from 'workers-qb'

const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    orderBy: { id: OrderTypes.DESC },
  })
  .execute()
```

## Order by a single field with a string orientation

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: '*',
    orderBy: { id: 'DESC' },
  })
  .execute()
```
