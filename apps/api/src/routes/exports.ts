import { exportRequestSchema } from '@pjok/shared'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { exportJobs } from '../db/schema'
import { AppError, notFound } from '../lib/errors'
import { ok, parseBody, parseParam } from '../lib/http'
import { checkRateLimit } from '../lib/rate-limit'
import { nowIso } from '../lib/time'
import { requireAuth } from '../middleware/auth'
import { buildPdf } from '../reports/pdf'
import { buildReportData, reportFileName } from '../reports/report-data'
import { buildXlsx } from '../reports/xlsx'
import type { AppBindings } from '../types'

export const exportRoutes = new Hono<AppBindings>()
exportRoutes.use('*', requireAuth)

exportRoutes.post('/', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const user = c.get('user')
  const body = await parseBody(c, exportRequestSchema)
  await checkRateLimit(env, 'exports', user.id, 5, 60)

  const { report, assessmentId } = await buildReportData(db, user, {
    ...(body.assessmentId ? { assessmentId: body.assessmentId } : {}),
    ...(body.classId ? { classId: body.classId } : {}),
  })
  const jobId = crypto.randomUUID()
  const timestamp = nowIso()
  const fileName = reportFileName(report, body.format)
  await db.insert(exportJobs).values({
    id: jobId,
    teacherId: user.id,
    assessmentId,
    classId: body.classId ?? null,
    format: body.format,
    status: 'processing',
    r2Key: null,
    errorMessage: null,
    createdAt: timestamp,
    completedAt: null,
  })

  try {
    const bytes = body.format === 'xlsx' ? buildXlsx(report) : await buildPdf(report)
    const contentType =
      body.format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
    const key = `exports/${user.id}/${jobId}/${fileName}`
    await env.EXPORTS.put(key, bytes, {
      httpMetadata: { contentType },
      customMetadata: { teacherId: user.id },
    })
    const completedAt = nowIso()
    await db
      .update(exportJobs)
      .set({ status: 'completed', r2Key: key, completedAt })
      .where(eq(exportJobs.id, jobId))
    return ok(c, {
      id: jobId,
      teacherId: user.id,
      assessmentId,
      classId: body.classId ?? null,
      format: body.format,
      status: 'completed',
      fileName,
      downloadUrl: `/v1/exports/${jobId}/download`,
      errorMessage: null,
      createdAt: timestamp,
      completedAt,
    })
  } catch (error) {
    const completedAt = nowIso()
    await db
      .update(exportJobs)
      .set({
        status: 'failed',
        errorMessage: 'Gagal membuat berkas laporan',
        completedAt,
      })
      .where(eq(exportJobs.id, jobId))
    console.error(
      JSON.stringify({
        level: 'error',
        requestId: c.get('requestId'),
        action: 'export.build',
        code: 'EXPORT_FAILED',
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      }),
    )
    throw new AppError(500, 'EXPORT_FAILED', 'Gagal membuat berkas laporan')
  }
})

exportRoutes.get('/:id', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const rows = await db.select().from(exportJobs).where(eq(exportJobs.id, id)).limit(1)
  const job = rows[0]
  if (!job) {
    throw notFound('EXPORT_NOT_FOUND', 'Pekerjaan ekspor tidak ditemukan')
  }
  if (job.teacherId !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak berhak mengakses hasil ekspor ini')
  }
  return ok(c, {
    id: job.id,
    teacherId: job.teacherId,
    assessmentId: job.assessmentId,
    classId: job.classId,
    format: job.format,
    status: job.status,
    downloadUrl: job.status === 'completed' ? `/v1/exports/${job.id}/download` : null,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  })
})

exportRoutes.get('/:id/download', async (c) => {
  const env = c.get('env')
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const rows = await db.select().from(exportJobs).where(eq(exportJobs.id, id)).limit(1)
  const job = rows[0]
  if (!job) {
    throw notFound('EXPORT_NOT_FOUND', 'Pekerjaan ekspor tidak ditemukan')
  }
  if (job.teacherId !== user.id) {
    throw new AppError(403, 'FORBIDDEN', 'Anda tidak berhak mengunduh hasil ekspor ini')
  }
  if (job.status !== 'completed' || !job.r2Key) {
    throw new AppError(409, 'EXPORT_NOT_FOUND', 'Berkas ekspor belum tersedia')
  }

  const object = await env.EXPORTS.get(job.r2Key)
  if (!object) {
    throw notFound('EXPORT_NOT_FOUND', 'Berkas ekspor tidak ditemukan di penyimpanan')
  }

  const fileName = job.r2Key.split('/').pop() ?? `laporan.${job.format}`
  const contentType =
    job.format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

  return c.body(object.body, 200, {
    'Content-Type': object.httpMetadata?.contentType ?? contentType,
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
})
