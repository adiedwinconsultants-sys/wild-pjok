import { z } from 'zod'

const envSchema = z.object({
  DB: z.custom<D1Database>((value) => value !== undefined, 'Binding DB wajib ada'),
  EXPORTS: z.custom<R2Bucket>((value) => value !== undefined, 'Binding EXPORTS wajib ada'),
  RATE_LIMIT: z.custom<KVNamespace>((value) => value !== undefined, 'Binding RATE_LIMIT wajib ada'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  APP_ENV: z.string().default('local'),
  ACCESS_TOKEN_TTL: z.string().default('900'),
  CORS_ORIGIN: z.string().optional(),
  BUILD_VERSION: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),
  WORKOS_CLIENT_SECRET: z.string().optional(),
  WORKOS_API_BASE: z.string().url().default('https://api.workos.com'),
  WORKOS_CONNECTION_ID: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(raw: unknown): Env {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    throw new Error(`Konfigurasi environment tidak valid: ${messages.join('; ')}`)
  }
  return result.data
}

export function accessTokenTtl(env: Env): number {
  const ttl = Number(env.ACCESS_TOKEN_TTL)
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 900
}

export function isWorkosConfigured(env: Env): boolean {
  return Boolean(env.WORKOS_CLIENT_ID && env.WORKOS_CLIENT_SECRET)
}
