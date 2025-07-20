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

## Subqueries

`workers-qb` supports using subqueries within your `WHERE` and `HAVING` clauses, allowing for more complex and powerful queries. You can construct a subquery using the same modular `select()` builder and then pass its configuration to the main query.

To pass a subquery as a parameter, you build it and then call `.getOptions()` on the `SelectBuilder` instance.

### `IN` with a Subquery

Use a subquery to filter results based on a dynamic set of values.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

// Subquery: Get IDs of all active projects
const activeProjectsSubquery = qb
  .select('projects')
  .fields('id')
  .where('status = ?', 'active');

// Main query: Get tasks that belong to active projects
const tasksInActiveProjects = await qb
  .select('tasks')
  .where('project_id IN ?', [activeProjectsSubquery.getOptions()])
  .execute();

console.log(tasksInActiveProjects.results);
// SQL: SELECT * FROM tasks WHERE project_id IN (SELECT id FROM projects WHERE status = 'active')
```

### `EXISTS` with a Subquery

Check for the existence of rows in a subquery. This is useful for conditional filtering.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

// Subquery: Check if a user has the 'edit' permission for a document
const hasEditPermissionSubquery = qb
  .select('permissions')
  .where('user_id = ?', 100)
  .where('action = ?', 'edit');

// Main query: Select documents where the user has 'edit' permission
const editableDocuments = await qb
  .select('documents')
  .where('EXISTS ?', [hasEditPermissionSubquery.getOptions()])
  .execute();

console.log(editableDocuments.results);
// SQL: SELECT * FROM documents WHERE EXISTS (SELECT * FROM permissions WHERE user_id = 100 AND action = 'edit')
```

### Scalar Subquery

Use a subquery that returns a single value (a scalar) to compare against a column.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

// Subquery: Get the default role ID from a settings table
const defaultRoleSubquery = qb
  .select('settings')
  .fields('value')
  .where('key = ?', 'default_role')
  .limit(1);

// Main query: Find all users who have the default role
const usersWithDefaultRole = await qb
  .select('users')
  .where('role_id = ?', [defaultRoleSubquery.getOptions()])
  .execute();

console.log(usersWithDefaultRole.results);
// SQL: SELECT * FROM users WHERE role_id = (SELECT value FROM settings WHERE key = 'default_role' LIMIT 1)
```

### Subqueries in `HAVING` Clauses

You can also use subqueries within a `HAVING` clause to filter grouped results.

```typescript
import { D1QB } from 'workers-qb';

// ... (D1QB initialization) ...

// Subquery: Get IDs of customers with total order value over 1000
const highValueCustomersSubquery = qb
  .select('orders')
  .fields('customer_id')
  .groupBy('customer_id')
  .having('SUM(total) > ?', 1000);

// Main query: Get customer details for high-value customers
const customerDetails = await qb
  .select('customers')
  .fields(['id', 'name'])
  .having('id IN ?', [highValueCustomersSubquery.getOptions()])
  .execute();

console.log(customerDetails.results);
// SQL: SELECT id, name FROM customers HAVING id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(total) > 1000)
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
