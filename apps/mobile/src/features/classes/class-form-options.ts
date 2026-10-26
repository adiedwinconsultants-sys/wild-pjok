import { academicYearSchema } from '@pjok/shared'

export const gradeOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}))

const ROMAN_GRADES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export function classNameOptions(gradeLevel: number) {
  const prefix = ROMAN_GRADES[gradeLevel - 1] ?? String(gradeLevel)
  return ['A', 'B', 'C'].map((section) => ({
    value: `${prefix} ${section}`,
    label: `${prefix} ${section}`,
  }))
}

export function shiftAcademicYear(value: string, step: number): string {
  if (!academicYearSchema.safeParse(value).success) return value
  const start = Number(value.slice(0, 4)) + step
  if (start < 0 || start > 9998) return value
  return `${String(start).padStart(4, '0')}/${String(start + 1).padStart(4, '0')}`
}
