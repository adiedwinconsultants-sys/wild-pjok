import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./src/db/migrations')
  return {
    plugins: [
      cloudflareTest({
        main: './src/index.ts',
        miniflare: {
          compatibilityDate: '2025-01-01',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: ['DB'],
          r2Buckets: ['EXPORTS'],
          kvNamespaces: ['RATE_LIMIT'],
          bindings: {
            JWT_SECRET: 'test-secret-0123456789abcdef0123456789abcdef',
            APP_ENV: 'local',
            ACCESS_TOKEN_TTL: '900',
            TEST_MIGRATIONS: migrations,
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/setup.ts'],
    },
  }
})
