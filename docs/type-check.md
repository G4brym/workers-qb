# Type Checking

`workers-qb` is built with TypeScript and provides excellent support for type safety throughout your database interactions. Leveraging TypeScript's static typing can significantly improve the robustness and maintainability of your Cloudflare Worker applications by catching type-related errors at compile time rather than runtime.

## TypeScript and Type Safety in workers-qb

TypeScript's type system allows you to define the shape of your data and enforce these types throughout your codebase. In the context of database interactions, this means you can define TypeScript types that represent the structure of your database tables and ensure that the data you fetch from the database conforms to these types.

Benefits of type checking in `workers-qb`: (No changes in this section)

## Defining Types for Database Tables

(No changes in this section)

## Using Generic Types with Query Methods

`workers-qb`'s `fetchAll`, `fetchOne`, `insert`, and `update` methods are generic, allowing you to specify the expected return type of your queries. By providing your defined types as type arguments to these methods, you enable type checking for your database queries.

**Example: Fetching Users with Type Checking** (No changes in this section)

**Example: Using Type Checking with `fetchOne`** (No changes in this section)

## Type Checking for `insert` and `update` with `returning`

You can also leverage type checking when using `insert` and `update` queries, especially when you use the `returning` option to retrieve data after these operations.

**Example: Type Checking with `insert` and `returning`**

```typescript
import { D1QB, Raw } from 'workers-qb';

// Define a type for the User, assuming it's similar to what's in your DB
// type User = {
//   id: number;
//   name: string;
//   email: string;
//   created_at: string;
//   updated_at: string;
// };

type NewUserResult = {
  id: number;
  name: string;
  email: string;
  created_at: string;
};

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);

    const newUser = await qb.insert<NewUserResult>({ // Specify NewUserResult type
      tableName: 'users',
      data: {
        name: 'Jane Doe',
        email: 'jane.doe2@example.com',
      },
      returning: ['id', 'name', 'email', 'created_at'],
    }).execute();

    if (newUser.results) {
      // TypeScript knows 'newUser.results' is of type 'NewUserResult'
      console.log(`New User ID: ${newUser.results.id}, Name: ${newUser.results.name}`);
    }

    return Response.json({ newUser: newUser.results });
  },
};
```

In this example, we define a type `NewUserResult` that matches the structure of the data being returned by the `insert` query due to the `returning: ['id', 'name', 'email', 'created_at']` clause. By using `qb.insert<NewUserResult>()`, we ensure that TypeScript checks if the returned data conforms to the `NewUserResult` type.

**Example: Type Checking with `update` and `returning`**

```typescript
import { D1QB, Raw } from 'workers-qb';

// Define a type for the User, assuming it's similar to what's in your DB
// type User = {
//   id: number;
//   name: string;
//   email: string;
//   created_at: string;
//   updated_at: string;
// };

type UpdatedUserResult = {
  id: number;
  name: string;
  email: string;
  updated_at: string;
};

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);

    const updatedUser = await qb.update<UpdatedUserResult>({ // Specify UpdatedUserResult type
      tableName: 'users',
      data: {
        name: 'Jane Doe Updated',
        updated_at: new Raw('CURRENT_TIMESTAMP')
      },
      where: {
        conditions: 'email = ?',
        params: 'jane.doe2@example.com',
      },
      returning: ['id', 'name', 'email', 'updated_at'],
    }).execute();

    if (updatedUser.results && updatedUser.results.length > 0) {
      const firstUpdatedUser = updatedUser.results[0];
      // TypeScript knows 'firstUpdatedUser' is of type 'UpdatedUserResult'
      console.log(`Updated User Name: ${firstUpdatedUser.name}, Updated At: ${firstUpdatedUser.updated_at}`);
    }

    return Response.json({ updatedUser: updatedUser.results?.[0] });
  },
};
```

Similarly, for the `update` query, we define `UpdatedUserResult` to match the expected return type from `returning: ['id', 'name', 'email', 'updated_at']`. `qb.update<UpdatedUserResult>()` enables type checking for the updated data retrieved by the `returning` clause.

**Type Inference Examples:** (No changes in this section)

**Best Practice:** (No changes in this section)

By consistently using generic types with `fetchAll`, `fetchOne`, `insert`, and `update` (especially with `returning`), you maximize the benefits of TypeScript's type system in your `workers-qb` database interactions, leading to more robust and maintainable code.
