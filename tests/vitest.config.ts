import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    typecheck: {
      enabled: true,
    },
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
        },
        miniflare: {
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: {
            DB: '00000000-0000-0000-0000-000000000000',
          },
          compatibilityDate: '2024-09-10',
        },
      },
    },
  },
})
