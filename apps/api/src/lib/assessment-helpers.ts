import { instrumentSchema } from '@pjok/shared'
import type { Instrument } from '@pjok/shared'
import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { assessments } from '../db/schema'
import { assertOwnership } from '../middleware/auth'
import type { AuthUser } from '../types'
import { AppError, notFound } from './errors'

export function parseInstrumentSnapshot(payload: string): Instrument {
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

export async function requireOwnedAssessment(db: Database, user: AuthUser, id: string) {
  const rows = await db.select().from(assessments).where(eq(assessments.id, id)).limit(1)
  const assessment = rows[0]
  if (!assessment) {
    throw notFound('ASSESSMENT_NOT_FOUND', 'Asesmen tidak ditemukan')
  }
  assertOwnership(assessment.teacherId, user)
  return assessment
}

export function parseParticipantIds(payload: string): string[] {
  try {
    const raw: unknown = JSON.parse(payload)
    if (Array.isArray(raw) && raw.every((item) => typeof item === 'string')) {
      return raw
    }
  } catch {
    // fall through
  }
  return []
}
