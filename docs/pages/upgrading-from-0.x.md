In the new major we added support for [Cloudflare D1 batch queries](databases/cloudflare-d1.md#batch-queries)
and this new feature required us to change the interface on when the queries actually gets executed.

The required change for you to upgrade to `1.x` is only to append `.execute()` at the end of every query, so you should
go from this:

```ts
const fetched = await qb.fetchOne({
  tableName: 'employees',
  fields: '*',
})
```

Into this:

```ts
const fetched = await qb
  .fetchOne({
    tableName: 'employees',
    fields: '*',
  })
  .execute()
```

This change also allows you to pre-generate queries and to re-use them.
