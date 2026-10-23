import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from '../db/client'
import { sessions } from '../db/schema'
import { randomToken, sha256Hex } from './base64'
import { AppError } from './errors'
import { addDaysIso, nowIso } from './time'

export const REFRESH_TOKEN_DAYS = 30

export async function createSession(
  db: Database,
  userId: string,
  userAgent?: string,
): Promise<{ refreshToken: string; sessionId: string }> {
  const refreshToken = randomToken(32)
  const sessionId = crypto.randomUUID()
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    refreshTokenHash: await sha256Hex(refreshToken),
    expiresAt: addDaysIso(REFRESH_TOKEN_DAYS),
    revokedAt: null,
    userAgent: userAgent ?? null,
    createdAt: nowIso(),
  })
  return { refreshToken, sessionId }
}

export async function findSessionByToken(db: Database, refreshToken: string) {
  const hash = await sha256Hex(refreshToken)
  const rows = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, hash)).limit(1)
  return rows[0]
}

export async function rotateSession(
  db: Database,
  refreshToken: string,
  userAgent?: string,
): Promise<{ userId: string; refreshToken: string }> {
  const session = await findSessionByToken(db, refreshToken)
  if (!session) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token tidak valid')
  }

  if (session.revokedAt !== null) {
    await revokeAllSessions(db, session.userId)
    throw new AppError(
      401,
      'INVALID_REFRESH_TOKEN',
      'Refresh token sudah digunakan; seluruh sesi dicabut',
    )
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token sudah kedaluwarsa')
  }

  const nextToken = randomToken(32)
  await db.update(sessions).set({ revokedAt: nowIso() }).where(eq(sessions.id, session.id))

  await db.insert(sessions).values({
    id: crypto.randomUUID(),
    userId: session.userId,
    refreshTokenHash: await sha256Hex(nextToken),
    expiresAt: addDaysIso(REFRESH_TOKEN_DAYS),
    revokedAt: null,
    userAgent: userAgent ?? session.userAgent ?? null,
    createdAt: nowIso(),
  })

  return { userId: session.userId, refreshToken: nextToken }
}

export async function revokeSessionByToken(db: Database, refreshToken: string): Promise<void> {
  const hash = await sha256Hex(refreshToken)
  await db
    .update(sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(sessions.refreshTokenHash, hash), isNull(sessions.revokedAt)))
}

export async function revokeAllSessions(db: Database, userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
}
