The limit and offset parameter can receive only numbers

## Simple limit

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    limit: 5,
  })
  .execute()
```

## Simple limit with offset

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    limit: 5,
    offset: 10,
  })
  .execute()
```
