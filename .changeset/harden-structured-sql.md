---
"workers-qb": minor
---

Harden structured SQL inputs against injection while preserving existing `fields` expressions. Table and column identifiers, aliases, CTE names, join types and conditions, conflict modes, set operations, ordering, limits, and offsets are now validated before SQL generation.

Bound values now receive unique parameter positions across CTEs, subqueries, `WHERE`, and `HAVING`. Queries that previously reused the same numbered position across clauses may consume more bound-parameter slots; D1 and SQLite-backed Durable Objects allow up to 100 per query.

## Upgrade notes

- Existing SQL expressions passed through `fields` continue to work without changes.
- Plain `groupBy`, `distinct`, and `returning` values must be identifiers. Plain `orderBy` values must be identifiers with an optional `ASC` or `DESC` direction, and join conditions must use simple comparisons joined by `AND` or `OR`. Wrap more complex, trusted expressions in `Raw`.
- Ordinary `WHERE` and `HAVING` values remain bound parameters. Passing `Raw` in a parameter position now explicitly inlines trusted SQL and must never be used with request-controlled input.
- Split or batch D1 and Durable Object queries that can exceed 100 independently supplied bound values.
- Custom database adapters must execute `query.toStatement('sqlite')` or `query.toStatement('postgres')` instead of `query.query` so nested parameters retain unique binding positions.
