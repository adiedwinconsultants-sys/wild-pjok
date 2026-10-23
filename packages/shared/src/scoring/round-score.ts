import { ScoringError } from './errors'

/**
 * Round to 2 decimals, half-up (away from zero for negative values).
 * This is the only place score rounding is allowed.
 */
export function roundScore(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ScoringError('INVALID_NUMBER', 'Nilai harus berupa angka yang valid')
  }
  const sign = value < 0 ? -1 : 1
  const absolute = Math.abs(value)
  const shifted = Number(`${absolute}e2`)
  const rounded = Math.round(shifted) / 100
  return sign * rounded
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ScoringError('INVALID_NUMBER', 'Nilai harus berupa angka yang valid')
  }
  return Math.min(100, Math.max(0, value))
}
