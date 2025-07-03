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

// Define Env if it's used for configuration, otherwise it might not be needed for basic DOQB
export interface Env {
  // Example: You might have environment variables here for other purposes
}

export class MyDurableObject extends DurableObject {
  #qb: DOQB; // Make qb a class member

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.#qb = new DOQB(this.storage.sql); // Initialize DOQB with DurableObjectStorage

    // It's common to run schema migrations or table creations in the constructor,
    // wrapped in blockConcurrencyWhile to ensure they complete before other operations.
    // Operations inside blockConcurrencyWhile are synchronous with respect to DO storage.
    this.ctx.blockConcurrencyWhile(() => {
      this.initializeDB();
    });
  }

  initializeDB() {
    // Example: Create table if it doesn't exist
    // .execute() is synchronous for DOQB.
    this.#qb.createTable({
        tableName: 'items', // Example table
        ifNotExists: true,
        schema: `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            value TEXT
        `
    }).execute();
  }

  async fetch(request: Request): Promise<Response> {
    // Now use this.#qb for queries
    // ... your queries using this.#qb ...

    // Example: Fetching an item (replace with actual logic)
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

// Define Env if it's used for configuration
export interface Env { /* ... */ }

export class MyDurableObject extends DurableObject {
  #qb: DOQB;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.#qb = new DOQB(this.storage.sql);

    // Operations inside blockConcurrencyWhile are synchronous with respect to DO storage.
    this.ctx.blockConcurrencyWhile(() => {
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
    // qb is now this.#qb

    type Item = {
      id: number;
      name: string;
      value: string;
    };

    // Insert an item
    const insertedItem = this.#qb.insert<Item>({
      tableName: 'items',
      data: {
        name: 'Example Item',
        value: 'Some value',
      },
      returning: ['id', 'name', 'value'],
    }).execute();

    console.log('Inserted item:', insertedItem.results);

    // Fetch all items
    const allItems = this.#qb.fetchAll<Item>({
      tableName: 'items',
    }).execute();

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

// Define Env if it's used for configuration
export interface Env { /* ... */ }

export class MyDurableObject extends DurableObject {
  #qb: DOQB;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.#qb = new DOQB(this.storage.sql);
    // Assuming table 'items' is created in constructor as shown in the previous example
  }

  async fetch(request: Request): Promise<Response> {
    // qb is now this.#qb

    type Item = {
      id: number;
      name: string;
      value: string;
    };

    // Lazy fetch all items
    const lazyItemsResult = await this.#qb.fetchAll<Item, true>({ // Note: <Item, true> for lazy fetch
      tableName: 'items',
      lazy: true, // Explicitly set lazy: true
    }).execute();

    let itemCount = 0;
    if (lazyItemsResult.results) {
      for await (const item of lazyItemsResult.results) { // Async iteration over lazy results
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

In this example, `fetchAll` is called with `lazy: true` and the generic type specified as `<Item, true>`. The `execute()` method returns a result object where `results` is an `AsyncIterable<Item>`. You can then use an `for await...of` loop to iterate through the results asynchronously, processing items one by one as they are fetched from the database.

**Note:** Lazy queries are particularly useful in Durable Objects to avoid blocking the event loop for extended periods when dealing with large datasets. However, keep in mind that each iteration still involves synchronous storage operations. Optimize your processing logic within the loop to maintain responsiveness.
