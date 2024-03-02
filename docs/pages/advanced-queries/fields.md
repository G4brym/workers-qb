The field parameter can receive a string of a list of strings, you can use this to leverage your python code
to don't have to join the string together

!!! note

    Starting from version `1.2.1` the `fields` now default to `*` when left blank.

## Selecting with a string

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    // fields: '*',  this is the default value
  })
  .execute()
```

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: 'name',
  })
  .execute()
```

```ts
const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: 'name, birth_date',
  })
  .execute()
```

## Selecting with a list of strings

```ts
fields = ['name', 'birth_date']

// Include more fields on some conditions
if (includeDepartments) {
  fields.push('department')
}

const qb = new D1QB(env.DB)

const fetched = await qb
  .fetchAll({
    tableName: 'employees',
    fields: fields,
  })
  .execute()
```
