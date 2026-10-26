import { type UserRole, isAdminRole } from '@pjok/shared'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { MiddlewareHandler } from 'hono'
import { sessions, users } from '../db/schema'
import { AppError, forbidden, unauthorized } from '../lib/errors'
import { verifyAccessToken } from '../lib/tokens'
import type { AppBindings, AuthUser } from '../types'

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header || !header.startsWith('Bearer ')) {
    throw unauthorized('Header Authorization wajib menggunakan Bearer token')
  }
  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    throw unauthorized('Token akses kosong')
  }
  const claims = await verifyAccessToken(c.get('env'), token)
  const [account] = await c
    .get('db')
    .select({ id: users.id, role: users.role, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, claims.sid),
        eq(users.id, claims.sub),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1)
  if (!account) throw unauthorized('Sesi telah berakhir. Silakan masuk kembali.')
  const user: AuthUser = {
    ...account,
    sessionId: claims.sid,
  }
  c.set('user', user)
  await next()
}

export function requireRole(...roles: UserRole[]): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      throw unauthorized()
    }
    if (!roles.includes(user.role)) {
      throw forbidden('Peran pengguna tidak diizinkan untuk aksi ini')
    }
    await next()
  }
}

export function assertOwnership(resourceTeacherId: string, user: AuthUser): void {
  if (isAdminRole(user.role)) return
  if (resourceTeacherId !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak berhak mengakses sumber daya ini')
  }
}
