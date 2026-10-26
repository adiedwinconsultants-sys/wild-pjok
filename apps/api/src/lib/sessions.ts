import { and, eq, gt, isNull, sql } from 'drizzle-orm'
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
): Promise<{ userId: string; refreshToken: string; sessionId: string }> {
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
  const sessionId = crypto.randomUUID()
  const timestamp = nowIso()
  const eligible = and(
    eq(sessions.id, session.id),
    isNull(sessions.revokedAt),
    gt(sessions.expiresAt, timestamp),
  )
  const [inserted] = await db.batch([
    db
      .insert(sessions)
      .select(
        db
          .select({
            id: sql<string>`${sessionId}`.as('id'),
            userId: sessions.userId,
            refreshTokenHash: sql<string>`${await sha256Hex(nextToken)}`.as('refresh_token_hash'),
            expiresAt: sql<string>`${addDaysIso(REFRESH_TOKEN_DAYS)}`.as('expires_at'),
            revokedAt: sql<null>`null`.as('revoked_at'),
            userAgent: sql<string | null>`${userAgent ?? session.userAgent ?? null}`.as(
              'user_agent',
            ),
            createdAt: sql<string>`${timestamp}`.as('created_at'),
          })
          .from(sessions)
          .where(eligible),
      )
      .returning({ id: sessions.id }),
    db.update(sessions).set({ revokedAt: timestamp }).where(eligible),
  ])
  if (!inserted[0]) {
    await revokeAllSessions(db, session.userId)
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token sudah digunakan')
  }
  return { userId: session.userId, refreshToken: nextToken, sessionId }
}

export async function revokeSessionByToken(
  db: Database,
  refreshToken: string,
  userId: string,
): Promise<void> {
  const hash = await sha256Hex(refreshToken)
  await db
    .update(sessions)
    .set({ revokedAt: nowIso() })
    .where(
      and(
        eq(sessions.refreshTokenHash, hash),
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
      ),
    )
}

export async function revokeAllSessions(db: Database, userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: nowIso() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
}
