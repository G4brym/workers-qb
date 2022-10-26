The limit and offset parameter can receive only numbers

## Simple limit

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
  tableName: 'employees',
  fields: '*',
  limit: 5,
})
```

## Simple limit with offset

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
  tableName: 'employees',
  fields: '*',
  limit: 5,
  offset: 10,
})
```
