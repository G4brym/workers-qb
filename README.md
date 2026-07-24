<div align="center">
  <a href="https://workers-qb.massadas.com/">
    <img src="https://raw.githubusercontent.com/G4brym/workers-qb/refs/heads/main/docs/assets/logo.png" width="500" height="auto" alt="workers-qb"/>
  </a>
</div>

<p align="center">
    <em>Zero-dependency Query Builder for Cloudflare Workers</em>
</p>

<p align="center">
    <a href="https://workers-qb.massadas.com/" target="_blank">
      <img src="https://img.shields.io/badge/docs-workers--qb-blue.svg" alt="Documentation">
    </a>
    <a href="https://www.npmjs.com/package/workers-qb" target="_blank">
      <img src="https://img.shields.io/npm/v/workers-qb.svg" alt="npm version">
    </a>
    <a href="https://github.com/G4brym/workers-qb/blob/main/LICENSE" target="_blank">
      <img src="https://img.shields.io/badge/license-MIT-brightgreen.svg" alt="Software License">
    </a>
</p>

## Overview

workers-qb is a lightweight query builder designed specifically for Cloudflare Workers. It provides a simple, standardized interface while maintaining the performance benefits of raw queries over traditional ORMs.

📚 [Read the full documentation](https://workers-qb.massadas.com/)

### Key Differences from ORMs

- Focused on direct SQL access with convenient wrapper methods
- Maintains raw query performance
- Zero dependencies
- Lightweight and Worker-optimized

## AI Skills

workers-qb provides AI coding assistant skills to help you write queries faster. Install them using [npx skills](https://www.npmjs.com/package/skills):

```bash
npx skills install G4brym/workers-qb
```

Available skills:
- **write-sql-queries** - Comprehensive guide for writing SELECT, INSERT, UPDATE, DELETE queries

## Supported Databases

- ☁️ [Cloudflare D1](https://workers-qb.massadas.com/databases/d1/)
- 💾 [Cloudflare Durable Objects](https://workers-qb.massadas.com/databases/do/)
- 🐘 [PostgreSQL (via node-postgres)](https://workers-qb.massadas.com/databases/postgresql/)
- 🔌 [Bring Your Own Database](https://workers-qb.massadas.com/databases/byodb/)

## Features

### Core Features
- Zero dependencies
- Full TypeScript support
- Schema-aware type inference with autocomplete
- Database schema migrations
- Lazy row loading

### Query Operations
- Table operations (create/drop)
- CRUD operations (insert/update/select/delete)
- Bulk inserts
- JOIN queries
- Subqueries
- Modular SELECT queries
- ON CONFLICT handling
- UPSERT support

## Installation

```bash
npm install workers-qb --save
```

## Usage Examples

### Cloudflare D1

```typescript
import { D1QB } from 'workers-qb'

// Define your database schema for full type safety
type Schema = {
  employees: {
    id: number
    name: string
    role: string
    level: number
    active: boolean
  }
}

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB<Schema>(env.DB)

    // Using object syntax - table names and fields autocomplete!
    const employeeList = await qb
      .fetchAll({
        tableName: 'employees',  // ✓ Autocomplete
        fields: ['name', 'role', 'level'],  // ✓ Autocomplete
        where: {
          conditions: 'active = ?1',
          params: [true],
        },
      })
      .execute()

    // Using method chaining
    const employeeListModular = await qb
      .select('employees')
      .where('active = ?', true)
      .all()

    // Result type is automatically inferred!
    return Response.json({
      activeEmployees: employeeList.results?.length || 0,
    })
  },
}
```

### Cloudflare Durable Objects

```typescript
import { DOQB } from 'workers-qb'

type Schema = {
  employees: {
    id: number
    name: string
    role: string
  }
}

export class MyDurableObject extends DurableObject {
  #qb: DOQB<Schema>

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.#qb = new DOQB<Schema>(ctx.storage.sql)
  }

  getEmployees() {
    // DOQB operations are synchronous - no await needed!
    return this.#qb
      .fetchAll({
        tableName: 'employees',  // ✓ Autocomplete
      })
      .execute()
      .results
  }
}
```

### PostgreSQL Integration

First, install the required PostgreSQL client:
```bash
npm install pg --save
```

Enable Node compatibility in `wrangler.toml`:
```toml
node_compat = true
```

Example usage:
```typescript
import { PGQB } from 'workers-qb'
import { Client } from 'pg'

type Schema = {
  employees: {
    id: number
    name: string
    active: boolean
  }
}

export interface Env {
  DB_URL: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new PGQB<Schema>(new Client(env.DB_URL))
    await qb.connect()

    const fetched = await qb
      .fetchOne({
        tableName: 'employees',  // ✓ Autocomplete
        fields: 'count(*) as count',
        where: {
          conditions: 'active = ?1',
          params: [true],
        },
      })
      .execute()

    // Important: Close the connection
    ctx.waitUntil(qb.close())

    return Response.json({
      activeEmployees: fetched.results?.count || 0,
    })
  },
}
```

## Documentation

Visit our [comprehensive documentation](https://workers-qb.massadas.com/) for detailed information about:

- [Basic Queries](https://workers-qb.massadas.com/basic-queries/)
- [Advanced Queries](https://workers-qb.massadas.com/advanced-queries/)
- [Migrations](https://workers-qb.massadas.com/migrations/)
- [Type Checking](https://workers-qb.massadas.com/type-check/)
- [Database-specific guides](https://workers-qb.massadas.com/databases/d1)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
