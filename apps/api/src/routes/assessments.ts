import {
  assessmentInputSchema,
  assessmentListQuerySchema,
  reopenInputSchema,
  scoreBatchInputSchema,
} from '@pjok/shared'
import {
  SCORE_CATEGORY_LABELS,
  ScoringError,
  computeAssessment,
  normalizeRawValue,
} from '@pjok/shared'
import type { IndicatorScore, Instrument, RawScoreInput, ScoreCategory } from '@pjok/shared'
import { and, count, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { Database } from '../db/client'
import {
  assessmentResults,
  assessmentScores,
  assessments,
  auditLogs,
  classes,
  instruments,
  students,
} from '../db/schema'
import {
  parseInstrumentSnapshot,
  parseParticipantIds,
  requireOwnedAssessment,
} from '../lib/assessment-helpers'
import { AppError, conflict, notFound, validationError } from '../lib/errors'
import { ok, paginationMeta, parseBody, parseParam, parseQuery } from '../lib/http'
import { ageAt, nowIso } from '../lib/time'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

export const assessmentRoutes = new Hono<AppBindings>()
assessmentRoutes.use('*', requireAuth)

assessmentRoutes.post('/', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const body = await parseBody(c, assessmentInputSchema)

  const classRows = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, body.classId), eq(classes.teacherId, user.id)))
    .limit(1)
  if (!classRows[0]) {
    throw notFound('CLASS_NOT_FOUND', 'Kelas tidak ditemukan')
  }

  const instrumentRows = await db
    .select()
    .from(instruments)
    .where(or(eq(instruments.id, body.instrumentId), eq(instruments.slug, body.instrumentId)))
    .orderBy(desc(instruments.version))
    .limit(1)
  const instrumentRow = instrumentRows[0]
  if (!instrumentRow) {
    throw notFound('INSTRUMENT_NOT_FOUND', 'Instrumen tidak ditemukan')
  }

  const participantIds = [...new Set(body.participantIds)]
  const participants = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.classId, body.classId), inArray(students.id, participantIds)))
  if (participants.length !== participantIds.length) {
    throw validationError('Sebagian peserta didik tidak terdaftar pada kelas ini')
  }

  const timestamp = nowIso()
  const id = crypto.randomUUID()
  await db.insert(assessments).values({
    id,
    teacherId: user.id,
    classId: body.classId,
    instrumentId: instrumentRow.id,
    instrumentSnapshotJson: instrumentRow.payloadJson,
    participantIdsJson: JSON.stringify(participantIds),
    date: body.date,
    status: 'draft',
    finalizedAt: null,
    reopenedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  })

  return ok(c, {
    id,
    classId: body.classId,
    instrumentId: instrumentRow.id,
    instrumentSlug: instrumentRow.slug,
    date: body.date,
    status: 'draft',
    participantIds,
    instrument: parseInstrumentSnapshot(instrumentRow.payloadJson),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
})

assessmentRoutes.get('/', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const query = parseQuery(c, assessmentListQuerySchema)

  const conditions = [eq(assessments.teacherId, user.id)]
  if (query.classId) conditions.push(eq(assessments.classId, query.classId))
  if (query.instrumentId) conditions.push(eq(assessments.instrumentId, query.instrumentId))
  if (query.status) conditions.push(eq(assessments.status, query.status))
  if (query.from) conditions.push(gte(assessments.date, query.from))
  if (query.to) conditions.push(lte(assessments.date, query.to))
  if (query.q) {
    conditions.push(
      sql`lower(json_extract(${assessments.instrumentSnapshotJson}, '$.name')) like ${`%${query.q.toLowerCase()}%`}`,
    )
  }
  const where = and(...conditions)

  const totalRows = await db.select({ total: count() }).from(assessments).where(where)
  const rows = await db
    .select({
      id: assessments.id,
      classId: assessments.classId,
      className: classes.name,
      instrumentId: assessments.instrumentId,
      date: assessments.date,
      status: assessments.status,
      finalizedAt: assessments.finalizedAt,
      reopenedAt: assessments.reopenedAt,
      createdAt: assessments.createdAt,
      updatedAt: assessments.updatedAt,
      snapshot: assessments.instrumentSnapshotJson,
    })
    .from(assessments)
    .innerJoin(classes, eq(classes.id, assessments.classId))
    .where(where)
    .orderBy(desc(assessments.date), desc(assessments.createdAt))
    .limit(query.perPage)
    .offset((query.page - 1) * query.perPage)

  const data = rows.map((row) => {
    const instrument = parseInstrumentSnapshot(row.snapshot)
    return {
      id: row.id,
      classId: row.classId,
      className: row.className,
      instrumentId: row.instrumentId,
      instrumentSlug: instrument.slug,
      instrumentName: instrument.name,
      group: instrument.group,
      date: row.date,
      status: row.status,
      finalizedAt: row.finalizedAt,
      reopenedAt: row.reopenedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  })

  return ok(c, data, paginationMeta(query.page, query.perPage, totalRows[0]?.total ?? 0))
})

assessmentRoutes.get('/:id', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const assessment = await requireOwnedAssessment(db, user, id)
  const instrument = parseInstrumentSnapshot(assessment.instrumentSnapshotJson)
  const participantIds = parseParticipantIds(assessment.participantIdsJson)
  const participants = await loadParticipants(db, participantIds)
  const scores = await db
    .select()
    .from(assessmentScores)
    .where(eq(assessmentScores.assessmentId, id))
  const results = await db
    .select()
    .from(assessmentResults)
    .where(eq(assessmentResults.assessmentId, id))

  return ok(c, {
    ...assessment,
    instrumentSnapshotJson: undefined,
    participantIdsJson: undefined,
    instrument,
    participantIds,
    participants,
    scores,
    results,
  })
})

assessmentRoutes.put('/:id/scores', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const assessment = await requireOwnedAssessment(db, user, id)
  if (assessment.status === 'finalized') {
    throw conflict('ASSESSMENT_FINALIZED', 'Nilai asesmen final tidak dapat diubah')
  }

  const body = await parseBody(c, scoreBatchInputSchema)
  const instrument = parseInstrumentSnapshot(assessment.instrumentSnapshotJson)
  const participantIds = parseParticipantIds(assessment.participantIdsJson)
  const participantRows = await loadParticipants(db, participantIds)
  const participantMap = new Map(participantRows.map((student) => [student.id, student]))
  const indicatorMap = new Map(instrument.indicators.map((indicator) => [indicator.id, indicator]))

  const timestamp = nowIso()
  const seen = new Set<string>()
  const statements = []
  for (const input of body.scores) {
    const student = participantMap.get(input.studentId)
    if (!student) {
      throw validationError('Peserta didik tidak termasuk dalam asesmen ini')
    }
    const indicator = indicatorMap.get(input.indicatorId)
    if (!indicator) {
      throw validationError(`Indikator ${input.indicatorId} tidak ada pada instrumen ini`)
    }
    const key = `${input.studentId}:${input.indicatorId}`
    if (seen.has(key)) {
      throw validationError('Terdapat nilai ganda untuk peserta dan indikator yang sama')
    }
    seen.add(key)

    let normalized: number
    try {
      normalized = normalizeRawValue(
        indicator,
        input.rawValue,
        student.sex,
        ageAt(student.birthDate, assessment.date),
      ).value
    } catch (error) {
      if (error instanceof ScoringError) {
        throw new AppError(422, 'SCORE_INVALID', error.message)
      }
      throw error
    }

    statements.push(
      db
        .insert(assessmentScores)
        .values({
          id: crypto.randomUUID(),
          assessmentId: id,
          studentId: input.studentId,
          indicatorId: input.indicatorId,
          rawValue: input.rawValue,
          normalizedValue: normalized,
          kind: indicator.kind,
          updatedAt: timestamp,
        })
        .onConflictDoUpdate({
          target: [
            assessmentScores.assessmentId,
            assessmentScores.studentId,
            assessmentScores.indicatorId,
          ],
          set: {
            rawValue: input.rawValue,
            normalizedValue: normalized,
            kind: indicator.kind,
            updatedAt: timestamp,
          },
        }),
    )
  }

  const [first, ...rest] = statements
  if (first) {
    await db.batch([first, ...rest])
  }
  await db.update(assessments).set({ updatedAt: timestamp }).where(eq(assessments.id, id))

  const preview = await buildPreview(db, assessment, instrument)
  return ok(c, { updated: statements.length, preview })
})

assessmentRoutes.post('/:id/finalize', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const assessment = await requireOwnedAssessment(db, user, id)
  if (assessment.status === 'finalized') {
    throw conflict('ASSESSMENT_FINALIZED', 'Asesmen sudah difinalisasi')
  }

  const instrument = parseInstrumentSnapshot(assessment.instrumentSnapshotJson)
  const participants = await loadParticipants(
    db,
    parseParticipantIds(assessment.participantIdsJson),
  )
  const scores = await db
    .select()
    .from(assessmentScores)
    .where(eq(assessmentScores.assessmentId, id))
  const byStudent = groupScoresByStudent(scores)

  const incomplete: Array<{ studentId: string; missing: string[] }> = []
  for (const student of participants) {
    const inputs = buildInputs(byStudent.get(student.id) ?? [], student, assessment.date)
    const missing = instrument.indicators
      .filter(
        (indicator) =>
          indicator.required && !inputs.some((input) => input.indicatorId === indicator.id),
      )
      .map((indicator) => indicator.id)
    if (missing.length > 0) {
      incomplete.push({ studentId: student.id, missing })
    }
  }
  if (incomplete.length > 0) {
    throw new AppError(422, 'INCOMPLETE_SCORES', 'Masih ada nilai indikator yang belum lengkap', {
      students: incomplete,
    })
  }

  const timestamp = nowIso()
  const resultStatements = participants.map((student) => {
    const inputs = buildInputs(byStudent.get(student.id) ?? [], student, assessment.date)
    const computed = computeAssessment(instrument, inputs)
    return db
      .insert(assessmentResults)
      .values({
        id: crypto.randomUUID(),
        assessmentId: id,
        studentId: student.id,
        processScore: computed.processScore,
        productScore: computed.productScore,
        finalScore: computed.finalScore,
        category: computed.category.category,
        computedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [assessmentResults.assessmentId, assessmentResults.studentId],
        set: {
          processScore: computed.processScore,
          productScore: computed.productScore,
          finalScore: computed.finalScore,
          category: computed.category.category,
          computedAt: timestamp,
        },
      })
  })

  const [firstResult, ...restResults] = resultStatements
  if (firstResult) {
    await db.batch([firstResult, ...restResults])
  }
  await db
    .update(assessments)
    .set({ status: 'finalized', finalizedAt: timestamp, updatedAt: timestamp })
    .where(eq(assessments.id, id))

  const results = await db
    .select()
    .from(assessmentResults)
    .where(eq(assessmentResults.assessmentId, id))
  return ok(c, { status: 'finalized', finalizedAt: timestamp, results })
})

assessmentRoutes.post('/:id/reopen', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const assessment = await requireOwnedAssessment(db, user, id)
  if (assessment.status !== 'finalized') {
    throw conflict('ASSESSMENT_NOT_FINALIZED', 'Hanya asesmen final yang dapat dibuka kembali')
  }
  const body = await parseBody(c, reopenInputSchema)
  const timestamp = nowIso()
  await db.batch([
    db
      .update(assessments)
      .set({ status: 'reopened', reopenedAt: timestamp, updatedAt: timestamp })
      .where(eq(assessments.id, id)),
    db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      actorId: user.id,
      action: 'assessment.reopen',
      entityType: 'assessment',
      entityId: id,
      payloadJson: JSON.stringify({ reason: body.reason }),
      createdAt: timestamp,
    }),
  ])
  return ok(c, { id, status: 'reopened', reopenedAt: timestamp })
})

async function loadParticipants(db: Database, participantIds: string[]) {
  if (participantIds.length === 0) return []
  return db
    .select()
    .from(students)
    .where(inArray(students.id, participantIds))
    .orderBy(students.fullName)
}

type ScoreRow = typeof assessmentScores.$inferSelect

function groupScoresByStudent(rows: ScoreRow[]): Map<string, ScoreRow[]> {
  const map = new Map<string, ScoreRow[]>()
  for (const row of rows) {
    const list = map.get(row.studentId) ?? []
    list.push(row)
    map.set(row.studentId, list)
  }
  return map
}

function buildInputs(
  rows: ScoreRow[],
  student: { id: string; sex: 'L' | 'P'; birthDate: string },
  date: string,
): RawScoreInput[] {
  return rows.map((row) => ({
    indicatorId: row.indicatorId,
    rawValue: row.rawValue,
    sex: student.sex,
    age: ageAt(student.birthDate, date),
  }))
}

async function buildPreview(
  db: Database,
  assessment: { id: string; date: string; participantIdsJson: string },
  instrument: Instrument,
) {
  const participants = await loadParticipants(
    db,
    parseParticipantIds(assessment.participantIdsJson),
  )
  const scores = await db
    .select()
    .from(assessmentScores)
    .where(eq(assessmentScores.assessmentId, assessment.id))
  const byStudent = groupScoresByStudent(scores)
  return participants.map((student) => {
    const inputs = buildInputs(byStudent.get(student.id) ?? [], student, assessment.date)
    try {
      const computed = computeAssessment(instrument, inputs)
      return {
        studentId: student.id,
        finalScore: computed.finalScore,
        category: computed.category.category,
        categoryLabel: computed.category.label,
        processScore: computed.processScore,
        productScore: computed.productScore,
        complete: true,
      }
    } catch (error) {
      if (error instanceof ScoringError) {
        return {
          studentId: student.id,
          finalScore: null,
          category: null,
          categoryLabel: null,
          processScore: null,
          productScore: null,
          complete: false,
        }
      }
      throw error
    }
  })
}

export function categoryLabel(category: ScoreCategory): string {
  return SCORE_CATEGORY_LABELS[category]
}

export type { IndicatorScore }
