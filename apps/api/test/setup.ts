import { applyD1Migrations, env } from 'cloudflare:test'
import type { D1Migration } from '@cloudflare/vitest-pool-workers/config'
import { beforeAll } from 'vitest'

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DB: D1Database
    EXPORTS: R2Bucket
    RATE_LIMIT: KVNamespace
    TEST_MIGRATIONS: D1Migration[]
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS as D1Migration[])
})
