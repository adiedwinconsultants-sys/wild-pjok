import type { ReportData, ReportStudent, ScoreCategory } from '@pjok/shared'
import { SCORE_CATEGORY_LABELS, roundScore } from '@pjok/shared'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db/client'
import {
  assessmentFeedback,
  assessmentResults,
  assessmentScores,
  assessments,
  classes,
  students,
  users,
} from '../db/schema'
import {
  parseInstrumentSnapshot,
  parseParticipantIds,
  requireOwnedAssessment,
} from '../lib/assessment-helpers'
import { notFound } from '../lib/errors'
import { nowIso } from '../lib/time'
import type { AuthUser } from '../types'

export type ReportTarget = { assessmentId?: string; classId?: string }

export async function buildReportData(
  db: Database,
  user: AuthUser,
  target: ReportTarget,
): Promise<{ report: ReportData; assessmentId: string }> {
  let assessmentId = target.assessmentId
  let assessment: Awaited<ReturnType<typeof requireOwnedAssessment>> | undefined

  if (assessmentId) {
    assessment = await requireOwnedAssessment(db, user, assessmentId)
  } else if (target.classId) {
    const rows = await db
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.classId, target.classId),
          eq(assessments.teacherId, user.id),
          sql`${assessments.status} in ('finalized','reopened')`,
        ),
      )
      .orderBy(desc(assessments.date))
      .limit(1)
    assessment = rows[0]
    if (!assessment) {
      throw notFound(
        'ASSESSMENT_NOT_FOUND',
        'Belum ada asesmen final pada kelas ini untuk diekspor',
      )
    }
    assessmentId = assessment.id
  } else {
    throw notFound('ASSESSMENT_NOT_FOUND', 'Asesmen tidak ditemukan')
  }

  const teacherRows = await db
    .select()
    .from(users)
    .where(eq(users.id, assessment.teacherId))
    .limit(1)
  const teacher = teacherRows[0]
  const classRows = await db
    .select()
    .from(classes)
    .where(eq(classes.id, assessment.classId))
    .limit(1)
  const klass = classRows[0]
  if (!teacher || !klass) {
    throw notFound('CLASS_NOT_FOUND', 'Data kelas atau guru tidak ditemukan')
  }

  const instrument = parseInstrumentSnapshot(assessment.instrumentSnapshotJson)
  const participantIds = parseParticipantIds(assessment.participantIdsJson)
  const participantRows =
    participantIds.length > 0
      ? await db.select().from(students).where(inArray(students.id, participantIds))
      : []
  const resultRows = await db
    .select()
    .from(assessmentResults)
    .where(eq(assessmentResults.assessmentId, assessment.id))
  const feedbackRows =
    resultRows.length > 0
      ? await db
          .select()
          .from(assessmentFeedback)
          .where(
            inArray(
              assessmentFeedback.resultId,
              resultRows.map((row) => row.id),
            ),
          )
      : []
  const scoreRows = await db
    .select()
    .from(assessmentScores)
    .where(eq(assessmentScores.assessmentId, assessment.id))

  const resultByStudent = new Map(resultRows.map((row) => [row.studentId, row]))
  const feedbackByResult = new Map(feedbackRows.map((row) => [row.resultId, row.note]))
  const categoryLabels = new Map(
    instrument.categoryThresholds.map((threshold) => [threshold.category, threshold.label]),
  )

  const studentReports: ReportStudent[] = participantRows
    .map((student) => {
      const result = resultByStudent.get(student.id)
      const scores = instrument.indicators.map((indicator) => {
        const score = scoreRows.find(
          (row) => row.studentId === student.id && row.indicatorId === indicator.id,
        )
        return {
          indicatorId: indicator.id,
          rawValue: score?.rawValue ?? null,
          normalizedValue: score?.normalizedValue ?? null,
        }
      })
      const finalScore = result?.finalScore ?? 0
      const category = (result?.category ?? 'perlu_bimbingan') as ScoreCategory
      return {
        id: student.id,
        fullName: student.fullName,
        nis: student.nis,
        sex: student.sex,
        scores,
        processScore: result?.processScore ?? null,
        productScore: result?.productScore ?? null,
        finalScore,
        category,
        categoryLabel: categoryLabels.get(category) ?? SCORE_CATEGORY_LABELS[category],
        feedback: result ? (feedbackByResult.get(result.id) ?? null) : null,
      }
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'id'))

  const scores = studentReports.map((student) => student.finalScore)
  const distribution: Record<ScoreCategory, number> = {
    sangat_baik: 0,
    baik: 0,
    cukup: 0,
    perlu_bimbingan: 0,
  }
  for (const student of studentReports) {
    distribution[student.category] += 1
  }

  return {
    assessmentId: assessment.id,
    report: {
      teacher: { name: teacher.name, nip: teacher.nip, school: teacher.school },
      class: {
        name: klass.name,
        gradeLevel: klass.gradeLevel,
        academicYear: klass.academicYear,
      },
      instrument: {
        slug: instrument.slug,
        name: instrument.name,
        group: instrument.group,
        version: instrument.version,
      },
      date: assessment.date,
      generatedAt: nowIso(),
      indicators: instrument.indicators.map((indicator) => ({
        id: indicator.id,
        name: indicator.name,
        unit: indicator.unit,
        kind: indicator.kind,
        weight: indicator.weight,
      })),
      students: studentReports,
      summary: {
        average:
          scores.length > 0
            ? roundScore(scores.reduce((sum, value) => sum + value, 0) / scores.length)
            : 0,
        min: scores.length > 0 ? Math.min(...scores) : 0,
        max: scores.length > 0 ? Math.max(...scores) : 0,
        distribution,
      },
    },
  }
}

export function reportFileName(report: ReportData, format: 'xlsx' | 'pdf'): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const className = slug(report.class.name) || 'kelas'
  const material = slug(report.instrument.name) || 'materi'
  return `rekap-${className}-${material}-${report.date}.${format}`
}
