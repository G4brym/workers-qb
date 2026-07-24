---
title: JSON Queries
description: How to query JSON fields in workers-qb.
---

# Querying JSON Fields

`workers-qb` takes advantage of the powerful JSON querying capabilities of the underlying database engines, especially Cloudflare D1. This allows you to efficiently work with JSON data stored in your database.

JSON data is typically stored in a `TEXT` column. You can then use a variety of functions to manipulate and query this data directly in your SQL queries.

## Setup

Define your schema with JSON columns using `Record<string, unknown>` or a specific type:

```typescript
import { D1QB } from 'workers-qb';

type Schema = {
  users: {
    id: number;
    name: string;
    data: Record<string, unknown>;  // JSON column
  };
  posts: {
    id: number;
    title: string;
    data: { tags: string[]; metadata: Record<string, unknown> };  // Typed JSON
  };
};

const qb = new D1QB<Schema>(env.DB);
```

## Extracting Values

You can extract values from a JSON object using `json_extract`, `->`, and `->>`.

- `json_extract(json, path)`: Extracts a value from a JSON object at a given path.
- `->`: Extracts a value as a JSON object.
- `->>`: Extracts a value as a SQL type.

```typescript
// Example JSON object stored in a 'data' column:
// { "name": "John Doe", "age": 30, "is_active": true, "tags": ["a", "b"] }

// Using json_extract - use explicit type for custom fields
type UserName = { name: string };

const user = await qb.fetchOne<UserName>({
  tableName: 'users',
  fields: ["json_extract(data, '$.name') as name"],
  where: { conditions: 'id = ?', params: 1 },
}).execute();
// user.results.name will be "John Doe"

// Using ->>
const user2 = await qb.fetchOne<UserName>({
  tableName: 'users',
  fields: ["data ->> '$.name' as name"],
  where: { conditions: 'id = ?', params: 1 },
}).execute();
// user2.results.name will be "John Doe"
```

## Array Operations

### Get Array Length

Use `json_array_length` to get the number of elements in a JSON array.

```typescript
// data column: { "tags": ["a", "b", "c"] }
type TagCount = { count: number };

const tagCount = await qb.fetchOne<TagCount>({
  tableName: 'posts',
  fields: ["json_array_length(data, '$.tags') as count"],
  where: { conditions: 'id = ?', params: 1 },
}).execute();
// tagCount.results.count will be 3
```

### Expand Arrays for `IN` Queries

`json_each` can be used to expand a JSON array into a set of rows, which is useful for `IN` clauses.

```typescript
const userIds = [1, 2, 3];
const users = await qb.fetchAll({
  tableName: 'users',
  where: {
    conditions: `id IN (SELECT value FROM json_each(?))`,
    params: [JSON.stringify(userIds)],
  },
}).execute();
```

## Modifying JSON Data

### Insert, Replace, and Set

- `json_insert(json, path, value)`: Inserts a value at a given path. Does not overwrite existing values.
- `json_replace(json, path, value)`: Replaces an existing value at a given path.
- `json_set(json, path, value)`: Sets a value at a given path, overwriting if it exists or creating if it does not.

```typescript
import { D1QB, Raw } from 'workers-qb';

type Schema = {
  users: {
    id: number;
    data: Record<string, unknown>;
  };
};

const qb = new D1QB<Schema>(env.DB);

// data column: { "name": "John Doe" }

// Using json_set to add an age
// We wrap the SQL function in `new Raw()` to tell the query builder to treat it as a raw expression.
await qb.update({
  tableName: 'users',
  data: {
    data: new Raw(`json_set(data, '$.age', 30)`),
  },
  where: { conditions: 'id = ?', params: 1 },
}).execute();
// data column is now: { "name": "John Doe", "age": 30 }
```

## Creating JSON

You can create JSON objects and arrays directly in your queries.

- `json_object(label1, value1, ...)`: Creates a JSON object from key-value pairs.
- `json_array(value1, value2, ...)`: Creates a JSON array.

```typescript
type JsonResult = { json_data: Record<string, unknown> };

const result = await qb.fetchOne<JsonResult>({
  tableName: 'users', // This can be any table
  fields: ["json_object('name', 'John', 'age', 30) as json_data"],
}).execute();
// result.results.json_data will be { "name": "John", "age": 30 }
```

## Other Useful Functions

- `json_type(json, path)`: Returns the type of a JSON value.
- `json_valid(json)`: Checks if a string is valid JSON.
- `json_quote(value)`: Converts a SQL value to its JSON representation.

```typescript
// json_type
type AgeType = { ageType: string };

const user = await qb.fetchOne<AgeType>({
  tableName: 'users',
  fields: ["json_type(data, '$.age') as ageType"],
  where: { conditions: 'id = ?', params: 1 },
}).execute();
// user.results.ageType will be 'integer'

// json_valid
type ValidResult = { isValid: number };

const result = await qb.fetchOne<ValidResult>({
  tableName: 'users', // This can be any table
  fields: ["json_valid('{\"a\":1}') as isValid"],
}).execute();
// result.results.isValid will be 1 (true)

// json_quote
type JsonString = { json_string: string };

const result2 = await qb.fetchOne<JsonString>({
  tableName: 'users', // This can be any table
  fields: ["json_quote('[1, 2, 3]') as json_string"],
}).execute();
// result2.results.json_string will be "[1,2,3]"
```
