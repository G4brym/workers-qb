import { PGQB } from 'workers-qb';
import { Client } from 'pg';

export interface Env {
  DB_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const qb = new PGQB(new Client(env.DB_URL));
    await qb.connect();

    const fetched = await qb.fetchOne({
      tableName: 'employees',
      fields: 'count(*) as count',
      where: {
        conditions: 'active = ?1',
        params: [true],
      },
    });

    ctx.waitUntil(qb.close());
    return Response.json({
      activeEmployees: fetched.results?.count || 0,
    });
  },
};
