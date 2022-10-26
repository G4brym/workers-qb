# workers-qb

Zero dependencies Query Builder for [Cloudflare D1](https://blog.cloudflare.com/introducing-d1/)
[Workers](https://developers.cloudflare.com/workers/)

This module provides a simple standardized interface while keeping the
benefits and speed of using raw queries over a traditional ORM.

`workers-qb` is not intended to provide ORM-like functionality, rather to make it easier to interact with the database from
code for direct SQL access using convenient wrapper methods.

---

The `workers-qb` currently provides:

- Zero dependencies.
- Fully typed/TypeScript support
- SQL Type checking with compatible IDE's
- Insert/Update/Select/Delete queries
- Create/drop tables
- Keep where conditions simple in code

Planned for the future:

- Bulk insert/update
- Named parameters (waiting for full support in D1)
