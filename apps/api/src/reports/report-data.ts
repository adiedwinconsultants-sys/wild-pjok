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
import { AppError, notFound } from '../lib/errors'
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

  if (assessment.status !== 'finalized' && assessment.status !== 'reopened') {
    throw new AppError(
      409,
      'ASSESSMENT_NOT_FINALIZED',
      'Laporan hanya tersedia untuk asesmen yang sudah difinalisasi',
    )
  }

  const teacherRows = await db
    .select({ name: users.name, nip: users.nip, school: users.school })
    .from(users)
    .where(eq(users.id, assessment.teacherId))
    .limit(1)
  const teacher = teacherRows[0]
  const classRows = await db
    .select({
      name: classes.name,
      gradeLevel: classes.gradeLevel,
      academicYear: classes.academicYear,
    })
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
      ? await db
          .select({
            id: students.id,
            fullName: students.fullName,
            nis: students.nis,
            sex: students.sex,
          })
          .from(students)
          .where(
            and(
              inArray(students.id, participantIds),
              eq(students.classId, assessment.classId),
              eq(students.teacherId, assessment.teacherId),
            ),
          )
      : []
  const resultRows = await db
    .select({
      id: assessmentResults.id,
      studentId: assessmentResults.studentId,
      processScore: assessmentResults.processScore,
      productScore: assessmentResults.productScore,
      finalScore: assessmentResults.finalScore,
      category: assessmentResults.category,
    })
    .from(assessmentResults)
    .where(eq(assessmentResults.assessmentId, assessment.id))
  const feedbackRows =
    resultRows.length > 0
      ? await db
          .select({ resultId: assessmentFeedback.resultId, note: assessmentFeedback.note })
          .from(assessmentFeedback)
          .where(
            inArray(
              assessmentFeedback.resultId,
              resultRows.map((row) => row.id),
            ),
          )
      : []
  const scoreRows = await db
    .select({
      studentId: assessmentScores.studentId,
      indicatorId: assessmentScores.indicatorId,
      rawValue: assessmentScores.rawValue,
      normalizedValue: assessmentScores.normalizedValue,
    })
    .from(assessmentScores)
    .where(eq(assessmentScores.assessmentId, assessment.id))

  const scoreByStudent = new Map<string, Map<string, (typeof scoreRows)[number]>>()
  for (const score of scoreRows) {
    const scoresByIndicator = scoreByStudent.get(score.studentId)
    if (scoresByIndicator) {
      scoresByIndicator.set(score.indicatorId, score)
    } else {
      scoreByStudent.set(score.studentId, new Map([[score.indicatorId, score]]))
    }
  }
  const resultByStudent = new Map(resultRows.map((row) => [row.studentId, row]))
  const feedbackByResult = new Map(feedbackRows.map((row) => [row.resultId, row.note]))
  const categoryLabels = new Map(
    instrument.categoryThresholds.map((threshold) => [threshold.category, threshold.label]),
  )

  const studentReports: ReportStudent[] = participantRows
    .map((student) => {
      const result = resultByStudent.get(student.id)
      const studentScores = scoreByStudent.get(student.id)
      const scores = instrument.indicators.map((indicator) => {
        const score = studentScores?.get(indicator.id)
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

  const distribution: Record<ScoreCategory, number> = {
    sangat_baik: 0,
    baik: 0,
    cukup: 0,
    perlu_bimbingan: 0,
  }
  let scoreTotal = 0
  let minScore = Number.POSITIVE_INFINITY
  let maxScore = Number.NEGATIVE_INFINITY
  for (const student of studentReports) {
    distribution[student.category] += 1
    scoreTotal += student.finalScore
    minScore = Math.min(minScore, student.finalScore)
    maxScore = Math.max(maxScore, student.finalScore)
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
        average: studentReports.length > 0 ? roundScore(scoreTotal / studentReports.length) : 0,
        min: studentReports.length > 0 ? minScore : 0,
        max: studentReports.length > 0 ? maxScore : 0,
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
