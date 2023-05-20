# workers-qb

Zero dependencies Query Builder for [Cloudflare Workers](https://developers.cloudflare.com/workers/)

This module provides a simple standardized interface while keeping the benefits and speed of using raw queries over a
traditional ORM.

`workers-qb` is not intended to provide ORM-like functionality, rather to make it easier to interact with the database
from code for direct SQL access using convenient wrapper methods.

Currently, 2 databases are supported:

- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [PostgreSQL (using node-postgres)](https://developers.cloudflare.com/workers/databases/connect-to-postgres/)

Read the documentation [workers-qb.massadas.com](https://workers-qb.massadas.com/)!

## Features

- [x] Zero dependencies.
- [x] Fully typed/TypeScript support
- [x] SQL Type checking with compatible IDE's
- [x] Insert/Update/Select/Delete/Join queries
- [x] On Conflict for Inserts and Updates
- [x] Create/drop tables
- [x] Keep where conditions simple in code
- [x] Bulk insert
- [x] Workers D1 Support
- [x] Workers PostgreSQL Support
- [ ] Named parameters (waiting for full support in D1)
