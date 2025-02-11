# Bring Your Own Database (BYODB)

`workers-qb` is designed to be extensible, allowing you to adapt it to support database systems beyond the built-in support for Cloudflare D1, Durable Objects storage, and PostgreSQL. This "Bring Your Own Database" (BYODB) approach enables you to use `workers-qb` with databases like MySQL, SQLite (external, non-Durable Object), or even NoSQL databases with SQL-like query interfaces (if adaptable).

## Extending workers-qb

To support a new database, you need to create a custom QueryBuilder class that extends the base `QueryBuilder` class from `workers-qb`. This custom class will be responsible for:

1.  **Database Connection:** Establishing and managing a connection to your target database.
2.  **Query Execution:** Implementing the `execute` and `batchExecute` methods to send SQL queries to your database and handle responses.
3.  **Result Formatting:** Adapting the database-specific result formats to the standard `workers-qb` result structures (`ArrayResult`, `OneResult`, etc.).

## Creating a Custom Database Adapter

Here are the key steps to create a custom database adapter:

1.  **Create a New Class:** Create a new TypeScript class that extends `QueryBuilder`. Choose a descriptive name for your class, e.g., `MySQLQB` for MySQL, `SQLiteQB` for external SQLite, etc.
2.  **Constructor:** In the constructor of your custom class, accept any necessary database connection parameters (e.g., connection string, database client instance) and pass any options to the `super()` constructor of `QueryBuilder`.
3.  **Implement `execute` Method:** This is the core method you need to implement. It takes a `Query` object as input, which contains the SQL query string (`query.query`) and parameterized arguments (`query.arguments`). Inside `execute`:
  *   Establish a database connection (if not already established or passed in constructor).
  *   Prepare and execute the SQL query using your database's client library or API.
  *   Handle parameterized arguments.
  *   Format the database response into a `workers-qb` result object (`ArrayResult`, `OneResult`, or `GenericResultWrapper` for non-fetching queries).
  *   Return the formatted result object.
4.  **Implement `batchExecute` Method (Optional but Recommended):** If your database supports batch query execution, implement `batchExecute` to handle an array of `Query` objects efficiently. This can significantly improve performance for multiple queries.
5.  **Implement `lazyExecute` Method (Optional):** If your database and client library support lazy or streaming result sets, you can implement `lazyExecute` to return an `Iterable` or `AsyncIterable` of results for memory-efficient handling of large datasets.
6.  **Migrations (Optional):** You can also extend or adapt the `migrationsBuilder` classes (`syncMigrationsBuilder`, `asyncMigrationsBuilder`) if you want to provide migration support for your custom database adapter.

## Example: Basic SQLite Adapter (Conceptual)

This is a conceptual example of a basic SQLite adapter (for an external SQLite database, not Durable Objects storage). **This is not a fully implemented, production-ready adapter, but rather illustrates the concepts.**

```typescript
// conceptual-sqlite-qb.ts (Example - Not production-ready)
import { QueryBuilder } from 'workers-qb';
import { Query } from 'workers-qb';
import Database from 'better-sqlite3'; // Example SQLite library (install if needed)
import { FetchTypes } from 'workers-qb';
import { ArrayResult, OneResult } from 'workers-qb';

interface SQLiteResultWrapper { // Define a wrapper type for SQLite results
    results?: any;
    changes?: number;
    lastInsertRowid?: number | bigint;
}

export class SQLiteQB extends QueryBuilder<SQLiteResultWrapper, false> { // Sync adapter example
  private db: Database.Database;

  constructor(dbPath: string, options?: QueryBuilderOptions<false>) {
    super(options);
    this.db = new Database(dbPath); // Open SQLite database connection
  }

  execute(query: Query<any, false>): SQLiteResultWrapper {
    try {
      const stmt = this.db.prepare(query.query);
      let result;

      if (query.fetchType === FetchTypes.ONE) {
        result = stmt.get(...(query.arguments || []));
        return { results: result as OneResult<SQLiteResultWrapper, any>['results'] };
      } else if (query.fetchType === FetchTypes.ALL) {
        result = stmt.all(...(query.arguments || []));
        return { results: result as ArrayResult<SQLiteResultWrapper, any, false>['results'] };
      } else { // No fetch
        const info = stmt.run(...(query.arguments || []));
        return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
      }

    } catch (error) {
      console.error("SQLite Query Error:", error, query.toObject());
      throw error; // Re-throw or handle error as needed
    }
  }

  // Implement batchExecute if better-sqlite3 supports batching efficiently
  // lazyExecute could also be implemented if better-sqlite3 has streaming capabilities

  close(): void {
    this.db.close();
  }
}

// Example usage:
// const sqliteQB = new SQLiteQB('./mydb.sqlite');
// const users = sqliteQB.fetchAll({ tableName: 'users' }).execute();
// sqliteQB.close();
```

**Key points in the conceptual SQLite example:**

*   **Custom `SQLiteResultWrapper`:** Defines a type to wrap SQLite-specific result information (changes, lastInsertRowid, etc.).
*   **`better-sqlite3` Library:** Uses `better-sqlite3` as an example SQLite library (you'd need to install it).
*   **Synchronous `execute`:** Implements synchronous `execute` method as SQLite operations with `better-sqlite3` are typically synchronous.
*   **Result Formatting:** Formats results from `stmt.get()`, `stmt.all()`, and `stmt.run()` into `workers-qb`'s `ArrayResult`, `OneResult`, and wrapper formats.
*   **Error Handling:** Includes basic error logging and re-throwing.
*   **`close()` Method:**  Adds a `close()` method to close the SQLite database connection.

**To create a production-ready adapter for your database:**

1.  **Choose a suitable database client library** for your target database in JavaScript/TypeScript (if one exists for Cloudflare Workers environment).
2.  **Study the documentation of your chosen database and its client library.**
3.  **Implement `execute`, `batchExecute`, and `lazyExecute` methods** in your custom QueryBuilder class, handling connection, query execution, parameter binding, error handling, and result formatting according to your database's specifics.
4.  **Consider adding migration support** by extending or adapting `syncMigrationsBuilder` or `asyncMigrationsBuilder` if needed.
5.  **Thoroughly test your custom adapter** with various query types and scenarios.

By creating custom database adapters, you can extend the reach of `workers-qb` to support a wide variety of SQL and SQL-like databases in your Cloudflare Worker projects.
