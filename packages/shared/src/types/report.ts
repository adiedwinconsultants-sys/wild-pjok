import type { IsoDate, MaterialGroup, ScoreCategory, ScoreKind, Sex } from './common'

export type ReportTeacher = {
  name: string
  nip: string | null
  school: string | null
}

export type ReportClass = {
  name: string
  gradeLevel: number
  academicYear: string
}

export type ReportInstrument = {
  slug: string
  name: string
  group: MaterialGroup
  version: number
}

export type ReportIndicator = {
  id: string
  name: string
  unit: string
  kind: ScoreKind
  weight: number
}

export type ReportStudent = {
  id: string
  fullName: string
  nis: string
  sex: Sex
  scores: Array<{
    indicatorId: string
    rawValue: number | null
    normalizedValue: number | null
  }>
  processScore: number | null
  productScore: number | null
  finalScore: number
  category: ScoreCategory
  categoryLabel: string
  feedback: string | null
}

export type ReportData = {
  teacher: ReportTeacher
  class: ReportClass
  instrument: ReportInstrument
  date: IsoDate
  generatedAt: string
  indicators: ReportIndicator[]
  students: ReportStudent[]
  summary: {
    average: number
    min: number
    max: number
    distribution: Record<ScoreCategory, number>
  }
}
