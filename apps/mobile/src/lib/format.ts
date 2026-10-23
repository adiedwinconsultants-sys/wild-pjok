import {
  MATERIAL_GROUP_LABELS,
  type MaterialGroup,
  SCORE_CATEGORY_LABELS,
  SCORE_KIND_LABELS,
  type ScoreCategory,
  type ScoreKind,
} from '@pjok/shared'

export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-')
  if (!year || !month || !day) return value
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ]
  const monthName = months[Number(month) - 1]
  return monthName ? `${Number(day)} ${monthName} ${year}` : value
}

export function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 10)
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function groupLabel(group: MaterialGroup): string {
  return MATERIAL_GROUP_LABELS[group]
}

export function categoryLabel(category: ScoreCategory): string {
  return SCORE_CATEGORY_LABELS[category]
}

export function kindLabel(kind: ScoreKind): string {
  return SCORE_KIND_LABELS[kind]
}

export function academicYearNow(): string {
  const year = new Date().getFullYear()
  const month = new Date().getMonth() + 1
  const start = month >= 7 ? year : year - 1
  return `${start}/${start + 1}`
}
