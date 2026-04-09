# workers-qb

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
