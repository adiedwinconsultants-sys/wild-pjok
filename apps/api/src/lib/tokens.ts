import type { UserRole } from '@pjok/shared'
import { sign, verify } from 'hono/jwt'
import { z } from 'zod'
import type { Env } from '../env'
import { accessTokenTtl } from '../env'
import { AppError } from './errors'

const claimsSchema = z.object({
  sub: z.string(),
  role: z.enum(['teacher', 'admin', 'superadmin']),
  email: z.string(),
  name: z.string(),
  exp: z.number(),
  iat: z.number(),
})

export type AccessClaims = z.infer<typeof claimsSchema>

export async function issueAccessToken(
  env: Env,
  user: { id: string; role: UserRole; email: string; name: string },
): Promise<{ token: string; expiresIn: number }> {
  const ttl = accessTokenTtl(env)
  const issuedAt = Math.floor(Date.now() / 1000)
  const token = await sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      iat: issuedAt,
      exp: issuedAt + ttl,
    },
    env.JWT_SECRET,
    'HS256',
  )
  return { token, expiresIn: ttl }
}

export async function verifyAccessToken(env: Env, token: string): Promise<AccessClaims> {
  let payload: unknown
  try {
    payload = await verify(token, env.JWT_SECRET, 'HS256')
  } catch {
    throw new AppError(401, 'TOKEN_INVALID', 'Token akses tidak valid atau sudah kedaluwarsa')
  }
  const parsed = claimsSchema.safeParse(payload)
  if (!parsed.success) {
    throw new AppError(401, 'TOKEN_INVALID', 'Token akses tidak valid')
  }
  return parsed.data
}
