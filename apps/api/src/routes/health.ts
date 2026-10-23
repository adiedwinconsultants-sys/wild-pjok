import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { ok } from '../lib/http'
import type { AppBindings } from '../types'

export const healthRoutes = new Hono<AppBindings>()

healthRoutes.get('/', async (c) => {
  const db = c.get('db')
  const env = c.get('env')
  await db.run(sql`select 1`)
  return ok(c, {
    status: 'ok',
    version: env.BUILD_VERSION ?? 'dev',
    environment: env.APP_ENV,
    timestamp: new Date().toISOString(),
  })
})
