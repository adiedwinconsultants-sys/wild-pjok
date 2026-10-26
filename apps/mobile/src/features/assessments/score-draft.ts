import { z } from 'zod'
import type { AssessmentDetail } from './hooks'

export type DraftValues = Record<string, string>
const draftSchema = z.record(z.string(), z.string().max(80))

export function scoreKey(studentId: string, indicatorId: string): string {
  return `${studentId}:${indicatorId}`
}

export function restoreScoreDraft(assessment: AssessmentDetail, cached: unknown) {
  const server: DraftValues = {}
  for (const score of assessment.scores) {
    server[scoreKey(score.studentId, score.indicatorId)] = String(score.rawValue)
  }
  const local = draftSchema.safeParse(cached)
  const values: DraftValues = {}
  let conflict = false
  let dirty = false
  if (assessment.status !== 'finalized' && local.success) {
    for (const student of assessment.participants) {
      for (const indicator of assessment.instrument.indicators) {
        const key = scoreKey(student.id, indicator.id)
        const value = local.data[key]
        if (value === undefined) continue
        if (server[key] !== undefined) {
          if (value.trim() !== '' && Number(value) !== Number(server[key])) conflict = true
        } else {
          values[key] = value
          if (value.trim() !== '') dirty = true
        }
      }
    }
  }
  return { values: { ...values, ...server }, conflict, dirty }
}
