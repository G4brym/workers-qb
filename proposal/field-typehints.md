# API Proposal: Type-safe Table and Field Names

## Motivation

Currently, `workers-qb` relies on raw strings for table and field names in query construction. This approach is simple but lacks type safety, making it susceptible to common errors such as typos in table or column names. These errors are only caught at runtime, which can lead to bugs in production.

By introducing TypeScript generics, we can provide compile-time autocompletion for table and field names. This will significantly improve the developer experience and help catch errors early, making the library more robust and enjoyable to use.

## API Proposal

The core of this proposal is to allow developers to define their database schema as a TypeScript `interface` or `type` and pass it as a generic parameter to the query builder classes (`D1QB`, `DOQB`, `PGQB`).

### 1. Schema Definition

A user will define their database schema as a type. Each key of the type represents a table name, and the value is an object representing the table's columns and their corresponding TypeScript types.

```typescript
// User-defined database schema
interface MyDBSchema {
  users: {
    id: number;
    name: string;
    email: string;
    role_id: number;
  };
  posts: {
    id: number;
    title: string;
    body: string;
    author_id: number;
  };
  roles: {
    id: number;
    name: string;
  }
}
```

### 2. Typed Query Builder Instantiation

The user will then pass this schema as a type parameter when creating an instance of the query builder.

```typescript
import { D1QB } from 'workers-qb';

// Create a typed query builder instance
const qb = new D1QB<MyDBSchema>(env.DB);
```

This `qb` instance will now be "schema-aware," providing type hints for all query inputs, such as table names and fields.

### 3. Flexible Field Names

To maintain flexibility, the type system will provide autocompletion hints for schema-defined fields but will **not** throw a TypeScript error if an arbitrary string is used. This allows developers to work with aliases, raw SQL expressions, or columns that may not be present in the schema definition without being blocked by the type checker.

### 4. Unchanged Result Types

This proposal focuses exclusively on improving the developer experience for query *inputs*. The return types of all query methods (`execute()`, `fetchAll()`, `fetchOne()`, etc.) will **not** be modified. They will continue to return generic object shapes as they do currently.

## Implementation Sketch

To implement this, we will make the `QueryBuilder` class and its associated option interfaces generic.

### `src/builder.ts`

The `QueryBuilder` class will be parameterized with a `Schema` type.

```typescript
// The base QueryBuilder will accept a Schema generic
export class QueryBuilder<T, Schema extends DatabaseSchema> {
  // ... existing properties

  // Methods will be updated to use the Schema type for input validation
  insert<TableName extends keyof Schema>(
    options: InsertOptions<Schema, TableName>
  ): QueryBuilder<T, Schema> {
    // ... implementation
  }

  select<TableName extends keyof Schema>(
    tableName: TableName
  ): SelectBuilder<any, Schema, TableName> { // Result type remains `any` or generic
    // ... implementation
  }

  // ... other methods like update, delete, fetchAll, fetchOne will be updated similarly
}
```

### `src/interfaces.ts`

The interfaces for method options will also be made generic to constrain input based on the provided schema.

```typescript
// A generic type for field names that provides hints but allows any string.
export type Field<Schema, TableName extends keyof Schema> =
  | (string & {})
  | keyof Schema[TableName];

// SelectOptions will be typed based on the schema and table name
export interface SelectOptions<Schema, TableName extends keyof Schema> {
  tableName: TableName;
  fields?: Field<Schema, TableName>[];
  where?: Where;
  // ... other options
}

// InsertOptions will ensure the `data` object conforms to the table's columns
export interface InsertOptions<Schema, TableName extends keyof Schema> {
  tableName: TableName;
  data: Partial<Schema[TableName]> | Partial<Schema[TableName]>[];
  returning?: Field<Schema, TableName>[];
  // ... other options
}
```

The `SelectBuilder` (`src/modularBuilder.ts`) will also be updated to carry the generic types through its chainable methods, ensuring end-to-end type safety for inputs.

## Example Usage

Here is how the developer experience will be improved for query *inputs*.

### `select` / `fetchAll`

```typescript
const qb = new D1QB<MyDBSchema>(env.DB);

// `tableName` autocompletes to 'users', 'posts', or 'roles'.
// `fields` autocompletes to columns of the 'users' table.
const users = await qb.fetchAll({
  tableName: 'users',
  fields: [
    'id',
    'name',
    'email',
    'password', // No TypeScript error, allows for flexibility.
    'name as userName' // Aliases are also allowed.
  ],
}).execute();

// The type of `users.results` remains unchanged (e.g., `any[]` or `Record<string, any>[]`).
```

### Modular `select`

```typescript
const user = await qb
  .select('users') // Typed! Autocompletes table names.
  .fields(['id', 'name']) // Typed! Autocompletes column names.
  .where('id = ?', 1)
  .execute();
```

### `insert`

```typescript
const newUser = await qb.insert({
  tableName: 'users', // Typed!
  data: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    role_id: 1,
    unknown_field: 'test' // TypeScript Error: 'unknown_field' does not exist in type 'Partial<users>'
  },
  returning: ['id', 'name', 'email as user_email'], // `returning` allows any string.
}).execute();
```

### `update`

```typescript
const updatedUser = await qb.update({
  tableName: 'users', // Typed!
  data: {
    name: 'Jane Doe',
    age: 30 // TypeScript Error: 'age' does not exist in type 'Partial<users>'
  },
  where: { conditions: 'id = ?', params: [1] },
  returning: ['id', 'name'], // Typed!
}).execute();
```

### `delete`

```typescript
const deletedUser = await qb.delete({
  tableName: 'users', // Typed!
  where: { conditions: 'id = ?', params: [1] },
  returning: ['id', 'name', 'email'], // Typed!
}).execute();
```

**Note on Migrations**: The migrations builder will not be affected by these type-hinting changes. Since migration logic often involves raw SQL for schema manipulation and may deal with tables or columns that do not yet exist in the TypeScript schema definition, it will continue to operate with string-based inputs to maintain flexibility.
