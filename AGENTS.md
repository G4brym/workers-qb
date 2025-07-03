# Agent Instructions for `workers-qb` Repository

Welcome, agent! This document provides guidance for working effectively with the `workers-qb` codebase.

## Project Overview

`workers-qb` is a zero-dependency, lightweight query builder designed specifically for Cloudflare Workers and other edge computing environments. It aims to provide a simple, TypeScript-first interface for building SQL queries while maintaining raw query performance, avoiding the overhead of traditional ORMs.

**Key Technologies:**
*   TypeScript
*   Cloudflare Workers (D1, Durable Objects)
*   PostgreSQL (via `node-postgres`)
*   VitePress (for documentation)
*   Biome (for linting/formatting)
*   Vitest (for testing)

**Supported Databases:**
*   Cloudflare D1 (`D1QB`)
*   Cloudflare Durable Objects (`DOQB`)
*   PostgreSQL (`PGQB`)
*   Extensible for other SQL databases (`BYODB`).

## Development Workflow

1.  **Understanding the Task:** Ensure you have a clear grasp of the requested changes or features.
2.  **Code Implementation:** Write clean, well-typed TypeScript code. Adhere to existing patterns and conventions.
3.  **Documentation:**
    *   If you add or modify features, update the documentation in the `docs/` directory accordingly. Documentation is built with VitePress.
    *   Pay close attention to code examples in Markdown files. Ensure they are accurate and reflect best practices.
4.  **Testing:**
    *   Add unit and/or integration tests for new functionality in the `tests/` directory.
    *   Run tests using `npm run test`. All tests must pass. If `vitest` is not found, run `npm install` first.
5.  **Linting & Formatting:**
    *   Run the linter/formatter using `npm run lint`. Address any issues reported by Biome.
6.  **Committing:** Use clear and descriptive commit messages.
7.  **AGENTS.md Updates:** If you discover new patterns, conventions, or crucial information that would benefit future agents, update this file.

## Important Considerations & Conventions

### 1. Durable Objects (`DOQB`) Synchronicity

*   **`blockConcurrencyWhile`:** When working with Durable Objects and initializing the database (e.g., applying migrations, creating tables in the constructor), operations within `this.ctx.blockConcurrencyWhile()` should be treated as **synchronous** with respect to the DO's storage.
    *   Do **not** use `async` for the callback passed to `blockConcurrencyWhile` if the operations inside are synchronous `DOQB` calls (like `qb.migrations().apply()`, `qb.createTable().execute()`).
    *   Do **not** use `await` for `DOQB` methods like `.execute()` or `.apply()` *inside* the `blockConcurrencyWhile` callback, as these are synchronous for `DOQB`.
    *   **Example (Corrected):**
        ```typescript
        // Inside a Durable Object constructor
        this.#qb = new DOQB(this.ctx.storage.sql);
        this.ctx.blockConcurrencyWhile(() => { // No async here
          const migrationBuilder = this.#qb.migrations({ migrations });
          migrationBuilder.apply(); // No await here
        });
        ```
*   **General `DOQB` Operations:** Most `DOQB` query execution methods (e.g., `.execute()` on `insert`, `update`, `delete`, `fetchAll`, `fetchOne`) are synchronous.
*   **Lazy Queries in `DOQB`:** Lazy queries (`fetchAll` with `lazy: true`) are an exception and *do* return a Promise. Use `await` and `for await...of` for these, as documented.
*   **`fetch()` Handler:** The `fetch()` handler in a Durable Object is `async` and returns a `Promise<Response>`. This is standard.

### 2. Cloudflare D1 (`D1QB`) and PostgreSQL (`PGQB`) Asynchronicity

*   Operations with `D1QB` and `PGQB` are generally **asynchronous**. Always use `await` when calling `.execute()`, `.connect()`, `.close()`, etc.

### 3. TypeScript Usage

*   This is a TypeScript-first library. Prioritize strong typing.
*   Use provided types (e.g., `Migration`, result types) and define types for your data structures.
*   Leverage generics (`<T>`) for query methods to ensure type safety for results.

### 4. Documentation (`docs/`)

*   Documentation is written in Markdown and processed by VitePress.
*   Pay special attention to code blocks. Ensure they are correct, reflect the latest API, and follow the conventions (especially regarding sync/async as highlighted above).
*   Configuration for VitePress is in `docs/.vitepress/config.mts`.

### 5. Testing (`tests/`)

*   Tests are written using Vitest.
*   There are unit tests (`tests/unit/`) and integration tests (`tests/integration/`).
*   Ensure new code is covered by tests.

### 6. Linting and Formatting

*   The project uses Biome for linting and formatting.
*   Run `npm run lint` to check and automatically fix issues where possible.

### 7. Dependencies

*   A core principle is **zero production dependencies** for the main `workers-qb` library.
*   Dev dependencies (like `vitest`, `typescript`, `@biomejs/biome`, `vitepress`) are managed via `package.json` and installed with `npm install`.
*   The `pg` driver is an optional peer dependency for PostgreSQL support.

## Code Structure Highlights

*   `src/`: Contains the core library code.
    *   `src/QueryBuilder.ts`: Base abstract query builder.
    *   `src/D1QB.ts`: D1 specific implementation.
    *   `src/DOQB.ts`: Durable Object specific implementation.
    *   `src/PGQB.ts`: PostgreSQL specific implementation.
    *   `src/migrations/`: Migration logic.
    *   `src/types/`: Core type definitions.
*   `docs/`: Project documentation.
*   `tests/`: Test files.

By following these guidelines, you'll help maintain the quality and consistency of the `workers-qb` codebase. If anything is unclear, refer to existing code and documentation.
