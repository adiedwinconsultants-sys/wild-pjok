import type {
  AssessmentStatus,
  IsoDate,
  IsoDateTime,
  MaterialGroup,
  ScoreCategory,
  ScoreKind,
  Sex,
  UserRole,
} from './common'

export type Teacher = {
  id: string
  email: string
  name: string
  nip: string | null
  school: string | null
  role: UserRole
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type AdminUser = Teacher & {
  classCount: number
}

export type Class = {
  id: string
  teacherId: string
  name: string
  gradeLevel: number
  academicYear: string
  notes: string | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type ClassWithCount = Class & { studentCount: number }

export type Student = {
  id: string
  teacherId: string
  classId: string
  fullName: string
  nis: string
  sex: Sex
  birthDate: IsoDate
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type Indicator = {
  id: string
  name: string
  description: string
  unit: string
  kind: ScoreKind
  weight: number
  higherIsBetter: boolean
  required: boolean
  normTable?: NormTable[]
  rubricBands?: RubricBand[]
}

export type RubricBand = {
  min: number
  max: number
  points: number
  label: string
  description: string
}

export type NormPoint = {
  raw: number
  score: number
}

export type NormTable = {
  sex: Sex
  ageMin: number
  ageMax: number
  points: NormPoint[]
}

export type CategoryThreshold = {
  minScore: number
  maxScore: number
  category: ScoreCategory
  label: string
}

export type InstrumentSource = {
  title: string
  author?: string
  year?: number
  publisher?: string
  url?: string
  doi?: string
  note?: string
}

export type ScoringFormula =
  | { type: 'weighted_sum' }
  | { type: 'process_product'; processWeight: number; productWeight: number }

export type Instrument = {
  id: string
  slug: string
  version: number
  group: MaterialGroup
  name: string
  description: string
  purpose: string
  procedure: string[]
  indicators: Indicator[]
  categoryThresholds: CategoryThreshold[]
  sources: InstrumentSource[]
  assessesProcess: boolean
  assessesProduct: boolean
  scoringFormula: ScoringFormula
}

export type Assessment = {
  id: string
  teacherId: string
  classId: string
  instrumentId: string
  instrumentSlug: string
  date: IsoDate
  status: AssessmentStatus
  finalizedAt: IsoDateTime | null
  reopenedAt: IsoDateTime | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type AssessmentScore = {
  id: string
  assessmentId: string
  studentId: string
  indicatorId: string
  rawValue: number
  normalizedValue: number
  kind: ScoreKind
  updatedAt: IsoDateTime
}

export type AssessmentResult = {
  id: string
  assessmentId: string
  studentId: string
  processScore: number | null
  productScore: number | null
  finalScore: number
  category: ScoreCategory
  feedback: string | null
  computedAt: IsoDateTime
}

export type PaginationMeta = {
  page: number
  perPage: number
  total: number
  totalPages: number
}
