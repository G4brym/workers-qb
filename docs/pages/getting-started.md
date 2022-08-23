## Installation

```
npm install workers-qb
```

## Basic Usage
```ts
import { D1QB } from 'workers-qb'
const qb = new D1QB(env.DB)

const fetched = await qb.fetchOne({
    tableName: "employees",
    fields: "count(*) as count",
    where: {
      conditions: "active = ?1",
      params: [true]
    },
})

console.log(`Company has ${fetched.results.count} active employees`)
```
