You can now chain select parameters just like a normal ORM.
You can chain how many parameters as you would like.

For example this "normal" fetchAll query:

```ts
const qb = new D1QB(env.DB)

const result = await qb
  .fetchAll({
    tableName: 'testTable',
    fields: ['id', 'name'],
    where: {
      conditions: 'field = ?1',
      params: ['test'],
    },
    join: {
      type: JoinTypes.LEFT,
      table: 'employees',
      on: 'testTable.employee_id = employees.id',
    },
  })
  .execute()
```

Could be re-written like this:

```ts
const qb = new D1QB(env.DB)

const result = await qb
  .select('testTable')
  .fields(['id', 'name'])
  .where('field = ?1', 'test')
  .join({ type: JoinTypes.LEFT, table: 'employees', on: 'testTable.employee_id = employees.id' })
  .all()
```

### Execution Methods

#### .count()

Count method is also available for the modular selects

```ts
const qb = new D1QB(env.DB)

const result = await qb
  .select('testTable')
  .fields(['id', 'name'])
  .where('field = ?1', 'test')
  .join({ type: JoinTypes.LEFT, table: 'employees', on: 'testTable.employee_id = employees.id' })
  .count()

console.log(`Total results: ${result.results.total}`)
```

#### .all()

This is the same as calling `qb.fetchAll()` or calling `qb.select().execute()`

```ts
const qb = new D1QB(env.DB)

const result = await qb.select('testTable').fields(['id', 'name']).where('field = ?1', 'test').all()

console.log(`Total results: ${result.results.length}`)
```

#### .execute()

This is the same as calling `qb.fetchAll()` or calling `qb.select().all()`

```ts
const qb = new D1QB(env.DB)

const result = await qb.select('testTable').fields(['id', 'name']).where('field = ?1', 'test').execute()

console.log(`Total results: ${result.results.length}`)
```

#### .one()

This is the same as calling `qb.fetchOne()`

```ts
const qb = new D1QB(env.DB)

const result = await qb.select('testTable').fields(['id', 'name']).where('field = ?1', 'test').one()

console.log(`Result: ${result.results}`)
```
