# API Reference

This section provides a detailed API reference for all classes, enums, and interfaces in the `workers-qb` library.

## Classes

### `QueryBuilder<GenericResultWrapper, IsAsync extends boolean = true>`

The base class for all query builders. Extend this class to create custom database adapters.

*   **Constructor:** `constructor(options?: QueryBuilderOptions<IsAsync>)`
  *   `options`: (Optional) An object of type `QueryBuilderOptions` to configure the query builder.
*   **Methods:**
  *   `setDebugger(state: boolean): void`
    *   Enables or disables query logging to the console.
    *   `state`: `boolean` - `true` to enable debugging, `false` to disable.
  *   `execute(query: Query<any, IsAsync>): MaybeAsync<IsAsync, any>`
    *   **Abstract method.** Must be implemented by subclasses. Executes a single SQL query.
    *   `query`: `Query<any, IsAsync>` - The `Query` object to execute.
    *   Returns: `MaybeAsync<IsAsync, any>` - Database-specific result wrapper.
  *   `batchExecute(queryArray: Query<any, IsAsync>[]): MaybeAsync<IsAsync, any[]>`
    *   **Abstract method.** Must be implemented by subclasses. Executes a batch of SQL queries.
    *   `queryArray`: `Query<any, IsAsync>[]` - An array of `Query` objects to execute in a batch.
    *   Returns: `MaybeAsync<IsAsync, any[]>` - An array of database-specific result wrappers, one for each query.
  *   `lazyExecute(query: Query<any, IsAsync>): IsAsync extends true ? Promise<AsyncIterable<any>> : Iterable<any>`
    *   **Abstract method.** Must be implemented by subclasses. Executes a query and returns an iterable for lazy row loading.
    *   `query`: `Query<any, IsAsync>` - The `Query` object to execute lazily.
    *   Returns: `IsAsync extends true ? Promise<AsyncIterable<any>> : Iterable<any>` - An async iterable (if async) or iterable (if sync) of query results.
  *   `createTable<GenericResult = undefined>(params: { tableName: string; schema: string; ifNotExists?: boolean }): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>`
    *   Creates a new table.
    *   `params`: An object with table creation parameters:
      *   `tableName`: `string` - The name of the table to create.
      *   `schema`: `string` - The table schema definition (SQL string).
      *   `ifNotExists`: `boolean` (Optional) - If `true`, prevents errors if the table already exists.
    *   Returns: `Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>` - A `Query` object for executing the CREATE TABLE statement.
  *   `dropTable<GenericResult = undefined>(params: { tableName: string; ifExists?: boolean }): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>`
    *   Drops (deletes) a table.
    *   `params`: An object with table dropping parameters:
      *   `tableName`: `string` - The name of the table to drop.
      *   `ifExists`: `boolean` (Optional) - If `true`, prevents errors if the table does not exist.
    *   Returns: `Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>` - A `Query` object for executing the DROP TABLE statement.
  *   `select<GenericResult = DefaultReturnObject>(tableName: string): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Starts building a SELECT query using the `SelectBuilder`.
    *   `tableName`: `string` - The name of the table to select from.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - A `SelectBuilder` instance for constructing the SELECT query.
  *   `fetchOne<GenericResult = DefaultReturnObject>(params: SelectOne): QueryWithExtra<GenericResultWrapper, OneResult<GenericResultWrapper, GenericResult>, IsAsync>`
    *   Fetches a single row based on the `SelectOne` parameters.
    *   `params`: `SelectOne` - Parameters defining the SELECT query to fetch one row.
    *   Returns: `QueryWithExtra<GenericResultWrapper, OneResult<GenericResultWrapper, GenericResult>, IsAsync>` - A `QueryWithExtra` object for executing the SELECT query and related count query.
  *   `fetchAll<GenericResult = DefaultReturnObject, IsLazy extends true | undefined = undefined>(params: SelectAll<IsLazy>): QueryWithExtra<GenericResultWrapper, ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>, IsAsync>`
    *   Fetches multiple rows based on the `SelectAll` parameters.
    *   `params`: `SelectAll<IsLazy>` - Parameters defining the SELECT query to fetch multiple rows.
    *   Returns: `QueryWithExtra<GenericResultWrapper, ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>, IsAsync>` - A `QueryWithExtra` object for executing the SELECT query and related count query.
  *   `raw<GenericResult = DefaultReturnObject>(params: RawQueryFetchOne): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>`
  *   `raw<GenericResult = DefaultReturnObject>(params: RawQueryFetchAll): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>`
  *   `raw<GenericResult = DefaultReturnObject>(params: RawQueryWithoutFetching): Query<GenericResultWrapper, IsAsync>`
    *   Executes a raw SQL query. Overloaded method for different fetch types.
    *   `params`: `RawQuery` (or subtypes) - Parameters defining the raw SQL query.
    *   Returns: `Query<...>` - A `Query` object for executing the raw SQL query. Return type depends on the `fetchType` in `params`.
  *   `insert<GenericResult = DefaultReturnObject>(params: InsertOne): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>`
  *   `insert<GenericResult = DefaultReturnObject>(params: InsertMultiple): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>`
  *   `insert<GenericResult = DefaultReturnObject>(params: InsertWithoutReturning): Query<GenericResultWrapper, IsAsync>`
    *   Inserts data into a table. Overloaded method for different insert types and returning options.
    *   `params`: `Insert` (or subtypes) - Parameters defining the INSERT operation.
    *   Returns: `Query<...>` - A `Query` object for executing the INSERT statement. Return type depends on the `returning` option in `params`.
  *   `update<GenericResult = DefaultReturnObject>(params: UpdateReturning): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>`
  *   `update<GenericResult = DefaultReturnObject>(params: UpdateWithoutReturning): Query<GenericResultWrapper, IsAsync>`
    *   Updates data in a table. Overloaded method for different returning options.
    *   `params`: `Update` (or subtypes) - Parameters defining the UPDATE operation.
    *   Returns: `Query<...>` - A `Query` object for executing the UPDATE statement. Return type depends on the `returning` option in `params`.
  *   `delete<GenericResult = DefaultReturnObject>(params: DeleteReturning): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync>, IsAsync>`
  *   `delete<GenericResult = DefaultReturnObject>(params: DeleteWithoutReturning): Query<GenericResultWrapper, IsAsync>`
    *   Deletes data from a table. Overloaded method for different returning options.
    *   `params`: `Delete` (or subtypes) - Parameters defining the DELETE operation.
    *   Returns: `Query<...>` - A `Query` object for executing the DELETE statement. Return type depends on the `returning` option in `params`.

### `D1QB` extends `QueryBuilder<D1Result>`

Query builder specifically for Cloudflare D1 databases.

*   **Constructor:** `constructor(db: D1Database, options?: QueryBuilderOptions)`
  *   `db`: `D1Database` - Cloudflare D1 database binding.
  *   `options`: (Optional) `QueryBuilderOptions` - Query builder options.
*   **Methods:**
  *   `migrations(options: MigrationOptions): asyncMigrationsBuilder<D1Result>`
    *   Returns an `asyncMigrationsBuilder` instance for managing migrations in D1.
    *   `options`: `MigrationOptions` - Migration configuration options.
    *   Returns: `asyncMigrationsBuilder<D1Result>` - Migrations builder instance.
  *   `execute(query: Query): Promise<D1Result>`
    *   Overrides `QueryBuilder.execute`. Executes a query on Cloudflare D1.
    *   `query`: `Query` - The `Query` object to execute.
    *   Returns: `Promise<D1Result>` - D1-specific result wrapper.
  *   `batchExecute(queryArray: Query[]): Promise<D1Result[]>`
    *   Overrides `QueryBuilder.batchExecute`. Executes a batch of queries on Cloudflare D1.
    *   `queryArray`: `Query[]` - Array of `Query` objects to execute in a batch.
    *   Returns: `Promise<D1Result[]>` - Array of D1-specific result wrappers.

### `DOQB` extends `QueryBuilder<{}, false>`

Query builder for Cloudflare Durable Objects storage (SQLite). Operates synchronously.

*   **Constructor:** `constructor(db: DurableObjectStorage, options?: QueryBuilderOptions<false>)`
  *   `db`: `DurableObjectStorage` - Durable Object storage instance.
  *   `options`: (Optional) `QueryBuilderOptions<false>` - Query builder options for synchronous operations.
*   **Methods:**
  *   `migrations(options: MigrationOptions): syncMigrationsBuilder<{}>`
    *   Returns a `syncMigrationsBuilder` instance for managing migrations in Durable Objects storage.
    *   `options`: `MigrationOptions` - Migration configuration options.
    *   Returns: `syncMigrationsBuilder<{}>` - Migrations builder instance for synchronous operations.
  *   `execute(query: Query<any, false>): {}`
    *   Overrides `QueryBuilder.execute`. Executes a query on Durable Objects storage (synchronously).
    *   `query`: `Query<any, false>` - The `Query` object to execute.
    *   Returns: `{}` - Durable Objects storage result wrapper (empty object).
  *   `lazyExecute(query: Query<any, false>): Iterable<any>`
    *   Overrides `QueryBuilder.lazyExecute`. Executes a query on Durable Objects storage and returns an iterable for lazy loading (synchronously).
    *   `query`: `Query<any, false>` - The `Query` object to execute lazily.
    *   Returns: `Iterable<any>` - Iterable of query results.

### `PGQB` extends `QueryBuilder<PGResult>`

Query builder for PostgreSQL databases.

*   **Constructor:** `constructor(db: Client, options?: QueryBuilderOptions)`
  *   `db`: `Client` - `pg.Client` instance from `node-postgres`.
  *   `options`: (Optional) `QueryBuilderOptions` - Query builder options.
*   **Methods:**
  *   `migrations(options: MigrationOptions): asyncMigrationsBuilder<PGResult>`
    *   Returns an `asyncMigrationsBuilder` instance for managing migrations in PostgreSQL.
    *   `options`: `MigrationOptions` - Migration configuration options.
    *   Returns: `asyncMigrationsBuilder<PGResult>` - Migrations builder instance.
  *   `connect(): Promise<void>`
    *   Connects to the PostgreSQL database using the `pg.Client`.
    *   Returns: `Promise<void>`
  *   `close(): Promise<void>`
    *   Closes the connection to the PostgreSQL database.
    *   Returns: `Promise<void>`
  *   `execute(query: Query): Promise<PGResult>`
    *   Overrides `QueryBuilder.execute`. Executes a query on PostgreSQL.
    *   `query`: `Query` - The `Query` object to execute.
    *   Returns: `Promise<PGResult>` - PostgreSQL-specific result wrapper.

### `SelectBuilder<GenericResultWrapper, GenericResult = DefaultReturnObject, IsAsync extends boolean = true>`

Builder class for constructing SELECT queries in a modular way.

*   **Constructor:** `constructor(options: Partial<SelectAll>, fetchAll: (params: SelectAll) => QueryWithExtra<GenericResultWrapper, any, IsAsync>, fetchOne: (params: SelectOne) => QueryWithExtra<GenericResultWrapper, any, IsAsync>)`
  *   Internal constructor, not typically instantiated directly. Use `QueryBuilder.select()` to create instances.
*   **Methods:**
  *   `setDebugger(state: boolean): void`
    *   Enables or disables query logging for this SelectBuilder instance.
    *   `state`: `boolean` - `true` to enable debugging, `false` to disable.
  *   `tableName(tableName: SelectAll['tableName']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Sets the table name for the SELECT query.
    *   `tableName`: `string` - The name of the table.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated table name.
  *   `fields(fields: SelectAll['fields']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Sets the fields (columns) to select.
    *   `fields`: `string | Array<string>` - Comma-separated string or array of column names.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated fields.
  *   `where(conditions: string | Array<string>, params?: Primitive | Primitive[]): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds WHERE clause conditions.
    *   `conditions`: `string | Array<string>` - WHERE clause condition string or array of condition strings (joined by AND).
    *   `params`: `Primitive | Primitive[]` (Optional) - Parameter values for the conditions.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated WHERE clause.
  *   `whereIn<T extends string | Array<string>, P extends T extends Array<string> ? Primitive[][] : Primitive[]>(fields: T, values: P): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds a `WHERE IN` clause.
    *   `fields`: `T` - Field name (string) or array of field names for `IN` clause.
    *   `values`: `P` - Array of values or array of arrays of values (if multiple fields) for `IN` clause.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated WHERE IN clause.
  *   `join(join: SelectAll['join']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds a JOIN clause.
    *   `join`: `Join | Array<Join>` - `Join` object or array of `Join` objects.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated JOIN clause.
  *   `groupBy(groupBy: SelectAll['groupBy']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds a GROUP BY clause.
    *   `groupBy`: `string | Array<string>` - Comma-separated string or array of columns for GROUP BY.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated GROUP BY clause.
  *   `having(having: SelectAll['having']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds a HAVING clause.
    *   `having`: `string | Array<string>` - HAVING clause string or array of HAVING clause strings (joined by AND).
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated HAVING clause.
  *   `orderBy(orderBy: SelectAll['orderBy']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds an ORDER BY clause.
    *   `orderBy`: `string | Array<string> | Record<string, string | OrderTypes>` - ORDER BY clause definition (string, array, or object).
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated ORDER BY clause.
  *   `offset(offset: SelectAll['offset']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds an OFFSET clause for pagination.
    *   `offset`: `number` - Number of rows to offset.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated OFFSET clause.
  *   `limit(limit: SelectAll['limit']): SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>`
    *   Adds a LIMIT clause to restrict the number of results.
    *   `limit`: `number` - Maximum number of rows to return.
    *   Returns: `SelectBuilder<GenericResultWrapper, GenericResult, IsAsync>` - New `SelectBuilder` instance with updated LIMIT clause.
  *   `getQueryAll<IsLazy extends true | undefined = undefined>(options?: SelectExecuteOptions<IsLazy>): Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>, IsAsync>`
    *   Returns the built SELECT query as a `Query` object for fetching all results.
    *   `options`: (Optional) `SelectExecuteOptions<IsLazy>` - Options for query execution (e.g., `lazy`).
    *   Returns: `Query<ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>, IsAsync>` - `Query` object.
  *   `getQueryOne(): Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>`
    *   Returns the built SELECT query as a `Query` object for fetching a single result.
    *   Returns: `Query<OneResult<GenericResultWrapper, GenericResult>, IsAsync>` - `Query` object.
  *   `execute<IsLazy extends true | undefined = undefined>(options?: SelectExecuteOptions<IsLazy>): ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>`
    *   Executes the SELECT query and returns all results (`fetchAll` behavior).
    *   `options`: (Optional) `SelectExecuteOptions<IsLazy>` - Options for query execution (e.g., `lazy`).
    *   Returns: `ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>` - Array of results.
  *   `all<IsLazy extends true | undefined = undefined>(options?: SelectExecuteOptions<IsLazy>): ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>`
    *   Alias for `execute()`, explicitly executes as `fetchAll`.
    *   `options`: (Optional) `SelectExecuteOptions<IsLazy>` - Options for query execution (e.g., `lazy`).
    *   Returns: `ArrayResult<GenericResultWrapper, GenericResult, IsAsync, IsLazy>` - Array of results.
  *   `one(): MaybeAsync<IsAsync, OneResult<GenericResultWrapper, GenericResult>>`
    *   Executes the SELECT query and returns a single result (`fetchOne` behavior).
    *   Returns: `MaybeAsync<IsAsync, OneResult<GenericResultWrapper, GenericResult>>` - Single result.
  *   `count(): MaybeAsync<IsAsync, CountResult<GenericResultWrapper>>`
    *   Executes a `COUNT(*)` query based on the current `SelectBuilder` configuration.
    *   Returns: `MaybeAsync<IsAsync, CountResult<GenericResultWrapper>>` - Count result.

### `Query<Result = any, IsAsync extends boolean = true>`

Represents a SQL query to be executed.

*   **Constructor:** `constructor(executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>, query: string, args?: Primitive[], fetchType?: FetchTypes)`
  *   Internal constructor, created by `QueryBuilder` methods.
*   **Properties:**
  *   `executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>`
    *   The execution function (bound from the `QueryBuilder` instance).
  *   `query: string`
    *   The SQL query string.
  *   `arguments?: Primitive[]`
    *   (Optional) Array of parameterized arguments for the query.
  *   `fetchType?: FetchTypes`
    *   (Optional) Specifies the expected fetch type (`ONE`, `ALL`, or undefined for no fetch).
*   **Methods:**
  *   `execute(): MaybeAsync<IsAsync, Result>`
    *   Executes the query using the bound `executeMethod`.
    *   Returns: `MaybeAsync<IsAsync, Result>` - Query result.
  *   `toObject(): RawQuery`
    *   Returns a plain object representation of the `Query` for logging or debugging.
    *   Returns: `RawQuery` - Object with `query`, `args`, and `fetchType` properties.

### `QueryWithExtra<GenericResultWrapper, Result = any, IsAsync extends boolean = true>` extends `Query<Result, IsAsync>`

Extends `Query` to include a separate count query. Used for `fetchOne` and `fetchAll` to provide total count information.

*   **Constructor:** `constructor(executeMethod: (query: Query<Result, IsAsync>) => MaybeAsync<IsAsync, Result>, query: string, countQuery: string, args?: Primitive[], fetchType?: FetchTypes)`
  *   Internal constructor, created by `QueryBuilder` methods.
*   **Methods:**
  *   `count(): MaybeAsync<IsAsync, CountResult<GenericResultWrapper>>`
    *   Executes the associated count query.
    *   Returns: `MaybeAsync<IsAsync, CountResult<GenericResultWrapper>>` - Count result.

### `Raw`

Class to represent raw SQL expressions that should be included directly in the query string without parameterization.

*   **Constructor:** `constructor(content: any)`
  *   `content`: `any` - The raw SQL content (string or expression).
*   **Properties:**
  *   `isRaw: boolean = true`
    *   Flag to identify `Raw` instances.
  *   `content: any`
    *   The raw SQL content.

### `syncMigrationsBuilder<GenericResultWrapper>`

Migration builder for synchronous database operations (e.g., Durable Objects storage).

*   **Constructor:** `constructor(options: MigrationOptions, builder: QueryBuilder<GenericResultWrapper, false>)`
  *   Internal constructor, created by `QueryBuilder.migrations()` for synchronous builders.
*   **Methods:**
  *   `initialize(): void`
    *   Initializes the migrations tracking table (creates it if not exists).
  *   `getApplied(): Array<MigrationEntry>`
    *   Returns an array of applied migrations.
    *   Returns: `Array<MigrationEntry>` - Array of `MigrationEntry` objects.
  *   `getUnapplied(): Array<Migration>`
    *   Returns an array of unapplied migrations.
    *   Returns: `Array<Migration>` - Array of `Migration` objects.
  *   `apply(): Array<Migration>`
    *   Applies all pending migrations.
    *   Returns: `Array<Migration>` - Array of applied `Migration` objects in this run.

### `asyncMigrationsBuilder<GenericResultWrapper>`

Migration builder for asynchronous database operations (e.g., Cloudflare D1, PostgreSQL).

*   **Constructor:** `constructor(options: MigrationOptions, builder: QueryBuilder<GenericResultWrapper, true>)`
  *   Internal constructor, created by `QueryBuilder.migrations()` for asynchronous builders.
*   **Methods:**
  *   `initialize(): Promise<void>`
    *   Initializes the migrations tracking table (creates it if not exists) - asynchronously.
    *   Returns: `Promise<void>`
  *   `getApplied(): Promise<Array<MigrationEntry>>`
    *   Returns an array of applied migrations - asynchronously.
    *   Returns: `Promise<Array<MigrationEntry>>` - Promise resolving to an array of `MigrationEntry` objects.
  *   `getUnapplied(): Promise<Array<Migration>>`
    *   Returns an array of unapplied migrations - asynchronously.
    *   Returns: `Promise<Array<Migration>>` - Promise resolving to an array of `Migration` objects.
  *   `apply(): Promise<Array<Migration>>`
    *   Applies all pending migrations - asynchronously.
    *   Returns: `Promise<Array<Migration>>` - Promise resolving to an array of applied `Migration` objects in this run.

## Enums

### `OrderTypes`

Enum for specifying ordering direction in `ORDER BY` clauses.

*   `ASC`: Ascending order.
*   `DESC`: Descending order.

### `FetchTypes`

Enum for specifying the expected fetch type for raw queries.

*   `ONE`: Expect to fetch a single row.
*   `ALL`: Expect to fetch multiple rows.

### `ConflictTypes`

Enum for defining conflict resolution strategies in `INSERT` and `UPDATE` statements.

*   `ROLLBACK`
*   `ABORT`
*   `FAIL`
*   `IGNORE`
*   `REPLACE`

### `JoinTypes`

Enum for defining JOIN types.

*   `INNER`
*   `LEFT`
*   `CROSS`

## Interfaces

**(List of all interfaces from `interfaces.ts` file, with brief descriptions of each property)**

*   `QueryBuilderOptions<IsAsync extends boolean = true>`
  *   `logger?: (query: RawQuery, meta: QueryLoggerMeta) => MaybeAsync<IsAsync, void>` - Optional logger function for query debugging.
*   `DefaultObject`
  *   `[key: string]: Primitive` - Generic object with string keys and `Primitive` values.
*   `DefaultReturnObject`
  *   `[key: string]: null | string | number | boolean | bigint` - Generic object for query results.
*   `Where`
  *   `conditions: string | Array<string>` - WHERE clause condition(s).
  *   `params?: Primitive | Primitive[]` - Parameter values for conditions.
*   `Join`
  *   `type?: string | JoinTypes` - JOIN type (e.g., INNER, LEFT).
  *   `table: string | SelectAll` - Table name or subquery (`SelectAll` object) to join.
  *   `on: string` - JOIN ON condition.
  *   `alias?: string` - Optional alias for the joined table/subquery.
*   `SelectOne`
  *   `tableName: string` - Table to select from.
  *   `fields?: string | Array<string>` - Columns to select (default: `*`).
  *   `where?: Where` - WHERE clause.
  *   `join?: Join | Array<Join>` - JOIN clause(s).
  *   `groupBy?: string | Array<string>` - GROUP BY clause.
  *   `having?: string | Array<string>` - HAVING clause.
  *   `orderBy?: string | Array<string> | Record<string, string | OrderTypes>` - ORDER BY clause.
  *   `offset?: number` - OFFSET clause.
*   `SelectAll<IsLazy extends true | undefined = undefined>`
  *   Extends `SelectOne`.
  *   `limit?: number` - LIMIT clause.
  *   `lazy?: IsLazy` - Enable lazy row loading (for `fetchAll`).
*   `ConflictUpsert`
  *   `column: string | Array<string>` - Column(s) causing conflict.
  *   `data: DefaultObject` - Data to update on conflict.
  *   `where?: Where` - Optional WHERE clause for update on conflict.
*   `Insert`
  *   `tableName: string` - Table to insert into.
  *   `data: DefaultObject | Array<DefaultObject>` - Data to insert (single object or array of objects).
  *   `returning?: string | Array<string>` - Columns to return after insert.
  *   `onConflict?: string | ConflictTypes | ConflictUpsert` - Conflict resolution strategy.
*   `InsertOne`
  *   Extends `Insert`. `data` is `DefaultObject`, `returning` is required.
*   `InsertMultiple`
  *   Extends `Insert`. `data` is `Array<DefaultObject>`, `returning` is required.
*   `InsertWithoutReturning`
  *   Extends `Insert`. `returning` is omitted.
*   `Update`
  *   `tableName: string` - Table to update.
  *   `data: DefaultObject` - Data to update.
  *   `where?: Where` - WHERE clause to select rows to update.
  *   `returning?: string | Array<string>` - Columns to return after update.
  *   `onConflict?: string | ConflictTypes` - Conflict resolution strategy for updates (if applicable).
*   `UpdateReturning`
  *   Extends `Update`. `returning` is required.
*   `UpdateWithoutReturning`
  *   Extends `Update`. `returning` is omitted.
*   `Delete`
  *   `tableName: string` - Table to delete from.
  *   `where: Where` - WHERE clause to select rows to delete.
  *   `returning?: string | Array<string>` - Columns to return after delete.
  *   `orderBy?: string | Array<string> | Record<string, string | OrderTypes>` - ORDER BY clause for deletion order.
  *   `limit?: number` - LIMIT clause for number of rows to delete.
  *   `offset?: number` - OFFSET clause for deletion.
*   `DeleteReturning`
  *   Extends `Delete`. `returning` is required.
*   `DeleteWithoutReturning`
  *   Extends `Delete`. `returning` is omitted.
*   `D1Meta`
  *   `changed_db: boolean` - Whether the database was changed.
  *   `changes: number` - Number of rows changed.
  *   `duration: number` - Query execution duration in milliseconds.
  *   `last_row_id: string | number` - Last inserted row ID.
  *   `rows_read: number` - Number of rows read.
  *   `rows_written: number` - Number of rows written.
  *   `served_by: string` - Server that served the query.
  *   `size_after: number` - Database size after the query.
*   `D1Result`
  *   `changes?: number` - (Deprecated - use `meta.changes`) Number of rows changed.
  *   `duration: number` - Query duration.
  *   `last_row_id?: string | number` - (Deprecated - use `meta.last_row_id`) Last row ID.
  *   `served_by: string` - (Deprecated - use `meta.served_by`) Server that served the query.
  *   `meta?: D1Meta` - D1 metadata object.
  *   `success: boolean` - Whether the query was successful.
  *   `results?: any` - Query results (format depends on query type).
*   `PGResult`
  *   `command: string` - SQL command executed.
  *   `lastRowId?: string | number` - Last inserted row ID (if applicable).
  *   `rowCount: number` - Number of rows affected.
  *   `results?: any` - Query results (format depends on query type).
*   `IterableResult<ResultWrapper, Result, IsAsync extends boolean, IsLazy extends true | undefined = undefined>`
  *   Type for results of lazy queries (`fetchAll` with `lazy: true`).
*   `FullArrayResult<ResultWrapper, Result, IsAsync extends boolean, IsLazy extends true | undefined = undefined>`
  *   Type for results of non-lazy `fetchAll` queries.
*   `ArrayResult<ResultWrapper, Result, IsAsync extends boolean, IsLazy extends true | undefined = undefined>`
  *   Union type for `IterableResult` and `FullArrayResult`.
*   `OneResult<ResultWrapper, Result>`
  *   Type for results of `fetchOne` queries.
*   `CountResult<GenericResultWrapper>`
  *   Type for results of `count()` queries.
*   `AsyncType<T>`
  *   `Promise<T>` - Type alias for Promises.
*   `SyncType<T>`
  *   `T` - Type alias for synchronous types.
*   `MaybeAsync<IsAsync extends boolean, T>`
  *   Conditional type for possibly asynchronous operations.
*   `MigrationEntry`
  *   `id: number` - Migration ID.
  *   `name: string` - Migration name.
  *   `applied_at: Date` - Timestamp when migration was applied.
*   `Migration`
  *   `name: string` - Migration name.
  *   `sql: string` - SQL statements for the migration.
*   `MigrationOptions`
  *   `migrations: Array<Migration>` - Array of migration definitions.
  *   `tableName?: string` - Optional table name for migrations tracking (default: 'migrations').
*   `QueryLoggerMeta`
  *   `duration?: number` - Optional query duration in milliseconds.
*   `RawQuery`
  *   `query: string` - Raw SQL query string.
  *   `args?: Primitive[]` - Parameter arguments for the query.
  *   `fetchType?: FetchTypes` - Optional `FetchTypes` for raw queries.
*   `RawQueryFetchOne`
  *   Extends `RawQuery`, requires `fetchType: FetchTypes.ONE`.
*   `RawQueryFetchAll`
  *   Extends `RawQuery`, requires `fetchType: FetchTypes.ALL`.
*   `RawQueryWithoutFetching`
  *   Extends `RawQuery`, `fetchType` is omitted.
*   `SelectExecuteOptions<IsLazy extends true | undefined>`
  *   `lazy?: IsLazy` - Option to enable lazy execution for `SelectBuilder.execute()` and `SelectBuilder.all()`.
*   `Primitive`
  *   `null | string | number | boolean | bigint | Raw` - Type alias for primitive data types supported in queries.

This API Reference provides a comprehensive overview of the `workers-qb` library's components. Refer to the other documentation sections for usage examples and guides.
