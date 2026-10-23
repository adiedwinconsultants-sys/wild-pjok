import { defineConfig } from 'drizzle-kit'

const isCi = Boolean(process.env.CI)

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  ...(isCi
    ? {
        driver: 'd1-http' as const,
        dbCredentials: {
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
          databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? '',
          token: process.env.CLOUDFLARE_API_TOKEN ?? '',
        },
      }
    : {}),
})
