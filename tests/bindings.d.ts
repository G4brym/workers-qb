export type Env = {
  DB: D1Database
  TEST_DO: DurableObjectNamespace
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
