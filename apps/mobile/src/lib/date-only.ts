import { isoDateSchema } from '@pjok/shared'

export function parseDateOnly(value: string): Date | null {
  if (!isoDateSchema.safeParse(value).success) return null
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(12, 0, 0, 0)
  return date
}

export function dateOnlyValue(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export type DateFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  disabled?: boolean
}
