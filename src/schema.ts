/**
 * Schema-aware type utilities for type-safe query building.
 *
 * Define your database schema as a type and pass it to the query builder
 * to get autocomplete for table names, column names, and inferred result types.
 *
 * @example
 * ```typescript
 * type Schema = {
 *   users: {
 *     id: number
 *     name: string
 *     email: string
 *   }
 *   posts: {
 *     id: number
 *     user_id: number
 *     title: string
 *   }
 * }
 *
 * const qb = new D1QB<Schema>(env.DB)
 *
 * // Now get autocomplete for tableName, fields, orderBy, etc.
 * const users = await qb.fetchAll({
 *   tableName: 'users',      // autocomplete: 'users' | 'posts'
 *   fields: ['id', 'name'],  // autocomplete: 'id' | 'name' | 'email'
 * }).execute()
 * ```
 */

/**
 * Base type for database schemas.
 * A schema is a record of table names to their column types.
 */
export type TableSchema = Record<string, Record<string, unknown>>

/**
 * Extract table names from a schema.
 */
export type TableName<S extends TableSchema> = keyof S & string

/**
 * Extract column names for a specific table.
 */
export type ColumnName<S extends TableSchema, T extends TableName<S>> = keyof S[T] & string

/**
 * Pick specific columns from a table's type.
 */
export type SelectColumns<S extends TableSchema, T extends TableName<S>, F extends ColumnName<S, T>> = Pick<S[T], F>

/**
 * Type for INSERT data - all columns are optional to allow partial inserts.
 * In practice, required columns will be enforced by the database.
 */
export type InsertData<S extends TableSchema, T extends TableName<S>> = Partial<S[T]>

/**
 * Type for UPDATE data - all columns are optional.
 */
export type UpdateData<S extends TableSchema, T extends TableName<S>> = Partial<S[T]>

/**
 * Helper to check if a schema is empty (for backwards compatibility).
 * When Schema = {}, we fall back to loose types.
 */
export type IsEmptySchema<S extends TableSchema> = keyof S extends never ? true : false

/**
 * Conditional type that returns strict types when schema is provided,
 * or loose types when schema is empty.
 */
export type SchemaAware<S extends TableSchema, Strict, Loose> = IsEmptySchema<S> extends true ? Loose : Strict
