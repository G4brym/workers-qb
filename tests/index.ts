import { DurableObject } from 'cloudflare:workers'
import { Env } from './bindings'

export class TestDO extends DurableObject {}

export default {
  async fetch(request: Request, env: Env) {
    return new Response('test')
  },
}
