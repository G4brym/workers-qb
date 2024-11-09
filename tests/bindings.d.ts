export type Env = {
  DB: D1Database
}

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
