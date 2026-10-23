import { type UserRole, isAdminRole } from '@pjok/shared'
import type { MiddlewareHandler } from 'hono'
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
  const user: AuthUser = {
    id: claims.sub,
    role: claims.role,
    email: claims.email,
    name: claims.name,
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
