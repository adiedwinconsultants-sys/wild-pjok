import type { Env } from '../env'
import { sha256Hex } from './base64'
import { AppError } from './errors'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
}

export async function checkRateLimit(
  env: Env,
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `rl:${scope}:${await sha256Hex(identifier)}`
  const current = Number((await env.RATE_LIMIT.get(key)) ?? '0')
  if (current >= limit) {
    throw new AppError(429, 'RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi nanti.', {
      retryAfterSeconds: windowSeconds,
    })
  }
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: windowSeconds })
  return { allowed: true, remaining: Math.max(0, limit - current - 1) }
}

export function clientIdentifier(ip: string | undefined, extra?: string): string {
  return `${ip ?? 'unknown'}|${extra ?? ''}`
}
