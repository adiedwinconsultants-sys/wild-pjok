import { forgotPasswordInputSchema, resetPasswordInputSchema } from '@pjok/shared'
import { and, eq, exists, gt, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { passwordResets, sessions, users } from '../db/schema'
import { randomToken, sha256Hex } from '../lib/base64'
import { AppError } from '../lib/errors'
import { ok, parseBody } from '../lib/http'
import { hashPassword } from '../lib/password'
import { checkRateLimit, clientIdentifier } from '../lib/rate-limit'
import { addSecondsIso, nowIso } from '../lib/time'
import type { AppBindings } from '../types'

const RESET_TOKEN_TTL_SECONDS = 900
export const passwordRecoveryRoutes = new Hono<AppBindings>()

passwordRecoveryRoutes.post('/forgot-password', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const body = await parseBody(c, forgotPasswordInputSchema)
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local'
  await checkRateLimit(env, 'forgot-password-ip', clientIdentifier(ip), 20, 900)
  await checkRateLimit(env, 'forgot-password', clientIdentifier(undefined, body.email), 3, 900)

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

passwordRecoveryRoutes.post('/reset-password', async (c) => {
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
  const eligible = exists(
    db
      .select({ id: passwordResets.id })
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.id, reset.id),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, timestamp),
        ),
      ),
  )
  const [updated] = await db.batch([
    db
      .update(users)
      .set({ passwordHash, updatedAt: timestamp })
      .where(and(eq(users.id, reset.userId), eligible))
      .returning({ id: users.id }),
    db
      .update(sessions)
      .set({ revokedAt: timestamp })
      .where(and(eq(sessions.userId, reset.userId), isNull(sessions.revokedAt), eligible)),
    db
      .update(passwordResets)
      .set({ usedAt: timestamp })
      .where(and(eq(passwordResets.userId, reset.userId), isNull(passwordResets.usedAt))),
  ])
  if (!updated[0])
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Token pemulihan tidak valid atau kedaluwarsa')
  await env.RATE_LIMIT.delete(`reset:${tokenHash}`)

  return ok(c, { message: 'Kata sandi berhasil diperbarui. Silakan masuk kembali.' })
})
