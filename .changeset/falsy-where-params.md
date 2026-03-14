---
"workers-qb": patch
---

Fix falsy WHERE/HAVING params (false, 0, empty string) being silently dropped in update, delete, and select queries
