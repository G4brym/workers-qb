The field parameter can receive a string of a list of strings, you can use this to leverage your python code 
to don't have to join the string together

## Selecting with a string

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
    tableName: "employees",
    fields: "*"
})
```

```ts
const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
    tableName: "employees",
    fields: "name, birth_date"
})
```

## Selecting with a list of strings

```ts
fields = ["name", "birth_date"]

// Include more fields on some conditions
if (includeDepartments) {
    fields.push("department")
}

const qb = new D1QB(env.DB)

const fetched = await qb.fetchAll({
    tableName: "employees",
    fields: fields
})
```
