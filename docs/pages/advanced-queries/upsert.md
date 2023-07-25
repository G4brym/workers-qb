The Upsert feature in the SQL Builder Library streamlines database operations by combining insert and update actions
into a single operation. It automatically determines whether a record exists based on a specified key and updates or
inserts data accordingly. This simplifies coding, enhances data integrity, and boosts performance.

## Simple Upsert

`new Raw(...)` is used here to let `workers-qb` know that it is not a parameter.

```ts
const qb = new D1QB(env.DB)

const upserted = await qb
  .insert({
    tableName: 'phonebook2',
    data: {
      name: 'Alice',
      phonenumber: '704-555-1212',
      validDate: '2018-05-08',
    },
    onConflict: {
      column: 'name',
      data: {
        phonenumber: new Raw('excluded.phonenumber'),
        validDate: new Raw('excluded.validDate'),
      },
    },
  })
  .execute()
```

This will generate this query

```sql
INSERT INTO phonebook2 (name, phonenumber, validDate)
VALUES (?1, ?2, ?3)
ON CONFLICT (name) DO UPDATE SET phonenumber = excluded.phonenumber,
                                 validDate   = excluded.validDate
```

## Upsert with where

```ts
const qb = new D1QB(env.DB)

const upserted = await qb
  .insert({
    tableName: 'phonebook2',
    data: {
      name: 'Alice',
      phonenumber: '704-555-1212',
      validDate: '2018-05-08',
    },
    onConflict: {
      column: 'name',
      data: {
        phonenumber: new Raw('excluded.phonenumber'),
        validDate: new Raw('excluded.validDate'),
      },
      where: {
        conditions: 'excluded.validDate > phonebook2.validDate',
      },
    },
  })
  .execute()
```

This will generate this query

```sql
INSERT INTO phonebook2 (name, phonenumber, validDate)
VALUES (?2, ?3, ?4)
ON CONFLICT (name) DO UPDATE SET phonenumber = excluded.phonenumber,
                                 validDate   = excluded.validDate
WHERE excluded.validDate > phonebook2.validDate
```
