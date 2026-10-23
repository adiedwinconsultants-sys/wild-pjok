import type { MiddlewareHandler } from 'hono'
import { createDb } from '../db/client'
import { parseEnv } from '../env'
import type { AppBindings } from '../types'

export const contextMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const env = parseEnv(c.env)
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
  c.set('env', env)
  c.set('db', createDb(env))
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)

  const startedAt = Date.now()
  await next()

  console.log(
    JSON.stringify({
      level: 'info',
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
      env: env.APP_ENV,
    }),
  )
}
