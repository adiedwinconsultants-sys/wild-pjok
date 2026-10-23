import { applyD1Migrations, env, reset } from 'cloudflare:test'
import type { D1Migration } from '@cloudflare/vitest-pool-workers'
import { afterEach, beforeEach } from 'vitest'

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database
      EXPORTS: R2Bucket
      RATE_LIMIT: KVNamespace
      TEST_MIGRATIONS: D1Migration[]
    }
  }
}

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
})

afterEach(reset)
