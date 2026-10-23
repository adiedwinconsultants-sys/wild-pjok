import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations('./src/db/migrations')
  return {
    test: {
      setupFiles: ['./test/setup.ts'],
      poolOptions: {
        workers: {
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
        },
      },
    },
  }
})
