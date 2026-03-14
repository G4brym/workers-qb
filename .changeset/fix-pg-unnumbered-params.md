---
"workers-qb": patch
---

Fix PGQB incorrectly converting bare `?` placeholders to `$` instead of `$1`, `$2`, ... in PostgreSQL queries
