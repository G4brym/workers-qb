# workers-qb

## 1.15.0

### Minor Changes

- [#169](https://github.com/G4brym/workers-qb/pull/169) [`5c9bdc0`](https://github.com/G4brym/workers-qb/commit/5c9bdc0e0aedbb7a63f71568cd3944d6c278fdf3) Thanks [@G4brym](https://github.com/G4brym)! - Harden structured SQL inputs against injection while preserving existing `fields` expressions. Table and column identifiers, aliases, CTE names, join types and conditions, conflict modes, set operations, ordering, limits, and offsets are now validated before SQL generation.

  Bound values now receive unique parameter positions across CTEs, subqueries, `WHERE`, and `HAVING`. Queries that previously reused the same numbered position across clauses may consume more bound-parameter slots; D1 and SQLite-backed Durable Objects allow up to 100 per query.

  ## Upgrade notes

  - Existing SQL expressions passed through `fields` continue to work without changes.
  - Plain `groupBy`, `distinct`, and `returning` values must be identifiers. Plain `orderBy` values must be identifiers with an optional `ASC` or `DESC` direction, and join conditions must use simple comparisons joined by `AND` or `OR`. Wrap more complex, trusted expressions in `Raw`.
  - Ordinary `WHERE` and `HAVING` values remain bound parameters. Passing `Raw` in a parameter position now explicitly inlines trusted SQL and must never be used with request-controlled input.
  - Split or batch D1 and Durable Object queries that can exceed 100 independently supplied bound values.
  - Custom database adapters must execute `query.toStatement('sqlite')` or `query.toStatement('postgres')` instead of `query.query` so nested parameters retain unique binding positions.

## 1.14.0

### Minor Changes

- [#164](https://github.com/G4brym/workers-qb/pull/164) [`df6fb06`](https://github.com/G4brym/workers-qb/commit/df6fb0690496ad33686c6b9886927774fe348a2b) Thanks [@G4brym](https://github.com/G4brym)! - Add orWhereNull, orWhereNotNull, orWhereBetween, orWhereNotBetween, orWhereLike, and orWhereNotLike convenience methods to SelectBuilder

- [#162](https://github.com/G4brym/workers-qb/pull/162) [`91d4cc1`](https://github.com/G4brym/workers-qb/commit/91d4cc198a765db3d4227c4d65f446434865f62a) Thanks [@G4brym](https://github.com/G4brym)! - Add `orWhere()` method to `SelectBuilder` for building OR conditions in fluent query chains

- [#158](https://github.com/G4brym/workers-qb/pull/158) [`8d1e2ec`](https://github.com/G4brym/workers-qb/commit/8d1e2ec7e40a0ffda22dae68875e42c74574a9c7) Thanks [@G4brym](https://github.com/G4brym)! - Add WHERE clause convenience methods to SelectBuilder: `.when()`, `.whereNull()`, `.whereNotNull()`, `.whereBetween()`, `.whereNotBetween()`, `.whereLike()`, `.whereNotLike()`, and `.whereNotIn()`

### Patch Changes

- [#160](https://github.com/G4brym/workers-qb/pull/160) [`1ae866e`](https://github.com/G4brym/workers-qb/commit/1ae866ede3b85d6bcc2ccfdd90d30ee86e76291d) Thanks [@G4brym](https://github.com/G4brym)! - Fix falsy WHERE/HAVING params (false, 0, empty string) being silently dropped in update, delete, and select queries

- [#159](https://github.com/G4brym/workers-qb/pull/159) [`306e973`](https://github.com/G4brym/workers-qb/commit/306e973ffd66f75a4112845a93260b35a29c1bf3) Thanks [@G4brym](https://github.com/G4brym)! - Fix CROSS JOIN to not include spurious ON clause in generated SQL

- [#165](https://github.com/G4brym/workers-qb/pull/165) [`ed919f2`](https://github.com/G4brym/workers-qb/commit/ed919f2b11699fc33a7d57901b4953cdfca9e2e0) Thanks [@fc221](https://github.com/fc221)! - Fix PostgreSQL migrations to create the internal migrations table with PostgreSQL-compatible SQL and avoid unnecessary placeholder rewriting for queries without parameters.

- [#161](https://github.com/G4brym/workers-qb/pull/161) [`92675a9`](https://github.com/G4brym/workers-qb/commit/92675a9701adf6e787197f0841b74d7bf48065a2) Thanks [@G4brym](https://github.com/G4brym)! - Fix PGQB incorrectly converting bare `?` placeholders to `$` instead of `$1`, `$2`, ... in PostgreSQL queries

- [#163](https://github.com/G4brym/workers-qb/pull/163) [`84b5d0f`](https://github.com/G4brym/workers-qb/commit/84b5d0f33aa1cbec4cef4b1ae3dc24e2dc4e5d09) Thanks [@G4brym](https://github.com/G4brym)! - Add optional `otherwise` callback to `.when()` for inline if/else query building
