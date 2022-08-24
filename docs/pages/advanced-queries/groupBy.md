The group field can receive a string or a list of strings

## Group by one field

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
    tableName: "employees",
    fields: [
        "department",
        "count(*) as total"
    ],
  groupBy: "department"
})

fetched.results.forEach((obj) => {
    console.log(`Department ${obj.department} has ${obj.total} employees`)
})
```

## Group by more than one field

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
    tableName: "employees",
    fields: [
        "department",
        "role",
        "count(*) as total"
    ],
  groupBy: [
      "department",
      "role"
  ]
})

fetched.results.forEach((obj) => {
    console.log(`Department ${obj.department}:${obj.role} has ${obj.total} employees`)
})
```
