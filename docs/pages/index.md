# workers-qb

## Introduction

**workers-qb** is a zero-dependency, lightweight query builder specifically designed for [Cloudflare Workers](https://workers.cloudflare.com/) and other edge computing environments. It provides a simple and intuitive interface for constructing SQL queries while ensuring optimal performance. Unlike traditional Object-Relational Mappers (ORMs), `workers-qb` focuses on direct SQL access, giving you fine-grained control over your queries and avoiding the performance overhead often associated with ORMs.

`workers-qb` is perfect for developers who want the convenience of a query builder without sacrificing the speed and efficiency of raw SQL, especially in serverless and edge contexts where performance is critical.

## Key Features

*   **Zero Dependencies:**  No external dependencies, making it incredibly lightweight and easy to integrate into your Cloudflare Worker projects.
*   **Cloudflare Worker Optimized:** Designed with Cloudflare Workers in mind, ensuring minimal overhead and maximum performance in edge environments.
*   **Full TypeScript Support:**  Provides excellent type safety and autocompletion for a smoother development experience.
*   **Database Schema Migrations:**  Includes a built-in migration system to manage your database schema changes efficiently.
*   **Type Checking for Data Reads:**  Leverage TypeScript's type system to ensure data fetched from your database matches your expected types.
*   **Lazy Row Loading:** Supports lazy execution for efficient handling of large datasets, particularly useful in Durable Objects.
*   **Comprehensive Query Operations:** Supports a wide range of SQL operations including:
  *   Table creation and deletion
  *   CRUD operations (Insert, Select, Update, Delete)
  *   Bulk inserts
  *   JOIN queries
  *   Modular SELECT query building
  *   ON CONFLICT handling (for inserts and updates)
  *   UPSERT support

## Supported Databases

`workers-qb` currently supports the following databases:

*   **☁️ [Cloudflare D1](databases/d1.md):** Cloudflare's serverless SQL database.
*   **💾 [Cloudflare Durable Objects](databases/do.md):**  Utilize Durable Objects' built-in storage for structured data.
*   **🐘 [PostgreSQL](databases/postgresql.md):** Connect to external PostgreSQL databases (e.g., using `node-postgres`).
*   **🔌 [Bring Your Own Database (BYODB)](databases/byodb.md):**  Extend `workers-qb` to support any SQL database.

## Quick Start

### Installation

Install `workers-qb` using npm:

```bash
npm install workers-qb --save
```

### Basic Usage (Cloudflare D1)

Here's a simple example of how to use `workers-qb` with Cloudflare D1 to fetch a list of employees:

```typescript
import { D1QB } from 'workers-qb';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);

    type Employee = {
      id: number;
      name: string;
      role: string;
    };

    const employeeList = await qb.fetchAll<Employee>({
      tableName: 'employees',
    }).execute();

    return Response.json({
      employees: employeeList.results,
    });
  },
};
```

This code snippet demonstrates:

1.  **Importing `D1QB`:**  Importing the necessary class for Cloudflare D1.
2.  **Creating a `D1QB` instance:** Initializing the query builder with your D1 database binding from the Cloudflare Worker environment.
3.  **Defining a Type `Employee`:**  Creating a TypeScript type to represent the structure of your `employee` data.
4.  **Fetching all employees:** Using `qb.fetchAll<Employee>()` to construct a SELECT query and fetch all rows from the `employees` table.
5.  **Executing the query:** Calling `.execute()` to run the query against the database.
6.  **Accessing results:**  Accessing the fetched employee data through `employeeList.results`.

## Documentation Sections

Explore the comprehensive documentation to learn more about `workers-qb`:

*   **[Basic Queries](basic-queries.md):** Learn the fundamentals of creating, reading, updating, and deleting data.
*   **[Advanced Queries](advanced-queries.md):** Dive into more complex query structures, including joins, subqueries, and conditional logic.
*   **[Migrations](migrations.md):** Discover how to manage your database schema using migrations.
*   **[Type Checking](type-check.md):** Understand how to leverage TypeScript for type-safe database interactions.
*   **[Database-Specific Guides](databases/d1.md):** Find detailed guides and examples for each supported database.
*   **[API Reference](api.md):** Explore the complete API documentation for all classes, methods, and interfaces.
