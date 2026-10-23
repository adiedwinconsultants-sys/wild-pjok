import type { Teacher } from '@pjok/shared'
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  profileUpdateSchema,
  refreshInputSchema,
  resetPasswordInputSchema,
} from '@pjok/shared'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { passwordResets, sessions, users } from '../db/schema'
import type { users as usersTable } from '../db/schema'
import { randomToken, sha256Hex } from '../lib/base64'
import { AppError } from '../lib/errors'
import { ok, parseBody } from '../lib/http'
import { hashPassword, verifyPassword } from '../lib/password'
import { checkRateLimit, clientIdentifier } from '../lib/rate-limit'
import {
  createSession,
  revokeAllSessions,
  revokeSessionByToken,
  rotateSession,
} from '../lib/sessions'
import { addSecondsIso, nowIso } from '../lib/time'
import { issueAccessToken } from '../lib/tokens'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

type UserRow = typeof usersTable.$inferSelect

const RESET_TOKEN_TTL_SECONDS = 900

export const authRoutes = new Hono<AppBindings>()

authRoutes.post('/login', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, loginInputSchema)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local'
  await checkRateLimit(env, 'login', clientIdentifier(ip, body.email), 10, 60)

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
  const raw = await c.req.json().catch(() => ({}))
  const parsed = refreshInputSchema.safeParse(raw)
  if (parsed.success) {
    await revokeSessionByToken(db, parsed.data.refreshToken)
  }
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

authRoutes.post('/forgot-password', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, forgotPasswordInputSchema)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local'
  await checkRateLimit(env, 'forgot-password', clientIdentifier(ip, body.email), 3, 900)

  const rows = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
  const user = rows[0]

  let devToken: string | undefined
  if (user) {
    const token = randomToken(32)
    const tokenHash = await sha256Hex(token)
    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt: addSecondsIso(RESET_TOKEN_TTL_SECONDS),
      usedAt: null,
      createdAt: nowIso(),
    })
    await env.RATE_LIMIT.put(`reset:${tokenHash}`, user.id, {
      expirationTtl: RESET_TOKEN_TTL_SECONDS,
    })
    if (env.APP_ENV === 'local') {
      devToken = token
    }
  }

  return c.json(
    {
      data: {
        message: 'Jika email terdaftar, tautan pemulihan telah dibuat.',
        ...(devToken ? { devToken } : {}),
      },
    },
    202,
  )
})

authRoutes.post('/reset-password', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, resetPasswordInputSchema)
  const tokenHash = await sha256Hex(body.token)

  const rows = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, tokenHash))
    .limit(1)
  const reset = rows[0]
  if (!reset || reset.usedAt !== null || new Date(reset.expiresAt).getTime() <= Date.now()) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Token pemulihan tidak valid atau kedaluwarsa')
  }

  const kvUserId = await env.RATE_LIMIT.get(`reset:${tokenHash}`)
  if (!kvUserId || kvUserId !== reset.userId) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Token pemulihan tidak valid atau kedaluwarsa')
  }

  const passwordHash = await hashPassword(body.password)
  const timestamp = nowIso()
  await db
    .update(users)
    .set({ passwordHash, updatedAt: timestamp })
    .where(eq(users.id, reset.userId))
  await db.update(passwordResets).set({ usedAt: timestamp }).where(eq(passwordResets.id, reset.id))
  await env.RATE_LIMIT.delete(`reset:${tokenHash}`)
  await revokeAllSessions(db, reset.userId)

  return ok(c, { message: 'Kata sandi berhasil diperbarui. Silakan masuk kembali.' })
})

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
  await db.update(sessions).set({ revokedAt: nowIso() }).where(eq(sessions.userId, user.id))
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
