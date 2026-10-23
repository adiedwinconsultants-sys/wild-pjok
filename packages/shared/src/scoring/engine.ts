import type { CategoryThreshold, Instrument, ScoreKind, Sex } from '../types'
import { ScoringError } from './errors'
import { normalizeRawValue } from './normalize'
import { clampScore, roundScore } from './round-score'

export type RawScoreInput = {
  indicatorId: string
  rawValue: number
  sex: Sex
  age: number
}

export type IndicatorScore = {
  indicatorId: string
  kind: ScoreKind
  weight: number
  rawValue: number
  normalizedValue: number
  clamped: boolean
}

const WEIGHT_TOLERANCE = 0.0001

export function assertWeightsSumToOne(instrument: Instrument): void {
  const total = instrument.indicators.reduce((sum, indicator) => sum + indicator.weight, 0)
  if (Math.abs(total - 1) > WEIGHT_TOLERANCE) {
    throw new ScoringError(
      'INVALID_WEIGHTS',
      `Total bobot indikator ${instrument.slug} harus 1.0 (saat ini ${total})`,
      { slug: instrument.slug, total },
    )
  }
  if (instrument.scoringFormula.type === 'process_product') {
    const formula = instrument.scoringFormula
    if (Math.abs(formula.processWeight + formula.productWeight - 1) > WEIGHT_TOLERANCE) {
      throw new ScoringError(
        'INVALID_FORMULA',
        `Bobot proses + produk ${instrument.slug} harus 1.0`,
        { slug: instrument.slug },
      )
    }
  }
}

export function computeIndicatorScores(
  instrument: Instrument,
  inputs: RawScoreInput[],
): IndicatorScore[] {
  assertWeightsSumToOne(instrument)

  const known = new Set(instrument.indicators.map((indicator) => indicator.id))
  const seen = new Set<string>()
  const byId = new Map<string, RawScoreInput>()

  for (const input of inputs) {
    if (!known.has(input.indicatorId)) {
      throw new ScoringError(
        'UNKNOWN_INDICATOR',
        `Indikator ${input.indicatorId} tidak ada pada instrumen ${instrument.slug}`,
        { indicatorId: input.indicatorId },
      )
    }
    if (seen.has(input.indicatorId)) {
      throw new ScoringError(
        'DUPLICATE_INDICATOR',
        `Indikator ${input.indicatorId} dikirim lebih dari sekali`,
        { indicatorId: input.indicatorId },
      )
    }
    seen.add(input.indicatorId)
    byId.set(input.indicatorId, input)
  }

  const missing = instrument.indicators
    .filter((indicator) => indicator.required && !byId.has(indicator.id))
    .map((indicator) => indicator.id)

  if (missing.length > 0) {
    throw new ScoringError(
      'MISSING_INDICATOR',
      `Indikator wajib belum diisi: ${missing.join(', ')}`,
      { missing },
    )
  }

  const result: IndicatorScore[] = []
  for (const indicator of instrument.indicators) {
    const input = byId.get(indicator.id)
    if (!input) continue
    const normalized = normalizeRawValue(indicator, input.rawValue, input.sex, input.age)
    result.push({
      indicatorId: indicator.id,
      kind: indicator.kind,
      weight: indicator.weight,
      rawValue: input.rawValue,
      normalizedValue: normalized.value,
      clamped: normalized.clamped,
    })
  }
  return result
}

function weightedAverage(scores: IndicatorScore[]): number | null {
  if (scores.length === 0) return null
  const totalWeight = scores.reduce((sum, score) => sum + score.weight, 0)
  if (totalWeight <= 0) return null
  const total = scores.reduce((sum, score) => sum + score.normalizedValue * score.weight, 0)
  return roundScore(clampScore(total / totalWeight))
}

export function computeProcessProduct(
  instrument: Instrument,
  scores: IndicatorScore[],
): { processScore: number | null; productScore: number | null } {
  assertWeightsSumToOne(instrument)
  return {
    processScore: weightedAverage(scores.filter((score) => score.kind === 'process')),
    productScore: weightedAverage(scores.filter((score) => score.kind === 'product')),
  }
}

export function computeFinalScore(instrument: Instrument, scores: IndicatorScore[]): number {
  assertWeightsSumToOne(instrument)

  if (instrument.scoringFormula.type === 'weighted_sum') {
    const value = weightedAverage(scores)
    if (value === null) {
      throw new ScoringError('MISSING_INDICATOR', 'Tidak ada nilai untuk dihitung')
    }
    return value
  }

  const { processScore, productScore } = computeProcessProduct(instrument, scores)
  const formula = instrument.scoringFormula
  if (processScore === null && productScore === null) {
    throw new ScoringError('MISSING_INDICATOR', 'Tidak ada nilai untuk dihitung')
  }
  if (processScore === null) return roundScore(clampScore(productScore ?? 0))
  if (productScore === null) return roundScore(clampScore(processScore))
  return roundScore(
    clampScore(processScore * formula.processWeight + productScore * formula.productWeight),
  )
}

export function resolveCategory(instrument: Instrument, finalScore: number): CategoryThreshold {
  if (!Number.isFinite(finalScore) || finalScore < 0 || finalScore > 100) {
    throw new ScoringError(
      'SCORE_OUT_OF_RANGE',
      `Nilai akhir ${finalScore} berada di luar rentang 0–100`,
    )
  }
  const matches = instrument.categoryThresholds.filter(
    (item) => finalScore >= item.minScore && finalScore <= item.maxScore,
  )
  const threshold = matches.sort((a, b) => b.minScore - a.minScore)[0]
  if (!threshold) {
    throw new ScoringError(
      'CATEGORY_NOT_FOUND',
      `Kategori untuk nilai ${finalScore} tidak ditemukan pada ${instrument.slug}`,
      { finalScore },
    )
  }
  return threshold
}

export function validateCompleteness(
  instrument: Instrument,
  scores: Pick<IndicatorScore, 'indicatorId'>[],
): string[] {
  const present = new Set(scores.map((score) => score.indicatorId))
  return instrument.indicators
    .filter((indicator) => indicator.required && !present.has(indicator.id))
    .map((indicator) => indicator.id)
}

export type ComputedAssessment = {
  scores: IndicatorScore[]
  processScore: number | null
  productScore: number | null
  finalScore: number
  category: CategoryThreshold
}

export function computeAssessment(
  instrument: Instrument,
  inputs: RawScoreInput[],
): ComputedAssessment {
  const scores = computeIndicatorScores(instrument, inputs)
  const { processScore, productScore } = computeProcessProduct(instrument, scores)
  const finalScore = computeFinalScore(instrument, scores)
  return {
    scores,
    processScore,
    productScore,
    finalScore,
    category: resolveCategory(instrument, finalScore),
  }
}
