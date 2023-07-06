When doing Insert's or Update's you can pass through an ON CONFLICT clause to define how a conflict is solved.

Available resolution methods are:

- ROLLBACK
- ABORT
- FAIL
- IGNORE
- REPLACE

For more information on what each resolution means, refer to the [official SQLite docs here](https://www.sqlite.org/lang_conflict.html)

## On Conflict ignore

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
    onConflict: ConflictTypes.IGNORE,
  })
  .execute()
```

## On Conflict replace

```ts
const qb = new D1QB(env.DB)

const updated = await qb
  .update({
    tableName: 'employees',
    data: {
      role: 'CEO',
      department: 'HQ',
    },
    where: {
      conditions: 'id = ?1',
      params: [123],
    },
    onConflict: 'REPLACE',
  })
  .execute()
```
