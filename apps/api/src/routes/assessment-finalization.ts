import { ScoringError, computeAssessment, reopenInputSchema } from '@pjok/shared'
import { and, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { assessmentResults, assessmentScores, assessments, auditLogs } from '../db/schema'
import {
  loadAssessmentParticipants,
  parseInstrumentSnapshot,
  requireOwnedAssessment,
} from '../lib/assessment-helpers'
import { buildInputs, groupScoresByStudent } from '../lib/assessment-scoring'
import { AppError, conflict } from '../lib/errors'
import { ok, parseBody, parseParam } from '../lib/http'
import { nowIso } from '../lib/time'
import type { AppBindings } from '../types'

export const assessmentFinalizationRoutes = new Hono<AppBindings>()

assessmentFinalizationRoutes.post('/:id/finalize', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const assessment = await requireOwnedAssessment(db, user, id)
  if (assessment.status === 'finalized') {
    throw conflict('ASSESSMENT_FINALIZED', 'Asesmen sudah difinalisasi')
  }

  const instrument = parseInstrumentSnapshot(assessment.instrumentSnapshotJson)
  const participants = await loadAssessmentParticipants(db, assessment)
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
  const mutationVersion = crypto.randomUUID()
  const resultStatements = participants.map((student) => {
    const inputs = buildInputs(byStudent.get(student.id) ?? [], student, assessment.date)
    const computed = (() => {
      try {
        return computeAssessment(instrument, inputs)
      } catch (error) {
        if (error instanceof ScoringError) throw new AppError(422, 'SCORE_INVALID', error.message)
        throw error
      }
    })()
    return db
      .insert(assessmentResults)
      .select(
        db
          .select({
            id: sql<string>`${crypto.randomUUID()}`.as('id'),
            assessmentId: assessments.id,
            studentId: sql<string>`${student.id}`.as('student_id'),
            processScore: sql<number | null>`${computed.processScore}`.as('process_score'),
            productScore: sql<number | null>`${computed.productScore}`.as('product_score'),
            finalScore: sql<number>`${computed.finalScore}`.as('final_score'),
            category: sql<string>`${computed.category.category}`.as('category'),
            computedAt: sql<string>`${timestamp}`.as('computed_at'),
          })
          .from(assessments)
          .where(and(eq(assessments.id, id), eq(assessments.mutationVersion, mutationVersion))),
      )
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

  const [updated] = await db.batch([
    db
      .update(assessments)
      .set({ status: 'finalized', finalizedAt: timestamp, updatedAt: timestamp, mutationVersion })
      .where(
        and(
          eq(assessments.id, id),
          eq(assessments.mutationVersion, assessment.mutationVersion),
          sql`${assessments.status} != 'finalized'`,
        ),
      )
      .returning({ id: assessments.id }),
    ...resultStatements,
  ])
  if (!updated[0])
    throw conflict(
      'ASSESSMENT_CONFLICT',
      'Data asesmen telah berubah. Muat ulang sebelum finalisasi.',
    )

  const results = await db
    .select()
    .from(assessmentResults)
    .where(eq(assessmentResults.assessmentId, id))
  return ok(c, { status: 'finalized', finalizedAt: timestamp, results })
})

assessmentFinalizationRoutes.post('/:id/reopen', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const assessment = await requireOwnedAssessment(db, user, id)
  if (assessment.status !== 'finalized') {
    throw conflict('ASSESSMENT_NOT_FINALIZED', 'Hanya asesmen final yang dapat dibuka kembali')
  }
  const body = await parseBody(c, reopenInputSchema)
  const timestamp = nowIso()
  const mutationVersion = crypto.randomUUID()
  const [updated] = await db.batch([
    db
      .update(assessments)
      .set({ status: 'reopened', reopenedAt: timestamp, updatedAt: timestamp, mutationVersion })
      .where(
        and(
          eq(assessments.id, id),
          eq(assessments.status, 'finalized'),
          eq(assessments.mutationVersion, assessment.mutationVersion),
        ),
      )
      .returning({ id: assessments.id }),
    db.insert(auditLogs).select(
      db
        .select({
          id: sql<string>`${crypto.randomUUID()}`.as('id'),
          actorId: sql<string>`${user.id}`.as('actor_id'),
          action: sql<string>`'assessment.reopen'`.as('action'),
          entityType: sql<string>`'assessment'`.as('entity_type'),
          entityId: assessments.id,
          payloadJson: sql<string>`${JSON.stringify({ reason: body.reason })}`.as('payload_json'),
          createdAt: sql<string>`${timestamp}`.as('created_at'),
        })
        .from(assessments)
        .where(and(eq(assessments.id, id), eq(assessments.mutationVersion, mutationVersion))),
    ),
  ])
  if (!updated[0])
    throw conflict('ASSESSMENT_CONFLICT', 'Status asesmen telah berubah. Muat ulang asesmen.')
  return ok(c, { id, status: 'reopened', reopenedAt: timestamp })
})
