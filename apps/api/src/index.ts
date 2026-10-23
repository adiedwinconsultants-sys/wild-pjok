import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { parseEnv } from './env'
import type { Env } from './env'
import { contextMiddleware } from './middleware/context'
import { errorHandler } from './middleware/error-handler'
import { cleanupExpiredExports } from './reports/cleanup'
import { assessmentRoutes } from './routes/assessments'
import { authRoutes } from './routes/auth'
import { classRoutes } from './routes/classes'
import { exportRoutes } from './routes/exports'
import { healthRoutes } from './routes/health'
import { instrumentRoutes } from './routes/instruments'
import { assessmentResultRoutes, resultRoutes } from './routes/results'
import { classStudentRoutes, studentRoutes } from './routes/students'
import type { AppBindings } from './types'

export const app = new Hono<AppBindings>()

app.use('*', contextMiddleware)
app.use('*', async (c, next) => {
  const env = c.get('env')
  const middleware = cors({
    origin: (origin) => {
      if (!origin) return env.CORS_ORIGIN ?? '*'
      if (!env.CORS_ORIGIN || env.CORS_ORIGIN === '*') return origin
      return env.CORS_ORIGIN
    },
    allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 600,
  })
  return middleware(c, next)
})
app.onError(errorHandler)
app.notFound((c) =>
  c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint tidak ditemukan',
        requestId: c.get('requestId') ?? 'unknown',
      },
    },
    404,
  ),
)

const v1 = new Hono<AppBindings>()
v1.route('/health', healthRoutes)
v1.route('/auth', authRoutes)
v1.route('/classes', classRoutes)
v1.route('/classes', classStudentRoutes)
v1.route('/students', studentRoutes)
v1.route('/instruments', instrumentRoutes)
v1.route('/assessments', assessmentRoutes)
v1.route('/assessments', assessmentResultRoutes)
v1.route('/results', resultRoutes)
v1.route('/exports', exportRoutes)
app.route('/v1', v1)

app.get('/', (c) => c.json({ data: { name: 'pjok-api', version: 1 } }))

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledController, rawEnv: Env, ctx: ExecutionContext) => {
    const env = parseEnv(rawEnv)
    ctx.waitUntil(cleanupExpiredExports(env))
  },
} satisfies ExportedHandler<Env>
