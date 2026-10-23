import type { Teacher } from '@pjok/shared'
import {
  forgotPasswordInputSchema,
  loginInputSchema,
  profileUpdateSchema,
  refreshInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
  workosAuthorizeInputSchema,
  workosExchangeInputSchema,
} from '@pjok/shared'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { passwordResets, sessions, users } from '../db/schema'
import type { users as usersTable } from '../db/schema'
import { isWorkosConfigured } from '../env'
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
const WORKOS_STATE_TTL_SECONDS = 600

const workosUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
})
const workosAuthSchema = z.object({
  user: workosUserSchema,
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
})

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

authRoutes.post('/register', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, registerInputSchema)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local'
  await checkRateLimit(env, 'register', clientIdentifier(ip, body.email), 5, 600)

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
      authProvider: 'password',
      workosUserId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .returning()
  const user = inserted[0]
  if (!user) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Akun gagal dibuat')
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

authRoutes.get('/workos/status', (c) => {
  const env = c.get('env')
  const enabled = isWorkosConfigured(env)
  return ok(c, {
    enabled,
    clientId: enabled ? env.WORKOS_CLIENT_ID : null,
  })
})

authRoutes.post('/workos/authorize', async (c) => {
  const env = c.get('env')
  if (!isWorkosConfigured(env)) {
    throw new AppError(
      503,
      'WORKOS_NOT_CONFIGURED',
      'Login WorkOS belum dikonfigurasi pada server.',
    )
  }
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')
  await checkRateLimit(env, 'workos-authorize', clientIdentifier(ip), 20, 600)
  const body = await parseBody(c, workosAuthorizeInputSchema)
  const state = randomToken(24)
  await env.RATE_LIMIT.put(
    `workos:state:${await sha256Hex(state)}`,
    JSON.stringify({ redirectUri: body.redirectUri }),
    { expirationTtl: WORKOS_STATE_TTL_SECONDS },
  )

  const authorizeUrl = new URL(`${env.WORKOS_API_BASE}/user_management/authorize`)
  authorizeUrl.searchParams.set('client_id', env.WORKOS_CLIENT_ID ?? '')
  authorizeUrl.searchParams.set('redirect_uri', body.redirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('provider', 'authkit')
  authorizeUrl.searchParams.set('state', state)
  if (env.WORKOS_CONNECTION_ID) {
    authorizeUrl.searchParams.set('connection', env.WORKOS_CONNECTION_ID)
  }

  return ok(c, { url: authorizeUrl.toString(), state })
})

authRoutes.post('/workos/exchange', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  if (!isWorkosConfigured(env)) {
    throw new AppError(
      503,
      'WORKOS_NOT_CONFIGURED',
      'Login WorkOS belum dikonfigurasi pada server.',
    )
  }
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')
  await checkRateLimit(env, 'workos-exchange', clientIdentifier(ip), 20, 600)
  const body = await parseBody(c, workosExchangeInputSchema)
  const stateKey = `workos:state:${await sha256Hex(body.state)}`
  const storedState = await env.RATE_LIMIT.get(stateKey)
  if (!storedState) {
    throw new AppError(
      400,
      'WORKOS_STATE_INVALID',
      'Sesi login WorkOS tidak valid atau kedaluwarsa.',
    )
  }
  await env.RATE_LIMIT.delete(stateKey)

  let workosPayload: z.infer<typeof workosAuthSchema>
  try {
    const response = await fetch(`${env.WORKOS_API_BASE}/user_management/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.WORKOS_CLIENT_ID,
        client_secret: env.WORKOS_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: body.code,
      }),
    })
    if (!response.ok) {
      throw new Error(`WorkOS menolak pertukaran kode (${response.status})`)
    }
    workosPayload = workosAuthSchema.parse(await response.json())
  } catch {
    throw new AppError(
      502,
      'WORKOS_EXCHANGE_FAILED',
      'Login WorkOS gagal diproses. Silakan coba lagi.',
    )
  }

  const email = workosPayload.user.email.trim().toLowerCase()
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
  let user = rows[0]
  const timestamp = nowIso()

  if (!user) {
    const fullName = [workosPayload.user.first_name, workosPayload.user.last_name]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ')
      .trim()
    const inserted = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email,
        passwordHash: `workos$${randomToken(24)}`,
        name: fullName || email.split('@')[0] || 'Guru',
        nip: null,
        school: null,
        role: 'teacher',
        authProvider: 'workos',
        workosUserId: workosPayload.user.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning()
    user = inserted[0]
  } else if (!user.workosUserId) {
    const updated = await db
      .update(users)
      .set({ workosUserId: workosPayload.user.id, updatedAt: timestamp })
      .where(eq(users.id, user.id))
      .returning()
    user = updated[0] ?? user
  }

  if (!user) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Akun WorkOS gagal disiapkan')
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
    authProvider: row.authProvider,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
