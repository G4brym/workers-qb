# PostgreSQL

This guide explains how to integrate `workers-qb` with external [PostgreSQL](https://www.postgresql.org/) databases in your Cloudflare Workers.

## PostgreSQL Integration

While Cloudflare D1 and Durable Objects storage are convenient for serverless environments, you might need to connect to existing PostgreSQL databases for various reasons, such as migrating legacy applications, accessing data in established PostgreSQL systems, or leveraging PostgreSQL-specific features.

`workers-qb` supports PostgreSQL integration through the popular [node-postgres](https://www.npmjs.com/package/pg) library.

**Prerequisites:**

*   **Install `node-postgres`:** You need to add `node-postgres` as a dependency to your Cloudflare Worker project.
    ```bash
    npm install pg --save
    ```
*   **Enable Node Compatibility:** Cloudflare Workers, by default, are not fully Node.js compatible. To use `node-postgres`, you need to enable Node.js compatibility in your `wrangler.toml` file.
    ```toml
    # wrangler.toml
    node_compat = true
    ```
    Enabling `node_compat` allows your Worker to use Node.js modules like `pg`.

## PGQB Class

To interact with PostgreSQL databases, you will use the `PGQB` class in `workers-qb`. This class is designed to work with the `pg.Client` from `node-postgres`.

## Setting up PostgreSQL with `node-postgres`

Before using `PGQB`, you need to set up a `pg.Client` instance and configure it with your PostgreSQL database connection details.

**Example: Setting up `pg.Client`**

```typescript
import { Client } from 'pg';

// ... (inside your Worker code) ...

const dbClient = new Client({
  connectionString: env.DB_URL, // Database URL from your environment variables
});

// ... then pass dbClient to PGQB ...
```

You will typically obtain your PostgreSQL connection string (DB\_URL) from your Cloudflare Worker environment variables.

## Connecting to PostgreSQL

To use `PGQB`, create an instance of `PGQB` and pass your configured `pg.Client` instance to its constructor. You also need to explicitly call `qb.connect()` to establish a connection to the PostgreSQL database before executing queries and `qb.close()` to close the connection when you are done.

**Example: Connecting to PostgreSQL in a Cloudflare Worker**

```typescript
import { PGQB } from 'workers-qb';
import { Client } from 'pg';

export interface Env {
  DB_URL: string; // Database URL environment variable
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const dbClient = new Client({
      connectionString: env.DB_URL,
    });
    const qb = new PGQB(dbClient); // Initialize PGQB with pg.Client

    await qb.connect(); // Establish PostgreSQL connection

    // ... your queries using qb ...

    ctx.waitUntil(qb.close()); // Ensure connection closes after response is sent
    return new Response("PostgreSQL queries executed");
  },
};
```

**Important:**

*   **`qb.connect()` and `qb.close()`:**  Remember to call `qb.connect()` to open the PostgreSQL connection before executing queries and `qb.close()` to close the connection when finished. It's good practice to use `ctx.waitUntil(qb.close())` in Cloudflare Workers to ensure the connection closes even after the response is sent.
*   **Error Handling:** In a production application, you should add proper error handling around the `connect()` and `close()` calls and query executions to manage potential connection issues or database errors.

## PostgreSQL Specific Examples

Here are examples demonstrating operations with `PGQB` and PostgreSQL.

### Basic Queries with PGQB

All basic and advanced query operations described in [Basic Queries](../basic-queries.md) and [Advanced Queries](../advanced-queries.md) are applicable to `PGQB`. You can use `createTable`, `dropTable`, `insert`, `select`, `update`, `delete`, joins, modular select builder, where clauses, etc., as shown in those sections, using `PGQB` and ensuring you call `connect()` and `close()`.

**Example: Inserting and Fetching Data in PostgreSQL**

```typescript
import { PGQB } from 'workers-qb';
import { Client } from 'pg';

export interface Env {
  DB_URL: string;
}

type Product = {
  id: number;
  name: string;
  price: number;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const dbClient = new Client({ connectionString: env.DB_URL });
    const qb = new PGQB(dbClient);
    await qb.connect();

    try {
        // Create table (if not exists) - typically in migrations
        await qb.createTable({
            tableName: 'products',
            ifNotExists: true,
            schema: `
                id SERIAL PRIMARY KEY, -- SERIAL is PostgreSQL's auto-increment
                name TEXT NOT NULL,
                price REAL NOT NULL
            `
        }).execute();

        // Insert a product
        const insertedProduct = await qb.insert<Product>({
          tableName: 'products',
          data: {
            name: 'PostgreSQL Product',
            price: 29.99,
          },
          returning: ['id', 'name', 'price'],
        }).execute();

        console.log('Inserted product:', insertedProduct.results);

        // Fetch all products
        const allProducts = await qb.fetchAll<Product>({
          tableName: 'products',
        }).execute();

        console.log('All products:', allProducts.results);

        return Response.json({
          insertedProduct: insertedProduct.results,
          allProducts: allProducts.results,
        });

    } finally {
        ctx.waitUntil(qb.close()); // Close connection in finally block
    }
  },
};
```

**Note:** PostgreSQL uses `SERIAL` for auto-incrementing integer primary keys, which is different from SQLite's `INTEGER PRIMARY KEY AUTOINCREMENT`. Adapt your schema definitions accordingly.

### Using Transactions (Conceptual - Not Directly in `workers-qb` Core)

While `workers-qb` core doesn't provide a dedicated transaction management API, you can leverage `node-postgres`'s transaction capabilities directly with `PGQB`. You would start a transaction using `dbClient.query('BEGIN')`, execute your queries using `PGQB`, and then commit with `dbClient.query('COMMIT')` or rollback with `dbClient.query('ROLLBACK')`.

**Example (Conceptual - Transaction Handling Outside `workers-qb` API):**

```typescript
import { PGQB } from 'workers-qb';
import { Client } from 'pg';

export interface Env {
  DB_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const dbClient = new Client({ connectionString: env.DB_URL });
    const qb = new PGQB(dbClient);
    await qb.connect();

    try {
      await dbClient.query('BEGIN'); // Start transaction

      // ... execute multiple queries using qb within the transaction ...
      await qb.insert({ tableName: 'orders', data: { user_id: 1, amount: 100 } }).execute();
      await qb.update({ tableName: 'users', data: { balance: new Raw('balance - 100') }, where: { conditions: 'id = ?', params: 1 } }).execute();

      await dbClient.query('COMMIT'); // Commit transaction

      return Response.json({ message: "Transaction committed successfully" });

    } catch (error) {
      await dbClient.query('ROLLBACK'); // Rollback on error
      console.error("Transaction rolled back:", error);
      return new Response("Transaction failed", { status: 500 });

    } finally {
      ctx.waitUntil(qb.close());
    }
  },
};
```

**Note:** This transaction example demonstrates how you would manually manage transactions using `node-postgres`'s API alongside `PGQB`.  Future versions of `workers-qb` might introduce more integrated transaction management features. For now, this manual approach allows you to leverage PostgreSQL transactions when needed.

### Closing Connection

It's crucial to close the PostgreSQL connection when you are finished with your database operations to release resources. Always call `qb.close()` (which in turn calls `dbClient.end()`) in a `finally` block or using `ctx.waitUntil()` to ensure connection closure.

This guide provides information on integrating `workers-qb` with PostgreSQL. Remember to handle connection management, error handling, and adapt your SQL syntax to PostgreSQL specifics. Next, explore the guide on [Bring Your Own Database (BYODB)](byodb.md) to learn how to extend `workers-qb` for other database systems.
