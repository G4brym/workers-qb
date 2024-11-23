# workers-qb

### [Read the documentation here!](https://workers-qb.massadas.com/)

Zero dependencies Query Builder for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

This module provides a simple standardized interface while keeping the benefits and speed of using raw queries over a
traditional ORM.

`workers-qb` is not intended to provide ORM-like functionality, rather to make it easier to interact with the database
from code for direct SQL access using convenient wrapper methods.

Currently, 3 databases are supported:

- [Cloudflare D1](https://workers-qb.massadas.com/databases/cloudflare-d1/)
- [Cloudflare Durable Objects](https://workers-qb.massadas.com/databases/cloudflare-do/)
- [PostgreSQL (using node-postgres)](https://workers-qb.massadas.com/databases/postgresql/)
- [Bring your own Database](https://workers-qb.massadas.com/databases/bring-your-own-database/)

## Features

- [x] Zero dependencies
- [x] Fully typed/TypeScript support
- [x] [Migrations](https://workers-qb.massadas.com/migrations/)
- [x] [Type Checks for data read](https://workers-qb.massadas.com/type-check/)
- [x] [Create/drop tables](https://workers-qb.massadas.com/basic-queries/#dropping-and-creating-tables)
- [x] [Insert/Bulk Inserts/Update/Select/Delete/Join queries](https://workers-qb.massadas.com/basic-queries/)
- [x] [Modular selects](https://workers-qb.massadas.com/modular-selects/) (qb.select(...).where(...).where(...).one())
- [x] [On Conflict for Inserts and Updates](https://workers-qb.massadas.com/advanced-queries/onConflict/)
- [x] [Upsert](https://workers-qb.massadas.com/advanced-queries/upsert/)
