# Background Writes with `waitUntil`

This guide explains how to perform "fire-and-forget" database operations using Cloudflare's `waitUntil` method. This is particularly useful for tasks that don't need to block the response to the user, such as logging, analytics, or other non-critical writes.

## How it Works

Cloudflare Workers can continue to execute code for a short period after the response has been sent to the client by using the `ctx.waitUntil()` method, where `ctx` is the `ExecutionContext` of your Worker's `fetch` handler.

By wrapping a `workers-qb` query promise in `waitUntil`, you ensure that the query is executed without making the user wait for the database operation to complete.

**Note:** This approach is suitable for operations where you don't need to return the result to the user.

## Examples

Here are some examples of how to use `waitUntil` for different types of write operations.

### Background `insert`

This is useful for logging requests, tracking events, or any other scenario where you need to add a record without delaying the user's response.

```typescript
import { D1QB } from 'workers-qb';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);
    const url = new URL(request.url);

    // Don't await this promise, let it run in the background
    const insertPromise = qb.insert({
      tableName: 'logs',
      data: {
        method: request.method,
        path: url.pathname,
        timestamp: new Date().toISOString(),
      },
    }).execute();

    ctx.waitUntil(insertPromise);

    return new Response('Request logged in the background!', { status: 200 });
  },
};
```

### Background `update`

You can update records in the background, for example, to increment a counter or update a user's last-seen timestamp.

```typescript
import { D1QB, Raw } from 'workers-qb';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);
    const userId = request.headers.get('X-User-ID');

    if (userId) {
      // Don't await this promise
      const updatePromise = qb.update({
        tableName: 'users',
        data: {
          last_seen: new Raw('CURRENT_TIMESTAMP'),
        },
        where: {
          conditions: 'id = ?',
          params: userId,
        },
      }).execute();

      ctx.waitUntil(updatePromise);
    }

    return new Response('User activity updated in the background.', { status: 200 });
  },
};
```

### Background `delete`

Perform cleanup operations, such as deleting expired sessions or old data, without affecting the response time.

```typescript
import { D1QB } from 'workers-qb';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new D1QB(env.DB);
    const sessionId = request.headers.get('X-Session-ID');

    if (sessionId) {
      // Don't await this promise
      const deletePromise = qb.delete({
        tableName: 'sessions',
        where: {
          conditions: 'id = ?',
          params: sessionId,
        },
      }).execute();

      ctx.waitUntil(deletePromise);
    }

    return new Response('Session invalidated in the background.', { status: 200 });
  },
};
```
