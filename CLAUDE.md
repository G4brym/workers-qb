# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run build        # Build library (tsup → dist/)
npm run lint         # Lint and auto-fix with Biome
npm run test         # Run all tests (requires npm install first)
npm run test:types   # Type-check tests only

# Run a single test file
npx vitest run --root tests tests/unit/select.test.ts

# Run tests matching a pattern
npx vitest run --root tests -t "insert"
```

## Architecture

**workers-qb** is a zero-dependency query builder for Cloudflare Workers with three database implementations:

### Database Classes (extend `QueryBuilder`)
- **`D1QB`** (`src/databases/d1.ts`) - Cloudflare D1, **async** operations
- **`DOQB`** (`src/databases/do.ts`) - Durable Objects SQLite, **sync** operations
- **`PGQB`** (`src/databases/pg.ts`) - PostgreSQL via node-postgres, **async** operations

### Core Components
- **`QueryBuilder`** (`src/builder.ts`) - Abstract base class with SQL generation (`_select`, `_insert`, `_update`, `_delete`) and query methods (`fetchOne`, `fetchAll`, `insert`, `update`, `delete`, `raw`)
- **`SelectBuilder`** (`src/modularBuilder.ts`) - Fluent API for SELECT queries via method chaining (`.where()`, `.orderBy()`, `.limit()`, etc.)
- **`Query`/`QueryWithExtra`** (`src/tools.ts`) - Query objects with lazy execution via `.execute()`
- **Migrations** (`src/migrations.ts`) - Schema migrations with `syncMigrationsBuilder` (DO) and `asyncMigrationsBuilder` (D1/PG)

### Type System
The `IsAsync` generic parameter controls sync vs async behavior:
- `QueryBuilder<GenericResultWrapper, IsAsync extends boolean = true>`
- `DOQB` uses `IsAsync = false`, making all operations synchronous
- D1QB/PGQB use `IsAsync = true` (default), requiring `await`

## Critical: DOQB Synchronicity

**DOQB operations are synchronous.** Do not use `await` with DOQB methods:

```typescript
// Inside Durable Object
const qb = new DOQB(this.ctx.storage.sql);

// CORRECT - no await
const result = qb.fetchAll({ tableName: 'users' }).execute();

// CORRECT - migrations in blockConcurrencyWhile
this.ctx.blockConcurrencyWhile(() => {
  qb.migrations({ migrations }).apply();  // No await
});

// WRONG - don't await DOQB
const result = await qb.fetchAll({ tableName: 'users' }).execute();
```

Exception: Lazy queries (`fetchAll` with `lazy: true`) return an Iterable, use `for...of`.

## Testing

Tests use `@cloudflare/vitest-pool-workers` to run in a Workers-like environment with D1 and Durable Objects. Integration tests are in `tests/integration/`, unit tests in `tests/unit/`.

## Documentation

Docs are in `docs/` using VitePress. Run `npm run docs:dev` to preview. When modifying features, update corresponding docs.
