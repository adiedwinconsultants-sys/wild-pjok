import {
  isoDateSchema,
  paginationQuerySchema,
  sexSchema,
  studentCreateSchema,
  studentUpdateSchema,
} from '@pjok/shared'
import type { StudentImportRow } from '@pjok/shared'
import { and, count, eq, like } from 'drizzle-orm'
import { Hono } from 'hono'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { assessmentResults, students } from '../db/schema'
import { isUniqueViolation, requireOwnedClass, requireOwnedStudent } from '../lib/db-utils'
import { AppError, conflict, notFound, validationError } from '../lib/errors'
import { ok, paginationMeta, parseBody, parseParam, parseQuery } from '../lib/http'
import { nowIso } from '../lib/time'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024

const studentListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
})

const importRowSchema = z.object({
  fullName: z.string().trim().min(1, 'Nama wajib diisi'),
  nis: z.string().trim().min(1, 'NIS wajib diisi'),
  sex: sexSchema,
  birthDate: isoDateSchema,
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
  await requireOwnedClass(db, user, classId)
  const body = await parseBody(c, studentCreateSchema)
  const timestamp = nowIso()
  try {
    const inserted = await db
      .insert(students)
      .values({
        id: crypto.randomUUID(),
        teacherId: user.id,
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

classStudentRoutes.post('/:id/students/import', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const classId = parseParam(c, 'id')
  await requireOwnedClass(db, user, classId)
  const dryRun = c.req.query('dryRun') !== 'false'

  const form = await c.req.parseBody()
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
    const parsed = importRowSchema.safeParse(row.data)
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
        teacherId: user.id,
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
      await db.batch([first, ...rest])
      inserted = valid.length
    }
  }

  return ok(c, { dryRun, valid, duplicates, errors, inserted })
})

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

  await db.delete(students).where(eq(students.id, id))
  return c.body(null, 204)
})

type RawImportRow = { rowNumber: number; data: unknown }

function parseStudentWorkbook(bytes: Uint8Array): RawImportRow[] {
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  } catch {
    throw validationError('File Excel tidak dapat dibaca')
  }
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet) {
    throw validationError('File Excel tidak memiliki lembar kerja')
  }

  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: '',
  })

  const result: RawImportRow[] = []
  for (let index = 0; index < rawRows.length; index += 1) {
    const row = rawRows[index]
    if (!row) continue
    if (
      index === 0 &&
      String(row[0] ?? '')
        .trim()
        .toLowerCase() === 'nama'
    )
      continue
    if (row.every((cell) => String(cell ?? '').trim() === '')) continue
    result.push({
      rowNumber: index + 1,
      data: {
        fullName: String(row[0] ?? '').trim(),
        nis: normalizeNis(row[1]),
        sex: normalizeSex(row[2]),
        birthDate: normalizeBirthDate(row[3]),
      },
    })
  }
  return result
}

function normalizeNis(value: unknown): string {
  if (typeof value === 'number') return String(Math.trunc(value))
  return String(value ?? '').trim()
}

function normalizeSex(value: unknown): string {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'l' || raw === 'laki-laki' || raw === 'laki laki' || raw === 'male') return 'L'
  if (raw === 'p' || raw === 'perempuan' || raw === 'female') return 'P'
  return String(value ?? '').trim()
}

function normalizeBirthDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const month = String(parsed.m).padStart(2, '0')
      const day = String(parsed.d).padStart(2, '0')
      return `${parsed.y}-${month}-${day}`
    }
  }
  const raw = String(value ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const parts = raw.split(/[/.-]/)
  if (parts.length === 3) {
    const [day, month, year] = parts
    if (day && month && year && year.length === 4) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }
  return raw
}
