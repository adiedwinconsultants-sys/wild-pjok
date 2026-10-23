import type { Context } from 'hono'
import type { ZodType, ZodTypeDef } from 'zod'
import { z } from 'zod'
import { validationError } from './errors'

export type Meta = {
  page?: number
  perPage?: number
  total?: number
  totalPages?: number
}

export function ok<T>(c: Context, data: T, meta?: Meta) {
  if (meta) {
    return c.json({ data, meta })
  }
  return c.json({ data })
}

export async function parseBody<T>(
  c: Context,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<T> {
  const raw = await safeJson(c)
  return validate(schema, raw)
}

export function parseQuery<T>(c: Context, schema: ZodType<T, ZodTypeDef, unknown>): T {
  const query = c.req.query()
  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') normalized[key] = value
  }
  return validate(schema, normalized)
}

export function parseParam(c: Context, name: string): string {
  const value = c.req.param(name)
  if (!value) {
    throw validationError(`Parameter ${name} wajib ada`)
  }
  return value
}

function validate<T>(schema: ZodType<T, ZodTypeDef, unknown>, raw: unknown): T {
  const result = schema.safeParse(raw)
  if (!result.success) {
    throw validationError('Data yang dikirim tidak valid', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
  }
  return result.data
}

async function safeJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    throw validationError('Body harus berupa JSON yang valid')
  }
}

export function paginationMeta(page: number, perPage: number, total: number): Meta {
  return {
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  }
}

export const idParamsSchema = z.object({ id: z.string().min(1) })
