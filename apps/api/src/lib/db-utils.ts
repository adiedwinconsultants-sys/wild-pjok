import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { classes, students } from '../db/schema'
import { assertOwnership } from '../middleware/auth'
import type { AuthUser } from '../types'
import { notFound } from './errors'

export function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('UNIQUE constraint failed') || message.includes('SQLITE_CONSTRAINT')
}

export async function requireOwnedClass(db: Database, user: AuthUser, classId: string) {
  const rows = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
  const klass = rows[0]
  if (!klass) {
    throw notFound('CLASS_NOT_FOUND', 'Kelas tidak ditemukan')
  }
  assertOwnership(klass.teacherId, user)
  return klass
}

export async function requireOwnedStudent(db: Database, user: AuthUser, studentId: string) {
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1)
  const student = rows[0]
  if (!student) {
    throw notFound('STUDENT_NOT_FOUND', 'Peserta didik tidak ditemukan')
  }
  assertOwnership(student.teacherId, user)
  return student
}
