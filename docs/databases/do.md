# Cloudflare Durable Objects

This guide focuses on using `workers-qb` with [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/), specifically leveraging Durable Objects' built-in storage for structured data via SQLite.

## Cloudflare Durable Objects Storage

Cloudflare Durable Objects provide a way to maintain state and coordinate operations across a globally distributed network. Each Durable Object instance has its own persistent storage, which is based on SQLite. `workers-qb`'s `DOQB` class is designed to interact with this SQLite storage within your Durable Objects.

**Important Considerations for Durable Objects Storage:**

*   **Synchronous Operations:** Durable Objects storage operations are synchronous and block the Durable Object's event loop while they are executing. Keep operations reasonably fast.
*   **SQLite Limitations:** Durable Objects storage uses SQLite, which has certain limitations compared to more full-featured database systems like PostgreSQL. Be aware of SQLite-specific syntax and features.
*   **Local Persistence:** Storage is local to each Durable Object instance. Data is not shared directly between different Durable Object instances unless you implement explicit coordination mechanisms.

## DOQB Class

To work with Durable Objects storage using `workers-qb`, you will use the `DOQB` class. This class extends `QueryBuilder` and is adapted for the synchronous nature of Durable Objects storage operations.

**Note:** `DOQB` is designed for synchronous operations (`IsAsync extends boolean = false` in its definition).

## Connecting to Durable Objects Storage

Within your Durable Object class, you can access the `DurableObjectStorage` instance through `this.storage.sql`. Pass this instance to the `DOQB` constructor.

**Example: Connecting to Durable Objects Storage in a Durable Object Class**

```typescript
import { DOQB } from 'workers-qb';

// Define your database schema for type-safe queries
type Schema = {
  items: {
    id: number;
    name: string;
    value: string;
  };
};

export interface Env {
  // Example: You might have environment variables here for other purposes
}

export class MyDurableObject extends DurableObject {
  #qb: DOQB<Schema>; // Make qb a class member with schema type

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // Initialize DOQB with schema for type-safe queries
    this.#qb = new DOQB<Schema>(this.storage.sql);

    // Run schema migrations or table creations in the constructor,
    // wrapped in blockConcurrencyWhile to ensure they complete before other operations.
    // Note: Although DOQB operations are synchronous, blockConcurrencyWhile expects
    // a function that returns a Promise, so we use an async wrapper.
    this.ctx.blockConcurrencyWhile(async () => {
      this.initializeDB(); // This runs synchronously inside the async wrapper
    });
  }

  initializeDB() {
    // Example: Create table if it doesn't exist
    // .execute() is synchronous for DOQB.
    this.#qb.createTable({
        tableName: 'items', // ✓ Autocomplete: 'items'
        ifNotExists: true,
        schema: `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            value TEXT
        `
    }).execute();
  }

  async fetch(request: Request): Promise<Response> {
    // Now use this.#qb for queries with full type safety
    // ... your queries using this.#qb ...

    // Example: Fetching items - result type is automatically inferred
    const items = this.#qb.fetchAll({ tableName: 'items' }).execute();

    return new Response(`Durable Object queries executed. Items count: ${items.results?.length}`);
  }
}
```

## DO Specific Examples

Here are examples showing how to use `DOQB` within your Durable Object.

### Basic Queries in Durable Objects

All basic and advanced query operations described in [Basic Queries](../basic-queries.md) and [Advanced Queries](../advanced-queries.md) are generally applicable to `DOQB`, keeping in mind the synchronous nature and SQLite limitations.

**Example: Inserting and Fetching Data in Durable Objects**

```typescript
import { DOQB } from 'workers-qb';

// Define your database schema
type Schema = {
  items: {
    id: number;
    name: string;
    value: string;
  };
};

export interface Env { /* ... */ }

export class MyDurableObject extends DurableObject {
  #qb: DOQB<Schema>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.#qb = new DOQB<Schema>(this.storage.sql);

    this.ctx.blockConcurrencyWhile(async () => {
      // Create table (if not exists) - good practice in constructor
      this.#qb.createTable({
          tableName: 'items',
          ifNotExists: true,
          schema: `
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              value TEXT
          `
      }).execute(); // Synchronous execute for DOQB
    });
  }

  async fetch(request: Request): Promise<Response> {
    // Insert an item - table name and columns are autocompleted
    const insertedItem = this.#qb.insert({
      tableName: 'items',  // ✓ Autocomplete: 'items'
      data: {
        name: 'Example Item',  // ✓ Only valid columns allowed
        value: 'Some value',
      },
      returning: ['id', 'name', 'value'],  // ✓ Autocomplete for columns
    }).execute();

    console.log('Inserted item:', insertedItem.results);

    // Fetch all items - result type is automatically inferred
    const allItems = this.#qb.fetchAll({
      tableName: 'items',
    }).execute();

    // allItems.results is typed as Schema['items'][]
    console.log('All items:', allItems.results?.length);

    return Response.json({
      insertedItem: insertedItem.results,
      allItemsCount: allItems.results?.length,
    });
  }
}
```

### Lazy Queries in Durable Objects

`DOQB` supports lazy query execution using the `lazyExecute` method (and the `lazy: true` option in `fetchAll`). This can be beneficial when dealing with potentially large datasets in Durable Objects, as it allows you to process results iteratively without loading the entire dataset into memory at once.

**Example: Lazy Fetching and Iterating Through Items**

```typescript
import { DOQB } from 'workers-qb';

// Define your database schema
type Schema = {
  items: {
    id: number;
    name: string;
    value: string;
  };
};

export interface Env { /* ... */ }

export class MyDurableObject extends DurableObject {
  #qb: DOQB<Schema>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.#qb = new DOQB<Schema>(this.storage.sql);
    // Assuming table 'items' is created in constructor as shown in the previous example
  }

  async fetch(request: Request): Promise<Response> {
    // Lazy fetch all items - DOQB is synchronous, so no await needed
    const lazyItemsResult = this.#qb.fetchAll({
      tableName: 'items',
      lazy: true, // Explicitly set lazy: true
    }).execute(); // No await - DOQB operations are synchronous

    let itemCount = 0;
    if (lazyItemsResult.results) {
      for (const item of lazyItemsResult.results) { // Synchronous iteration (not for await)
        itemCount++;
        // Process each item here, e.g., console.log(item.name);
      }
    }

    console.log('Total items processed lazily:', itemCount);

    return Response.json({
      lazyItemsCount: itemCount,
    });
  }
}
```

In this example, `fetchAll` is called with `lazy: true`. Since DOQB operations are **synchronous**, the `execute()` method returns directly (no `await`) and `results` is an `Iterable<Schema['items']>` (not `AsyncIterable`). You can then use a regular `for...of` loop to iterate through the results synchronously.

**Note:** Lazy queries are useful in Durable Objects when dealing with large datasets, as they avoid loading the entire result set into memory at once. Each iteration retrieves the next row from SQLite on demand.

## Execution Metrics

When you execute a query with `DOQB`, the returned result object contains metrics about the database operation. This includes `rowsRead` and `rowsWritten`, which provide insight into the impact of your query.

-   `rowsRead`: The number of rows read from the database to execute the query.
-   `rowsWritten`: The number of rows written (inserted, updated, or deleted) to the database.

These metrics can be useful for monitoring and optimizing your database queries within your Durable Object.

**Example: Accessing Execution Metrics**

```typescript
import { DOQB } from 'workers-qb';

// Define your database schema
type Schema = {
  items: {
    id: number;
    name: string;
  };
};

export class MyDurableObject extends DurableObject {
  #qb: DOQB<Schema>;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.#qb = new DOQB<Schema>(this.storage.sql);
    // ... table creation ...
  }

  async fetch(request: Request): Promise<Response> {
    // Example of an insert operation
    const insertResult = this.#qb.insert({
      tableName: 'items',
      data: { name: 'Durable Item' },
      returning: ['id', 'name'],
    }).execute();

    console.log(`Rows written: ${insertResult.rowsWritten}`); // e.g., "Rows written: 1"

    // Example of a select operation
    const selectResult = this.#qb.fetchAll({
      tableName: 'items',
    }).execute();

    console.log(`Rows read: ${selectResult.rowsRead}`); // e.g., "Rows read: 3"

    return Response.json({
      insertedItem: insertResult.results,
      allItems: selectResult.results,
      metrics: {
        insert: {
          rowsWritten: insertResult.rowsWritten,
          rowsRead: insertResult.rowsRead,
        },
        select: {
          rowsWritten: selectResult.rowsWritten,
          rowsRead: selectResult.rowsRead,
        },
      },
    });
  }
}
```
