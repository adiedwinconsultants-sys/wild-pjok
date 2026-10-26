import { paginationQuerySchema, studentCreateSchema, studentUpdateSchema } from '@pjok/shared'
import type { StudentImportRow } from '@pjok/shared'
import { and, count, eq, like } from 'drizzle-orm'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { assessmentResults, students } from '../db/schema'
import { mapAssessmentWriteError } from '../lib/assessment-write-error'
import { isUniqueViolation, requireOwnedClass, requireOwnedStudent } from '../lib/db-utils'
import { AppError, conflict, notFound, validationError } from '../lib/errors'
import { ok, paginationMeta, parseBody, parseParam, parseQuery } from '../lib/http'
import { checkRateLimit } from '../lib/rate-limit'
import { parseStudentWorkbook } from '../lib/student-workbook'
import { nowIso } from '../lib/time'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024

const studentListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
})

export const classStudentRoutes = new Hono<AppBindings>()
classStudentRoutes.use('*', requireAuth)

classStudentRoutes.get('/:id/students', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const classId = parseParam(c, 'id')
  await requireOwnedClass(db, user, classId)
  const query = parseQuery(c, studentListQuerySchema)

  const conditions = [eq(students.classId, classId)]
  if (query.q) {
    conditions.push(like(students.fullName, `%${query.q}%`))
  }
  const where = and(...conditions)

  const totalRows = await db.select({ total: count() }).from(students).where(where)
  const rows = await db
    .select()
    .from(students)
    .where(where)
    .orderBy(students.fullName)
    .limit(query.perPage)
    .offset((query.page - 1) * query.perPage)

  return ok(c, rows, paginationMeta(query.page, query.perPage, totalRows[0]?.total ?? 0))
})

classStudentRoutes.post('/:id/students', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const classId = parseParam(c, 'id')
  const klass = await requireOwnedClass(db, user, classId)
  const body = await parseBody(c, studentCreateSchema)
  const timestamp = nowIso()
  try {
    const inserted = await db
      .insert(students)
      .values({
        id: crypto.randomUUID(),
        teacherId: klass.teacherId,
        classId,
        fullName: body.fullName,
        nis: body.nis,
        sex: body.sex,
        birthDate: body.birthDate,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning()
    const row = inserted[0]
    if (!row) throw new Error('insert student gagal')
    return ok(c, row)
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('STUDENT_DUPLICATE', 'NIS sudah terdaftar pada kelas ini')
    }
    throw error
  }
})

classStudentRoutes.post(
  '/:id/students/import',
  bodyLimit({
    maxSize: MAX_IMPORT_BYTES + 64 * 1024,
    onError: () => {
      throw new AppError(
        413,
        'PAYLOAD_TOO_LARGE',
        'Ukuran unggahan maksimal 2 MB ditambah metadata formulir',
      )
    },
  }),
  async (c) => {
    const db = c.get('db')
    const user = c.get('user')
    const classId = parseParam(c, 'id')
    const klass = await requireOwnedClass(db, user, classId)
    const { dryRun } = parseQuery(
      c,
      z.object({
        dryRun: z
          .enum(['true', 'false'])
          .default('true')
          .transform((value) => value === 'true'),
      }),
    )
    await checkRateLimit(c.get('env'), 'student-import', user.id, 10, 60)

    const form = await c.req.parseBody().catch(() => {
      throw validationError('Formulir unggahan tidak dapat dibaca')
    })
    const file = form.file
    if (!(file instanceof File)) {
      throw validationError('File Excel wajib diunggah pada field "file"')
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw validationError('File harus berformat .xlsx')
    }
    if (file.size > MAX_IMPORT_BYTES) {
      throw new AppError(413, 'PAYLOAD_TOO_LARGE', 'Ukuran file maksimal 2 MB')
    }

    const rows = parseStudentWorkbook(new Uint8Array(await file.arrayBuffer()))

    const existing = await db
      .select({ nis: students.nis })
      .from(students)
      .where(eq(students.classId, classId))
    const existingNis = new Set(existing.map((row) => row.nis))
    const seen = new Set<string>()

    const valid: StudentImportRow[] = []
    const duplicates: StudentImportRow[] = []
    const errors: Array<{ rowNumber: number; message: string }> = []

    for (const row of rows) {
      const parsed = studentCreateSchema.safeParse(row.data)
      if (!parsed.success) {
        errors.push({
          rowNumber: row.rowNumber,
          message: parsed.error.issues.map((issue) => issue.message).join('; '),
        })
        continue
      }
      const candidate: StudentImportRow = { rowNumber: row.rowNumber, ...parsed.data }
      if (existingNis.has(candidate.nis) || seen.has(candidate.nis)) {
        duplicates.push(candidate)
        continue
      }
      seen.add(candidate.nis)
      valid.push(candidate)
    }

    let inserted = 0
    if (!dryRun && valid.length > 0) {
      const timestamp = nowIso()
      const statements = valid.map((row) =>
        db.insert(students).values({
          id: crypto.randomUUID(),
          teacherId: klass.teacherId,
          classId,
          fullName: row.fullName,
          nis: row.nis,
          sex: row.sex,
          birthDate: row.birthDate,
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      )
      const [first, ...rest] = statements
      if (first) {
        try {
          await db.batch([first, ...rest])
          inserted = valid.length
        } catch (error) {
          if (isUniqueViolation(error))
            throw conflict(
              'STUDENT_DUPLICATE',
              'Data siswa telah berubah. Pratinjau ulang file sebelum mengimpor.',
            )
          throw error
        }
      }
    }

    return ok(c, { dryRun, valid, duplicates, errors, inserted })
  },
)

export const studentRoutes = new Hono<AppBindings>()
studentRoutes.use('*', requireAuth)

studentRoutes.get('/import-template', (c) => {
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Nama', 'NIS', 'Jenis Kelamin', 'Tanggal Lahir'],
    ['Contoh Siswa', '12345', 'L', '2012-01-31'],
  ])
  sheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(workbook, sheet, 'Siswa')
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return c.body(buffer, 200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="template-impor-siswa.xlsx"',
  })
})

studentRoutes.patch('/:id', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const student = await requireOwnedStudent(db, user, id)
  const body = await parseBody(c, studentUpdateSchema)

  const values: Record<string, string> = { updatedAt: nowIso() }
  if (body.fullName !== undefined) values.fullName = body.fullName
  if (body.nis !== undefined) values.nis = body.nis
  if (body.sex !== undefined) values.sex = body.sex
  if (body.birthDate !== undefined) values.birthDate = body.birthDate

  try {
    const updated = await db
      .update(students)
      .set(values)
      .where(and(eq(students.id, id), eq(students.classId, student.classId)))
      .returning()
    const row = updated[0]
    if (!row) throw notFound('STUDENT_NOT_FOUND', 'Peserta didik tidak ditemukan')
    return ok(c, row)
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict('STUDENT_DUPLICATE', 'NIS sudah terdaftar pada kelas ini')
    }
    throw error
  }
})

studentRoutes.delete('/:id', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  await requireOwnedStudent(db, user, id)

  const results = await db
    .select({ total: count() })
    .from(assessmentResults)
    .where(eq(assessmentResults.studentId, id))
  if ((results[0]?.total ?? 0) > 0) {
    throw conflict(
      'STUDENT_HAS_RESULTS',
      'Peserta didik tidak dapat dihapus karena sudah memiliki hasil asesmen',
    )
  }

  await db.delete(students).where(eq(students.id, id)).catch(mapAssessmentWriteError)
  return c.body(null, 204)
})
