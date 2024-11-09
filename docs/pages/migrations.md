## Managing Durable Objects Migrations

In order to automatically manage migrations inside Durable Objects, just apply run the apply method inside the constructor

```ts
import { DurableObject } from 'cloudflare:workers'
import { DOQB } from '../src'
import { Env } from './bindings'

export const migrations: Migration[] = [
  {
    name: '100000000000000_add_logs_table.sql',
    sql: `
      create table logs
      (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );`,
  },
]

export class TestDO extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env)

    void this.ctx.blockConcurrencyWhile(async () => {
      const qb = new DOQB(this.ctx.storage.sql)
      qb.migrations({ migrations }).apply()
    })
  }
}
```

Having this code inside the constructor will automatically apply new migrations when you update your worker.


## Methods

#### `migrations()`

```typescript
qb.migrations(options: MigrationOptions): Migrations
```
- **Parameters:**

  - `options: MigrationOptions` - An object containing migrations and optional table name.
  
    - `migrations: Array<Migration>` - An array of migration objects to be applied.
    
    - `tableName?: string` - The name of the table to store migration records, defaults to 'migrations'.

#### `initialize()`

```typescript
initialize(): void
```
- **Description:**

  - Initializes the migration table if it doesn't exist. Creates a table named according to `_tableName` or `migrations` if non is set, with columns for `id`, `name`, and `applied_at`.

#### `getApplied()`

```typescript
getApplied(): Array<MigrationEntry>
```
- **Description:**

  - Fetches all migrations that have been applied from the database.
  
  - **Returns:** An array of `MigrationEntry` objects representing applied migrations.

#### `getUnapplied()`

```typescript
getUnapplied(): Array<Migration>
```
- **Description:**

  - Compares the list of all migrations with those that have been applied to determine which ones remain unapplied.
  
  - **Returns:** An array of `Migration` objects that have not yet been applied.

#### `apply()`

```typescript
apply(): Array<Migration>
```
- **Description:**

  - Applies all unapplied migrations by executing their SQL statements and logging the migration to the migration table.
  
  - **Returns:** An array of `Migration` objects that were applied during this call.

### Type Definitions

#### MigrationEntry

```typescript
type MigrationEntry = {
  id: number
  name: string
  applied_at: Date
}
```
- **Fields:**

  - `id`: The unique identifier for each migration entry.
  
  - `name`: The name of the migration.
  
  - `applied_at`: The timestamp when the migration was applied.

#### Migration

```typescript
type Migration = {
  name: string
  sql: string
}
```
- **Fields:**

  - `name`: The name of the migration.
  
  - `sql`: The SQL command to execute for this migration.

#### MigrationOptions

```typescript
type MigrationOptions = {
  migrations: Array<Migration>
  tableName?: string
}
```
- **Fields:**

  - `migrations`: An array of migration objects.

  - `tableName`: Optional name for the migrations table.
