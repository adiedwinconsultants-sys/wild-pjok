import { classCreateSchema, classUpdateSchema, paginationQuerySchema } from '@pjok/shared'
import { and, count, desc, eq, like, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { assessmentResults, assessments, classes, students } from '../db/schema'
import { mapAssessmentWriteError } from '../lib/assessment-write-error'
import { isUniqueViolation, requireOwnedClass } from '../lib/db-utils'
import { conflict, notFound } from '../lib/errors'
import { ok, paginationMeta, parseBody, parseParam, parseQuery } from '../lib/http'
import { nowIso } from '../lib/time'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

export const classRoutes = new Hono<AppBindings>()

const classListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
})

classRoutes.use('*', requireAuth)

classRoutes.get('/', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const query = parseQuery(c, classListQuerySchema)
  const conditions = [eq(classes.teacherId, user.id)]
  if (query.q) {
    conditions.push(like(classes.name, `%${query.q}%`))
  }
  const where = and(...conditions)

  const totalRows = await db.select({ total: count() }).from(classes).where(where)
  const rows = await db
    .select()
    .from(classes)
    .where(where)
    .orderBy(desc(classes.updatedAt))
    .limit(query.perPage)
    .offset((query.page - 1) * query.perPage)

  const counts =
    rows.length === 0
      ? []
      : await db
          .select({ classId: students.classId, total: count() })
          .from(students)
          .where(
            sql`${students.classId} in (${sql.join(
              rows.map((row) => sql`${row.id}`),
              sql`, `,
            )})`,
          )
          .groupBy(students.classId)

  const countMap = new Map(counts.map((row) => [row.classId, row.total]))
  const data = rows.map((row) => ({ ...row, studentCount: countMap.get(row.id) ?? 0 }))
  return ok(c, data, paginationMeta(query.page, query.perPage, totalRows[0]?.total ?? 0))
})

classRoutes.post('/', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const body = await parseBody(c, classCreateSchema)
  const timestamp = nowIso()
  try {
    const inserted = await db
      .insert(classes)
      .values({
        id: crypto.randomUUID(),
        teacherId: user.id,
        name: body.name,
        gradeLevel: body.gradeLevel,
        academicYear: body.academicYear,
        notes: body.notes ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning()
    const created = inserted[0]
    if (!created) throw new Error('insert class gagal')
    return ok(c, { ...created, studentCount: 0 })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('CLASS_DUPLICATE', 'Kelas dengan nama dan tahun ajaran ini sudah ada')
    }
    throw error
  }
})

classRoutes.get('/:id', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const klass = await requireOwnedClass(db, user, id)
  const counts = await db.select({ total: count() }).from(students).where(eq(students.classId, id))
  return ok(c, { ...klass, studentCount: counts[0]?.total ?? 0 })
})

classRoutes.patch('/:id', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  await requireOwnedClass(db, user, id)
  const body = await parseBody(c, classUpdateSchema)
  const values: Record<string, string | number | null> = { updatedAt: nowIso() }
  if (body.name !== undefined) values.name = body.name
  if (body.gradeLevel !== undefined) values.gradeLevel = body.gradeLevel
  if (body.academicYear !== undefined) values.academicYear = body.academicYear
  if (body.notes !== undefined) values.notes = body.notes
  try {
    const updated = await db.update(classes).set(values).where(eq(classes.id, id)).returning()
    const row = updated[0]
    if (!row) throw notFound('CLASS_NOT_FOUND', 'Kelas tidak ditemukan')
    return ok(c, row)
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('CLASS_DUPLICATE', 'Kelas dengan nama dan tahun ajaran ini sudah ada')
    }
    throw error
  }
})

classRoutes.delete('/:id', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  await requireOwnedClass(db, user, id)

  const finalized = await db
    .select({ total: count() })
    .from(assessments)
    .where(
      and(eq(assessments.classId, id), sql`${assessments.status} in ('finalized', 'reopened')`),
    )
  if ((finalized[0]?.total ?? 0) > 0) {
    throw conflict(
      'CLASS_HAS_ASSESSMENTS',
      'Kelas tidak dapat dihapus karena sudah memiliki riwayat asesmen final',
    )
  }

  await db.delete(classes).where(eq(classes.id, id)).catch(mapAssessmentWriteError)
  return c.body(null, 204)
})

classRoutes.get('/:id/recap', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  await requireOwnedClass(db, user, id)

  const latest = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(and(eq(assessments.classId, id), sql`${assessments.status} in ('finalized','reopened')`))
    .orderBy(desc(assessments.date))
    .limit(1)
  const latestId = latest[0]?.id
  if (!latestId) {
    return ok(c, {
      assessmentId: null,
      average: null,
      min: null,
      max: null,
      distribution: { sangat_baik: 0, baik: 0, cukup: 0, perlu_bimbingan: 0 },
      students: [],
    })
  }

  const rows = await db
    .select({
      studentId: assessmentResults.studentId,
      finalScore: assessmentResults.finalScore,
      category: assessmentResults.category,
      processScore: assessmentResults.processScore,
      productScore: assessmentResults.productScore,
      fullName: students.fullName,
      nis: students.nis,
    })
    .from(assessmentResults)
    .innerJoin(students, eq(students.id, assessmentResults.studentId))
    .where(eq(assessmentResults.assessmentId, latestId))

  const scores = rows.map((row) => row.finalScore)
  const distribution = { sangat_baik: 0, baik: 0, cukup: 0, perlu_bimbingan: 0 }
  for (const row of rows) {
    distribution[row.category] += 1
  }
  const average =
    scores.length > 0
      ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100) / 100
      : null

  return ok(c, {
    assessmentId: latestId,
    average,
    min: scores.length > 0 ? Math.min(...scores) : null,
    max: scores.length > 0 ? Math.max(...scores) : null,
    distribution,
    students: rows,
  })
})
