# Advanced Queries

This section delves into advanced query building features of `workers-qb`, allowing you to construct complex and efficient database interactions.

## Joins

`workers-qb` supports various types of SQL JOIN clauses to combine data from multiple tables.

### INNER JOIN

An INNER JOIN returns rows only when there is a match in both tables based on the join condition.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type UserWithRole = {
  userName: string;
  roleName: string;
};

const usersWithRoles = await qb.fetchAll<UserWithRole>({
  tableName: 'users',
  fields: ['users.name AS userName', 'roles.name AS roleName'],
  join: {
    type: 'INNER', // or 'INNER JOIN'
    table: 'roles',
    on: 'users.role_id = roles.id',
  },
}).execute();

console.log('Users with roles:', usersWithRoles.results);
```

### LEFT JOIN

A LEFT JOIN (or LEFT OUTER JOIN) returns all rows from the left table and the matching rows from the right table. If there's no match in the right table, columns from the right table will contain `NULL` values.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type UserWithOptionalRole = {
  userName: string;
  roleName: string | null; // Role can be null if no match
};

const usersWithOptionalRoles = await qb.fetchAll<UserWithOptionalRole>({
  tableName: 'users',
  fields: ['users.name AS userName', 'roles.name AS roleName'],
  join: {
    type: 'LEFT', // or 'LEFT JOIN' or 'LEFT OUTER JOIN'
    table: 'roles',
    on: 'users.role_id = roles.id',
  },
}).execute();

console.log('Users with optional roles:', usersWithOptionalRoles.results);
```

### CROSS JOIN

A CROSS JOIN returns the Cartesian product of rows from the tables in the join. It combines each row from the first table with each row from the second table. **Use CROSS JOIN with caution, as it can result in very large result sets.**

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type UserAndProduct = {
  userName: string;
  productName: string;
};

const userProductCombinations = await qb.fetchAll<UserAndProduct>({
  tableName: 'users',
  fields: ['users.name AS userName', 'products.name AS productName'],
  join: {
    type: 'CROSS', // or 'CROSS JOIN'
    table: 'products',
    on: '1=1', // Condition is usually '1=1' for CROSS JOIN
  },
}).execute();

console.log('User and product combinations:', userProductCombinations.results);
```

## Modular Select Queries

`workers-qb` provides a modular `select()` builder for constructing SELECT queries in a chainable and readable manner.

### Introduction to SelectBuilder

The `select()` method initiates a `SelectBuilder` instance, allowing you to progressively build your SELECT query by chaining methods.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const selectBuilder = qb.select('users'); // Start building a select query on 'users' table
```

### Chaining Methods

You can chain various methods on the `SelectBuilder` to define different parts of your query:

*   `.fields()`: Specify the columns to select.
*   `.where()`: Add WHERE conditions.
*   `.join()`: Add JOIN clauses.
*   `.groupBy()`: Add GROUP BY clause.
*   `.having()`: Add HAVING clause.
*   `.orderBy()`: Add ORDER BY clause.
*   `.limit()`: Add LIMIT clause.
*   `.offset()`: Add OFFSET clause.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type UserInfo = {
  name: string;
  email: string;
  roleName: string;
};

const usersInfo = await qb.select<UserInfo>('users')
  .fields(['users.name', 'users.email', 'roles.name AS roleName'])
  .join({
    type: 'LEFT',
    table: 'roles',
    on: 'users.role_id = roles.id',
  })
  .where('users.is_active = ?', true)
  .orderBy('users.name ASC')
  .limit(10)
  .execute();

console.log('Users info:', usersInfo.results);
```

### Executing Queries

The `SelectBuilder` provides methods to execute the built query and retrieve results:

*   `.execute()`: Executes the query and returns `ArrayResult` or `OneResult` based on the nature of the constructed query (e.g., if `.limit(1)` is used, it might behave like `fetchOne`).
*   `.all()`: Explicitly executes as `fetchAll` and returns `ArrayResult`.
*   `.one()`: Explicitly executes as `fetchOne` and returns `OneResult`.
*   `.count()`: Executes a `COUNT(*)` query based on the current builder configuration (ignoring fields, limit, offset, orderBy) and returns `CountResult`.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const activeUserCount = await qb.select('users')
  .where('is_active = ?', true)
  .count(); // Executes COUNT(*) query

console.log('Active user count:', activeUserCount.results?.total);

const firstActiveUser = await qb.select<UserInfo>('users')
  .where('is_active = ?', true)
  .orderBy('name ASC')
  .limit(1)
  .one(); // Executes fetchOne query

console.log('First active user:', firstActiveUser.results);
```

## Where Clauses

`workers-qb` provides flexible ways to define WHERE conditions.

### String Conditions

You can use a simple string to define your WHERE clause. Use `?` placeholders for parameterized queries to prevent SQL injection.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const usersByName = await qb.fetchAll({
  tableName: 'users',
  where: 'name LIKE ?', // String condition
  params: 'J%',
}).execute();

console.log('Users starting with "J":', usersByName.results);
```

### Object Conditions

For more structured conditions, you can use an object with `conditions` and `params` properties. `conditions` can be a string or an array of strings (joined by `AND`).

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const usersByRoleAndActive = await qb.fetchAll({
  tableName: 'users',
  where: {
    conditions: [
      'role_id = ?',
      'is_active = ?',
    ], // Array of conditions, joined by AND
    params: [2, true], // Parameters for each condition
  },
}).execute();

console.log('Active users in role 2:', usersByRoleAndActive.results);
```

### `whereIn` Clause

The `whereIn` method provides a convenient way to filter records based on a set of values for a specific column or columns.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const usersInSpecificRoles = await qb.select('users')
  .whereIn('role_id', [1, 2, 3]) // Filter users with role_id in [1, 2, 3]
  .execute();

console.log('Users in roles 1, 2, or 3:', usersInSpecificRoles.results);

const usersInSpecificRolesMultipleColumns = await qb.select('users')
  .whereIn(['role_id', 'department_id'], [[1, 101], [2, 102]]) // Filter users with (role_id, department_id) in [(1, 101), (2, 102)]
  .execute();

console.log('Users in specific role and department combinations:', usersInSpecificRolesMultipleColumns.results);
```

## Group By and Having

### Group By Clause

Use the `groupBy` method to group rows with the same values in one or more columns into summary rows.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type RoleUserCount = {
  roleName: string;
  userCount: number;
};

const userCountsByRole = await qb.fetchAll<RoleUserCount>({
  tableName: 'users',
  fields: ['roles.name AS roleName', 'COUNT(users.id) AS userCount'],
  join: {
    type: 'INNER',
    table: 'roles',
    on: 'users.role_id = roles.id',
  },
  groupBy: 'roles.name', // Group by role name
}).execute();

console.log('User counts by role:', userCountsByRole.results);
```

### Having Clause

The `having` method filters groups based on aggregate functions, similar to WHERE but for grouped rows.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type RoleUserCount = {
  roleName: string;
  userCount: number;
};

const rolesWithMoreThan5Users = await qb.fetchAll<RoleUserCount>({
  tableName: 'users',
  fields: ['roles.name AS roleName', 'COUNT(users.id) AS userCount'],
  join: {
    type: 'INNER',
    table: 'roles',
    on: 'users.role_id = roles.id',
  },
  groupBy: 'roles.name',
  having: 'COUNT(users.id) > 5', // Filter groups with user count greater than 5
}).execute();

console.log('Roles with more than 5 users:', rolesWithMoreThan5Users.results);
```

## Order By

### Simple Order By

Use the `orderBy` method to sort the result set by one or more columns. By default, it sorts in ascending order (ASC).

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

const usersOrderedByName = await qb.fetchAll<User>({
  tableName: 'users',
  orderBy: 'name', // Order by name in ascending order
}).execute();

console.log('Users ordered by name:', usersOrderedByName.results);
```

### Order By with Direction (ASC/DESC)

Specify the sorting direction (ASC for ascending, DESC for descending) for each column.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const usersOrderedByNameDesc = await qb.fetchAll<User>({
  tableName: 'users',
  orderBy: { name: 'DESC' }, // Order by name in descending order
}).execute();

console.log('Users ordered by name (descending):', usersOrderedByNameDesc.results);
```

### Multiple Order By

Order by multiple columns by providing an array or an object to `orderBy`.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const usersOrderedByRoleNameAndName = await qb.fetchAll<User>({
  tableName: 'users',
  orderBy: [
    { role_id: 'ASC' }, // Order by role_id ascending first
    'name DESC',      // Then by name descending
  ],
}).execute();

console.log('Users ordered by role and name:', usersOrderedByRoleNameAndName.results);
```

## Limit and Offset

### Limit Clause

Use the `limit` method to restrict the number of rows returned by the query.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

const first5Users = await qb.fetchAll<User>({
  tableName: 'users',
  limit: 5, // Limit results to 5 rows
}).execute();

console.log('First 5 users:', first5Users.results);
```

### Offset Clause

Use the `offset` method to skip a certain number of rows before starting to return the result set. Useful for pagination.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

const usersPage2 = await qb.fetchAll<User>({
  tableName: 'users',
  limit: 10, // Page size of 10
  offset: 10, // Skip first 10 rows to get page 2
}).execute();

console.log('Users page 2:', usersPage2.results);
```

## Raw Queries

For scenarios where you need to execute highly specific or complex SQL queries that are not easily constructed using the builder methods, `workers-qb` allows you to execute raw SQL queries.

### Executing Raw SQL Queries

Use the `raw` method to execute a raw SQL query string. You can provide parameterized arguments as an array.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

const tableName = 'users';
const columnName = 'email';

const rawQueryResults = await qb.raw({
  query: `SELECT COUNT(*) AS userCount FROM ${tableName} WHERE LENGTH(${columnName}) > ?`,
  args: [10], // Parameter for minimum email length
}).execute();

console.log('Raw query results:', rawQueryResults.results);
```

### Fetching Results from Raw Queries

When using `raw`, you can specify the `fetchType` to indicate whether you expect to fetch one row (`FetchTypes.ONE`) or multiple rows (`FetchTypes.ALL`). If you don't specify `fetchType`, the query will be executed without fetching results (useful for `INSERT`, `UPDATE`, `DELETE` raw queries).

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

type User = {
  id: number;
  name: string;
  email: string;
};

const rawUsers = await qb.raw<User>({
  query: 'SELECT id, name, email FROM users WHERE is_active = ?',
  args: [true],
  fetchType: 'ALL', // Specify FetchTypes.ALL to fetch multiple rows
}).execute();

console.log('Raw users:', rawUsers.results);

const rawSingleUser = await qb.raw<User>({
  query: 'SELECT id, name, email FROM users WHERE email = ?',
  args: ['john.doe@example.com'],
  fetchType: 'ONE', // Specify FetchTypes.ONE to fetch a single row
}).execute();

console.log('Raw single user:', rawSingleUser.results);
```

## JSON Functions

`workers-qb` provides methods to utilize Cloudflare D1's JSON functions, enabling powerful manipulation and querying of JSON data stored in your database. These methods typically map directly to their corresponding SQL JSON functions. The results are often JSON strings or values extracted from JSON.

All JSON function methods are available directly on the `D1QB` instance (e.g., `qb.json_extract(...)`).

### `json()`

Validates a JSON string and returns it as a properly typed JSON string. This is useful for ensuring that a string is valid JSON before storing or operating on it.

*   **Signature:** `json(jsonData: string): Promise<D1Result>`
*   **SQL Equivalent:** `json(?)`
*   **Example:**

```typescript
const myJsonString = '{"name": "test", "value": 123}';
const validatedJson = await qb.json(myJsonString);
// validatedJson.results will contain something like: { "json(?)": "{\"name\": \"test\", \"value\": 123}" }
// The actual key in results may vary based on the driver.
console.log(validatedJson.results);
```

### `json_array()`

Creates a new JSON array from a list of values.

*   **Signature:** `json_array(...args: any[]): Promise<D1Result>`
*   **SQL Equivalent:** `json_array(value1, value2, ...)`
*   **Example:**

```typescript
const newArray = await qb.json_array(1, "apple", null, JSON.stringify({ripe: true}));
// newArray.results will contain the JSON string: '[1,"apple",null,{"ripe":true}]'
// Example: { "json_array(...)": "[1,\"apple\",null,{\"ripe\":true}]" }
console.log(newArray.results);
```

### `json_array_length()`

Returns the number of elements in a JSON array. Can also return the length of a nested array using a path.

*   **Signature:** `json_array_length(jsonData: string, path?: string): Promise<D1Result>`
*   **SQL Equivalent:** `json_array_length(json, path)`
*   **Example:**

```typescript
const arrString = '[1, 2, {"key": "value"}]';
const length = await qb.json_array_length(arrString);
// length.results: { "json_array_length(?)": 3 }

const nestedArrString = '{"items": ["a", "b", "c", "d"]}';
const nestedLength = await qb.json_array_length(nestedArrString, '$.items');
// nestedLength.results: { "json_array_length(?, ?)": 4 }
```

### `json_extract()`

Extracts one or more values from a JSON string using JSONPath expressions.

*   **Signature:** `json_extract(jsonData: string, ...paths: string[]): Promise<D1Result>`
*   **SQL Equivalent:** `json_extract(json, path1, path2, ...)`
*   **Example:**

```typescript
const data = '{"name": "Jane Doe", "age": 30, "address": {"street": "123 Main St", "city": "Anytown"}}';
const name = await qb.json_extract(data, '$.name');
// name.results: { "json_extract(?,?)": "Jane Doe" }

const addressCity = await qb.json_extract(data, '$.address.city');
// addressCity.results: { "json_extract(?,?)": "Anytown" }
```

### `json_insert()`

Inserts or appends values into a JSON string at specified paths. If a path already exists, it does not replace the value (use `json_set` or `json_replace` for that).

*   **Signature:** `json_insert(jsonData: string, path: string, value: any, ...args: any[]): Promise<D1Result>`
*   **SQL Equivalent:** `json_insert(json, path, value, path2, value2, ...)`
*   **Example:**

```typescript
const originalJson = '{"name": "John", "tags": ["dev"]}';
const newValue = '{"status": "active"}'; // Can be stringified JSON or primitive
const updatedJson = await qb.json_insert(originalJson, '$.age', 30, '$.tags[1]', 'qa');
// updatedJson.results will contain the modified JSON string:
// '{"name":"John","tags":["dev","qa"],"age":30}'
console.log(updatedJson.results);
```

### `json_object()`

Creates a new JSON object from a list of key-value pairs.

*   **Signature:** `json_object(...args: any[]): Promise<D1Result>` (expects alternating key (string), value pairs)
*   **SQL Equivalent:** `json_object(key1, value1, key2, value2, ...)`
*   **Example:**

```typescript
const newObject = await qb.json_object('firstName', 'Jane', 'lastName', 'Doe', 'hobbies', JSON.stringify(['reading', 'hiking']));
// newObject.results will contain:
// '{"firstName":"Jane","lastName":"Doe","hobbies":["reading","hiking"]}'
console.log(newObject.results);
```

### `json_patch()`

Applies a JSON patch (RFC 6902) to a JSON string. In SQLite, this often behaves more like a merge patch.

*   **Signature:** `json_patch(jsonData: string, patchData: string): Promise<D1Result>`
*   **SQL Equivalent:** `json_patch(json, patch)`
*   **Example:**

```typescript
const doc = '{"a": 1, "b": 2}';
// SQLite's json_patch is more of a "merge" operation
const patch = '{"a": 6, "c": 7}'; // Patch to merge
const patchedJson = await qb.json_patch(doc, patch);
// patchedJson.results: '{"a":6,"b":2,"c":7}'
console.log(patchedJson.results);
```

### `json_remove()`

Removes one or more elements from a JSON string at specified paths.

*   **Signature:** `json_remove(jsonData: string, ...paths: string[]): Promise<D1Result>`
*   **SQL Equivalent:** `json_remove(json, path1, path2, ...)`
*   **Example:**

```typescript
const data = '{"name": "Jane Doe", "age": 30, "obsoleteField": "deleteMe"}';
const cleanedJson = await qb.json_remove(data, '$.obsoleteField', '$.age');
// cleanedJson.results: '{"name":"Jane Doe"}'
console.log(cleanedJson.results);
```

### `json_replace()`

Replaces existing values in a JSON string at specified paths. If a path does not exist, no change is made.

*   **Signature:** `json_replace(jsonData: string, path: string, value: any, ...args: any[]): Promise<D1Result>`
*   **SQL Equivalent:** `json_replace(json, path, value, path2, value2, ...)`
*   **Example:**

```typescript
const originalJson = '{"name": "John", "age": 30}';
const updatedJson = await qb.json_replace(originalJson, '$.age', 31);
// updatedJson.results: '{"name":"John","age":31}'

const notChangedJson = await qb.json_replace(originalJson, '$.nonExistent', 'newValue');
// notChangedJson.results: '{"name":"John","age":30}' (no change)
console.log(updatedJson.results);
```

### `json_set()`

Sets (inserts or replaces) values in a JSON string at specified paths. If the path exists, it replaces the value; if not, it inserts it.

*   **Signature:** `json_set(jsonData: string, path: string, value: any, ...args: any[]): Promise<D1Result>`
*   **SQL Equivalent:** `json_set(json, path, value, path2, value2, ...)`
*   **Example:**

```typescript
const originalJson = '{"name": "John", "age": 30}';
// Replace existing
const updatedJson = await qb.json_set(originalJson, '$.age', 31);
// updatedJson.results: '{"name":"John","age":31}'

// Insert new
const insertedJson = await qb.json_set(originalJson, '$.status', 'active');
// insertedJson.results: '{"name":"John","age":30,"status":"active"}'
console.log(insertedJson.results);
```

### `json_type()`

Returns the type of a JSON value (e.g., 'object', 'array', 'string', 'integer', 'real', 'true', 'false', 'null'). Can target a specific path.

*   **Signature:** `json_type(jsonData: string, path?: string): Promise<D1Result>`
*   **SQL Equivalent:** `json_type(json, path)`
*   **Example:**

```typescript
const data = '{"name": "Jane", "count": 100, "isActive": true, "tags": ["a", "b"]}';
const typeOfName = await qb.json_type(data, '$.name');
// typeOfName.results: { "json_type(?,?)": "text" } (SQLite specific type)

const typeOfCount = await qb.json_type(data, '$.count');
// typeOfCount.results: { "json_type(?,?)": "integer" }

const typeOfTags = await qb.json_type(data, '$.tags');
// typeOfTags.results: { "json_type(?,?)": "array" }
```

### `json_valid()`

Checks if a string is valid JSON. Returns 1 if valid, 0 otherwise.

*   **Signature:** `json_valid(jsonData: string): Promise<D1Result>`
*   **SQL Equivalent:** `json_valid(json)`
*   **Example:**

```typescript
const validJson = '{"key": "value"}';
const isValid = await qb.json_valid(validJson);
// isValid.results: { "json_valid(?)": 1 }

const invalidJson = '{"key": "value"';
const isInvalid = await qb.json_valid(invalidJson);
// isInvalid.results: { "json_valid(?)": 0 }
```

### `json_quote()`

Quotes a string as a JSON string value. For numbers or booleans, it returns them as JSON numbers or booleans (often unquoted in the result, but correctly typed for JSON context). Nulls become the 'null' literal.

*   **Signature:** `json_quote(value: any): Promise<D1Result>`
*   **SQL Equivalent:** `json_quote(value)`
*   **Example:**

```typescript
const quotedString = await qb.json_quote("hello world");
// quotedString.results: { "json_quote(?)": "\"hello world\"" }

const quotedNumber = await qb.json_quote(123.45);
// quotedNumber.results: { "json_quote(?)": 123.45 } (SQLite returns number directly)
```

### `json_group_array()`

An aggregate function that returns a JSON array composed of all values in a group. Typically used in `SELECT` statements with `GROUP BY`. The `D1QB` method is a direct passthrough for the function name.

*   **Signature:** `json_group_array(value: any): Promise<D1Result>`
*   **SQL Equivalent (within a query):** `SELECT json_group_array(column_name) FROM table GROUP BY ...;`
*   **Example (direct call, limited use):**

```typescript
// Note: More typically used in a full SELECT query via qb.select() or qb.raw().
// Direct call like this might have limited use cases or specific DB behavior.
const groupedArray = await qb.json_group_array('some_column_or_value');
// Example result if 'some_column_or_value' was treated as a single literal for aggregation:
// groupedArray.results: { "json_group_array(?)": "[\"some_column_or_value\"]" }
console.log(groupedArray.results);
```

### `json_each()`

A table-valued function that iterates over a JSON object or array, returning one row for each element. The `D1QB` method currently fetches the first row due to `FetchTypes.ONE` in its implementation.

*   **Signature:** `json_each(jsonData: string, path?: string): Promise<D1Result>`
*   **SQL Equivalent (within a query):** `SELECT * FROM json_each(json, path);`
*   **Example (fetches first row):**

```typescript
const data = '{"a": 1, "b": [2,3]}';
const firstElement = await qb.json_each(data);
// firstElement.results will be an object representing the first row from json_each,
// e.g., { key: "a", value: 1, type: "integer", ... }
console.log(firstElement.results);
```

### `json_tree()`

A table-valued function similar to `json_each`, but it recursively walks through the JSON structure. The `D1QB` method currently fetches the first row.

*   **Signature:** `json_tree(jsonData: string, path?: string): Promise<D1Result>`
*   **SQL Equivalent (within a query):** `SELECT * FROM json_tree(json, path);`
*   **Example (fetches first row):**

```typescript
const nestedData = '{"a": 1, "b": {"c": 2, "d": {"e": 3}}}';
const firstNode = await qb.json_tree(nestedData);
// firstNode.results will be an object representing the first node from json_tree.
console.log(firstNode.results);
```
