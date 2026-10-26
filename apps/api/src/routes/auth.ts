import type { Teacher } from '@pjok/shared'
import {
  loginInputSchema,
  profileUpdateSchema,
  refreshInputSchema,
  registerInputSchema,
} from '@pjok/shared'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { sessions, users } from '../db/schema'
import type { users as usersTable } from '../db/schema'
import { isUniqueViolation } from '../lib/db-utils'
import { AppError } from '../lib/errors'
import { ok, parseBody } from '../lib/http'
import { hashPassword, verifyPassword } from '../lib/password'
import { checkRateLimit, clientIdentifier } from '../lib/rate-limit'
import { createSession, revokeAllSessions, rotateSession } from '../lib/sessions'
import { nowIso } from '../lib/time'
import { issueAccessToken } from '../lib/tokens'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

import { passwordRecoveryRoutes } from './password-recovery'

type UserRow = typeof usersTable.$inferSelect

export const authRoutes = new Hono<AppBindings>()

authRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'private, no-store')
  await next()
})

authRoutes.post('/login', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, loginInputSchema)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local'
  await checkRateLimit(env, 'login-ip', clientIdentifier(ip), 100, 60)
  await checkRateLimit(env, 'login', clientIdentifier(undefined, body.email), 10, 60)

  const rows = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
  const user = rows[0]
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah')
  }

  const valid = await verifyPassword(body.password, user.passwordHash)
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah')
  }

  const session = await createSession(db, user.id, c.req.header('user-agent'))
  const access = await issueAccessToken(env, {
    id: user.id,
    sessionId: session.sessionId,
    role: user.role,
    email: user.email,
    name: user.name,
  })

  return ok(c, {
    accessToken: access.token,
    refreshToken: session.refreshToken,
    expiresIn: access.expiresIn,
    user: toPublicUser(user),
  })
})

authRoutes.post('/register', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, registerInputSchema)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local'
  await checkRateLimit(env, 'register-ip', clientIdentifier(ip), 20, 600)
  await checkRateLimit(env, 'register', clientIdentifier(undefined, body.email), 5, 600)

  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
  if (existing[0]) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_REGISTERED',
      'Email sudah terdaftar. Silakan masuk atau gunakan email lain.',
    )
  }

  const timestamp = nowIso()
  const inserted = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: body.email,
      passwordHash: await hashPassword(body.password),
      name: body.name,
      nip: null,
      school: body.school ?? null,
      role: 'teacher',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning()
    .catch((error: unknown) => {
      if (isUniqueViolation(error))
        throw new AppError(
          409,
          'EMAIL_ALREADY_REGISTERED',
          'Email sudah terdaftar. Silakan masuk atau gunakan email lain.',
        )
      throw error
    })
  const user = inserted[0]
  if (!user) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Akun gagal dibuat')
  }

  const session = await createSession(db, user.id, c.req.header('user-agent'))
  const access = await issueAccessToken(env, {
    id: user.id,
    sessionId: session.sessionId,
    role: user.role,
    email: user.email,
    name: user.name,
  })

  return ok(c, {
    accessToken: access.token,
    refreshToken: session.refreshToken,
    expiresIn: access.expiresIn,
    user: toPublicUser(user),
  })
})

authRoutes.post('/refresh', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, refreshInputSchema)
  const rotated = await rotateSession(db, body.refreshToken, c.req.header('user-agent'))

  const rows = await db.select().from(users).where(eq(users.id, rotated.userId)).limit(1)
  const user = rows[0]
  if (!user) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token tidak valid')
  }

  const access = await issueAccessToken(env, {
    id: user.id,
    sessionId: rotated.sessionId,
    role: user.role,
    email: user.email,
    name: user.name,
  })

  return ok(c, {
    accessToken: access.token,
    refreshToken: rotated.refreshToken,
    expiresIn: access.expiresIn,
    user: toPublicUser(user),
  })
})

authRoutes.post('/logout', requireAuth, async (c) => {
  const db = c.get('db')
  await parseBody(c, refreshInputSchema.partial())
  const user = c.get('user')
  await db
    .update(sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(sessions.id, user.sessionId), eq(sessions.userId, user.id)))
  return c.body(null, 204)
})

authRoutes.get('/me', requireAuth, async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  const row = rows[0]
  if (!row) {
    throw new AppError(401, 'UNAUTHORIZED', 'Pengguna tidak ditemukan')
  }
  return ok(c, toPublicUser(row))
})

authRoutes.route('/', passwordRecoveryRoutes)

authRoutes.patch('/me', requireAuth, async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const body = await parseBody(c, profileUpdateSchema)
  const values: Record<string, string | null> = { updatedAt: nowIso() }
  if (body.name !== undefined) values.name = body.name
  if (body.nip !== undefined) values.nip = body.nip
  if (body.school !== undefined) values.school = body.school
  const updated = await db.update(users).set(values).where(eq(users.id, user.id)).returning()
  const row = updated[0]
  if (!row) {
    throw new AppError(401, 'UNAUTHORIZED', 'Pengguna tidak ditemukan')
  }
  return ok(c, toPublicUser(row))
})

authRoutes.delete('/sessions', requireAuth, async (c) => {
  const user = c.get('user')
  const db = c.get('db')
  await revokeAllSessions(db, user.id)
  return c.body(null, 204)
})

function toPublicUser(row: UserRow): Teacher {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    nip: row.nip,
    school: row.school,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
