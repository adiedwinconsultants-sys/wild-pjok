import { feedbackInputSchema } from '@pjok/shared'
import { SCORE_CATEGORY_LABELS } from '@pjok/shared'
import type { Instrument } from '@pjok/shared'
import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { assessmentFeedback, assessmentResults, assessmentScores } from '../db/schema'
import {
  loadAssessmentParticipants,
  parseInstrumentSnapshot,
  requireOwnedAssessment,
} from '../lib/assessment-helpers'
import { AppError, conflict, notFound } from '../lib/errors'
import { ok, parseBody, parseParam } from '../lib/http'
import { nowIso } from '../lib/time'
import { requireAuth } from '../middleware/auth'
import type { AppBindings } from '../types'

export const assessmentResultRoutes = new Hono<AppBindings>()
assessmentResultRoutes.use('*', requireAuth)

assessmentResultRoutes.get('/:id/results', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const id = parseParam(c, 'id')
  const assessment = await requireOwnedAssessment(db, user, id)
  const instrument = parseInstrumentSnapshot(assessment.instrumentSnapshotJson)

  const results = await db
    .select()
    .from(assessmentResults)
    .where(eq(assessmentResults.assessmentId, id))
  const resultIds = results.map((row) => row.id)
  const feedbackRows =
    resultIds.length > 0
      ? await db
          .select()
          .from(assessmentFeedback)
          .where(inArray(assessmentFeedback.resultId, resultIds))
      : []
  const scoreRows = await db
    .select()
    .from(assessmentScores)
    .where(eq(assessmentScores.assessmentId, id))
  const studentRows = await loadAssessmentParticipants(db, assessment)
  const allowed = new Set(studentRows.map((row) => row.id))
  if (
    results.some((row) => !allowed.has(row.studentId)) ||
    scoreRows.some((row) => !allowed.has(row.studentId))
  ) {
    throw new AppError(
      409,
      'ASSESSMENT_PARTICIPANTS_INVALID',
      'Daftar peserta asesmen tidak sesuai dengan kelas. Hubungi administrator.',
    )
  }
  const studentMap = new Map(studentRows.map((student) => [student.id, student]))
  const feedbackMap = new Map(feedbackRows.map((row) => [row.resultId, row.note]))

  const indicatorMap = new Map(instrument.indicators.map((indicator) => [indicator.id, indicator]))
  const data = results.map((result) => {
    const student = studentMap.get(result.studentId)
    const studentScores = scoreRows
      .filter((score) => score.studentId === result.studentId)
      .map((score) => {
        const indicator = indicatorMap.get(score.indicatorId)
        return {
          indicatorId: score.indicatorId,
          indicatorName: indicator?.name ?? score.indicatorId,
          unit: indicator?.unit ?? '',
          kind: score.kind,
          rawValue: score.rawValue,
          normalizedValue: score.normalizedValue,
        }
      })
    return {
      resultId: result.id,
      studentId: result.studentId,
      fullName: student?.fullName ?? '',
      nis: student?.nis ?? '',
      processScore: result.processScore,
      productScore: result.productScore,
      finalScore: result.finalScore,
      category: result.category,
      categoryLabel: resolveLabel(instrument, result.category),
      feedback: feedbackMap.get(result.id) ?? null,
      computedAt: result.computedAt,
      scores: studentScores,
    }
  })

  return ok(c, { assessmentId: id, instrument, results: data })
})

export const resultRoutes = new Hono<AppBindings>()
resultRoutes.use('*', requireAuth)

resultRoutes.put('/:id/feedback', async (c) => {
  const db = c.get('db')
  const user = c.get('user')
  const resultId = parseParam(c, 'id')
  const body = await parseBody(c, feedbackInputSchema)

  const resultRows = await db
    .select()
    .from(assessmentResults)
    .where(eq(assessmentResults.id, resultId))
    .limit(1)
  const result = resultRows[0]
  if (!result) {
    throw notFound('RESULT_NOT_FOUND', 'Hasil asesmen tidak ditemukan')
  }
  const assessment = await requireOwnedAssessment(db, user, result.assessmentId)
  if (assessment.status === 'draft') {
    throw conflict(
      'ASSESSMENT_NOT_FINALIZED',
      'Umpan balik hanya dapat diisi setelah asesmen difinalisasi',
    )
  }

  const timestamp = nowIso()
  await db
    .insert(assessmentFeedback)
    .values({ id: crypto.randomUUID(), resultId, note: body.note, updatedAt: timestamp })
    .onConflictDoUpdate({
      target: assessmentFeedback.resultId,
      set: { note: body.note, updatedAt: timestamp },
    })

  return ok(c, { resultId, note: body.note, updatedAt: timestamp })
})

function resolveLabel(
  instrument: Instrument,
  category: keyof typeof SCORE_CATEGORY_LABELS,
): string {
  const threshold = instrument.categoryThresholds.find((item) => item.category === category)
  return threshold?.label ?? SCORE_CATEGORY_LABELS[category]
}
