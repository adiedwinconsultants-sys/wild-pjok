import { ScoringError, computeAssessment } from '@pjok/shared'
import type { Instrument, RawScoreInput } from '@pjok/shared'
import { eq } from 'drizzle-orm'
import type { Database } from '../db/client'
import { assessmentScores } from '../db/schema'
import { loadAssessmentParticipants } from './assessment-helpers'
import { ageAt } from './time'

type ScoreRow = typeof assessmentScores.$inferSelect

export function groupScoresByStudent(rows: ScoreRow[]): Map<string, ScoreRow[]> {
  const map = new Map<string, ScoreRow[]>()
  for (const row of rows) {
    const list = map.get(row.studentId) ?? []
    list.push(row)
    map.set(row.studentId, list)
  }
  return map
}

export function buildInputs(
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

export async function buildPreview(
  db: Database,
  assessment: {
    id: string
    date: string
    participantIdsJson: string
    classId: string
    teacherId: string
  },
  instrument: Instrument,
) {
  const participants = await loadAssessmentParticipants(db, assessment)
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
