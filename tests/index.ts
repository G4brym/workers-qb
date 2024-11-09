import { DurableObject } from 'cloudflare:workers'
import { DOQB } from '../src'
import { Env } from './bindings'
import { migrations } from './integration/migrations-do.test'

export class TestDO extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env)

    void this.ctx.blockConcurrencyWhile(async () => {
      const qb = new DOQB(this.ctx.storage.sql)

      qb.migrations({ migrations }).apply()
    })
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return new Response('test')
  },
}
