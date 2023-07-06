When doing inserts or update you might frequently use Raw sql in order to update a timestamp or call a sql function.
This can be done in workers-qb with the use of the helper `Raw` class.

## Insert with Raw sql

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

const inserted = await qb
  .insert({
    tableName: 'employees',
    data: {
      name: 'Joe',
      role: 'manager',
      department: 'store',
      created_at: new Raw('CURRENT_TIMESTAMP'),
    },
  })
  .execute()
```

## Update a row with Raw sql

```ts
import { Raw } from 'workers-qb'
const qb = new D1QB(env.DB)

const updated = await qb
  .update({
    tableName: 'employees',
    data: {
      role: 'CEO',
      department: 'HQ',
      updated_at: new Raw('CURRENT_TIMESTAMP'),
    },
    where: {
      conditions: 'id = ?1',
      params: [123],
    },
  })
  .execute()
```
