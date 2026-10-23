import { instrumentSchema, paginationQuerySchema } from '@pjok/shared'
import type { Instrument } from '@pjok/shared'
import { and, count, desc, eq, like, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { instruments } from '../db/schema'
import { AppError, notFound } from '../lib/errors'
import { ok, paginationMeta, parseParam, parseQuery } from '../lib/http'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

const instrumentListQuerySchema = paginationQuerySchema.extend({
  group: z.enum(['bola_besar', 'atletik', 'kebugaran_jasmani', 'tksi']).optional(),
  q: z.string().trim().max(120).optional(),
})

export const instrumentRoutes = new Hono<AppBindings>()
instrumentRoutes.use('*', requireAuth)

instrumentRoutes.get('/', async (c) => {
  const db = c.get('db')
  const query = parseQuery(c, instrumentListQuerySchema)
  const conditions = []
  if (query.group) conditions.push(eq(instruments.group, query.group))
  if (query.q) {
    conditions.push(
      or(like(instruments.name, `%${query.q}%`), like(instruments.slug, `%${query.q}%`)),
    )
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const totalRows = where
    ? await db.select({ total: count() }).from(instruments).where(where)
    : await db.select({ total: count() }).from(instruments)

  const rows = await (where
    ? db.select().from(instruments).where(where)
    : db.select().from(instruments)
  )
    .orderBy(instruments.group, instruments.name)
    .limit(query.perPage)
    .offset((query.page - 1) * query.perPage)

  const data = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    version: row.version,
    group: row.group,
    name: row.name,
    createdAt: row.createdAt,
  }))
  return ok(c, data, paginationMeta(query.page, query.perPage, totalRows[0]?.total ?? 0))
})

instrumentRoutes.get('/:slug', async (c) => {
  const db = c.get('db')
  const slug = parseParam(c, 'slug')
  const rows = await db
    .select()
    .from(instruments)
    .where(eq(instruments.slug, slug))
    .orderBy(desc(instruments.version))
    .limit(1)
  const row = rows[0]
  if (!row) {
    throw notFound('INSTRUMENT_NOT_FOUND', 'Instrumen tidak ditemukan')
  }
  return ok(c, parseInstrumentPayload(row.payloadJson))
})

function parseInstrumentPayload(payload: string): Instrument {
  let raw: unknown
  try {
    raw = JSON.parse(payload)
  } catch {
    throw new AppError(500, 'INTERNAL_ERROR', 'Snapshot instrumen rusak')
  }
  const parsed = instrumentSchema.safeParse(raw)
  if (!parsed.success) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Snapshot instrumen tidak valid')
  }
  return parsed.data as Instrument
}
