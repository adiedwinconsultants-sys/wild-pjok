import type { Indicator, NormTable, RubricBand, Sex } from '../types'
import { ScoringError } from './errors'
import { clampScore, roundScore } from './round-score'

export type NormalizationResult = {
  value: number
  clamped: boolean
  source: 'norm' | 'rubric'
}

export function normalizeRawValue(
  indicator: Indicator,
  rawValue: number,
  sex: Sex,
  age: number,
): NormalizationResult {
  if (!Number.isFinite(rawValue)) {
    throw new ScoringError('INVALID_NUMBER', `Nilai ${indicator.id} bukan angka yang valid`)
  }
  if (indicator.rubricBands && indicator.rubricBands.length > 0) {
    return scoreFromRubric(indicator, rawValue)
  }
  if (indicator.normTable && indicator.normTable.length > 0) {
    return normalizeFromNormTable(indicator, rawValue, sex, age)
  }
  throw new ScoringError(
    'NORM_NOT_FOUND',
    `Indikator ${indicator.id} tidak memiliki tabel norma atau rubrik`,
  )
}

function normalizeFromNormTable(
  indicator: Indicator,
  rawValue: number,
  sex: Sex,
  age: number,
): NormalizationResult {
  const tables = indicator.normTable ?? []
  const sexTables = tables.filter((table) => table.sex === sex)
  if (sexTables.length === 0) {
    throw new ScoringError('NORM_NOT_FOUND', `Norma untuk ${indicator.id} tidak tersedia`)
  }

  let table: NormTable | undefined = sexTables.find(
    (candidate) => age >= candidate.ageMin && age <= candidate.ageMax,
  )
  let ageOutOfRange = false
  if (!table) {
    ageOutOfRange = true
    table = [...sexTables].sort((a, b) => distanceToRange(age, a) - distanceToRange(age, b))[0]
  }
  if (!table || table.points.length === 0) {
    throw new ScoringError('NORM_NOT_FOUND', `Norma untuk ${indicator.id} tidak tersedia`)
  }

  const points = table.points
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) {
    throw new ScoringError('NORM_INVALID', `Norma ${indicator.id} kosong`)
  }

  let value: number
  let clamped = ageOutOfRange

  if (rawValue <= first.raw) {
    value = first.score
    clamped = clamped || rawValue < first.raw
  } else if (rawValue >= last.raw) {
    value = last.score
    clamped = clamped || rawValue > last.raw
  } else {
    let interpolated = last.score
    for (let index = 1; index < points.length; index += 1) {
      const upper = points[index]
      const lower = points[index - 1]
      if (!upper || !lower) continue
      if (rawValue <= upper.raw) {
        const span = upper.raw - lower.raw
        const ratio = span === 0 ? 0 : (rawValue - lower.raw) / span
        interpolated = lower.score + ratio * (upper.score - lower.score)
        break
      }
    }
    value = interpolated
  }

  return {
    value: roundScore(clampScore(value)),
    clamped,
    source: 'norm',
  }
}

function distanceToRange(age: number, table: NormTable): number {
  if (age < table.ageMin) return table.ageMin - age
  if (age > table.ageMax) return age - table.ageMax
  return 0
}

export function scoreFromRubric(indicator: Indicator, rawValue: number): NormalizationResult {
  const bands = indicator.rubricBands
  if (!bands || bands.length === 0) {
    throw new ScoringError('RUBRIC_NOT_FOUND', `Indikator ${indicator.id} tidak memiliki rubrik`)
  }
  if (!Number.isFinite(rawValue)) {
    throw new ScoringError('INVALID_NUMBER', `Nilai ${indicator.id} bukan angka yang valid`)
  }

  const sorted = [...bands].sort((a, b) => a.min - b.min)
  const match = findBand(sorted, rawValue)
  if (match) {
    return { value: roundScore(clampScore(match.points)), clamped: false, source: 'rubric' }
  }

  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (!first || !last) {
    throw new ScoringError('RUBRIC_NOT_FOUND', `Rubrik ${indicator.id} kosong`)
  }
  if (rawValue < first.min) {
    return { value: roundScore(clampScore(first.points)), clamped: true, source: 'rubric' }
  }
  return { value: roundScore(clampScore(last.points)), clamped: true, source: 'rubric' }
}

function findBand(bands: RubricBand[], rawValue: number): RubricBand | undefined {
  return bands.find((band) => rawValue >= band.min && rawValue <= band.max)
}
