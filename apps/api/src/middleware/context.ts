import type { MiddlewareHandler } from 'hono'
import { createDb } from '../db/client'
import { parseEnv } from '../env'
import type { AppBindings } from '../types'

export const contextMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const env = parseEnv(c.env)
  const requestId = crypto.randomUUID()
  c.set('env', env)
  c.set('db', createDb(env))
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  c.header('Cache-Control', 'private, no-store')
  c.header('X-Content-Type-Options', 'nosniff')

  const startedAt = Date.now()
  await next()

  console.log(
    JSON.stringify({
      level: 'info',
      requestId,
      method: c.req.method,
      path: c.req.routePath ?? 'unmatched',
      status: c.res.status,
      durationMs: Date.now() - startedAt,
      env: env.APP_ENV,
    }),
  )
}
