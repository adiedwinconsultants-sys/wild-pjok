export const USER_ROLES = ['teacher', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export const MATERIAL_GROUPS = ['bola_besar', 'atletik', 'kebugaran_jasmani', 'tksi'] as const
export type MaterialGroup = (typeof MATERIAL_GROUPS)[number]

export const ASSESSMENT_STATUSES = ['draft', 'finalized', 'reopened'] as const
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number]

export const SCORE_CATEGORIES = ['sangat_baik', 'baik', 'cukup', 'perlu_bimbingan'] as const
export type ScoreCategory = (typeof SCORE_CATEGORIES)[number]

export const SCORE_KINDS = ['process', 'product'] as const
export type ScoreKind = (typeof SCORE_KINDS)[number]

export const SEXES = ['L', 'P'] as const
export type Sex = (typeof SEXES)[number]

export const INDICATOR_UNITS = [
  'detik',
  'menit',
  'meter',
  'sentimeter',
  'kilogram',
  'repetisi',
  'skor',
  'kali',
] as const
export type IndicatorUnit = (typeof INDICATOR_UNITS)[number]

export const MATERIAL_GROUP_LABELS: Record<MaterialGroup, string> = {
  bola_besar: 'Permainan Bola Besar',
  atletik: 'Atletik',
  kebugaran_jasmani: 'Kebugaran Jasmani',
  tksi: 'TKSI',
}

export const SCORE_CATEGORY_LABELS: Record<ScoreCategory, string> = {
  sangat_baik: 'Sangat Baik',
  baik: 'Baik',
  cukup: 'Cukup',
  perlu_bimbingan: 'Perlu Bimbingan',
}

export const SCORE_KIND_LABELS: Record<ScoreKind, string> = {
  process: 'Penilaian Proses',
  product: 'Penilaian Produk',
}

/** Timestamps are ISO 8601 UTC strings; dates are YYYY-MM-DD. */
export type IsoDateTime = string
export type IsoDate = string
