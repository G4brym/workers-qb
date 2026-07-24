---
"workers-qb": minor
---

Harden structured SQL inputs against injection while preserving field expressions and supporting explicit `Raw` values in `WHERE` and `HAVING` parameters.

Bound values now receive unique parameter positions across CTEs, subqueries, `WHERE`, and `HAVING`. Queries that previously reused the same numbered position across clauses may consume more bound-parameter slots; D1 and SQLite-backed Durable Objects allow up to 100 per query.
