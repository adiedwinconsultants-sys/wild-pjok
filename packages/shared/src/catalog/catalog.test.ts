import { describe, expect, it } from 'vitest'
import { computeAssessment } from '../scoring'
import type { RawScoreInput } from '../scoring'
import type { Instrument } from '../types'
import { INSTRUMENTS } from './index'
import { validateCatalog } from './validators'

describe('katalog instrumen', () => {
  it('seluruh instrumen lolos validator', () => {
    expect(validateCatalog(INSTRUMENTS)).toEqual([])
  })

  it('memuat minimal 12 instrumen dan keempat kelompok materi', () => {
    expect(INSTRUMENTS.length).toBeGreaterThanOrEqual(12)
    const groups = new Set(INSTRUMENTS.map((instrument) => instrument.group))
    expect(groups).toEqual(new Set(['bola_besar', 'atletik', 'kebugaran_jasmani', 'tksi']))
  })

  it('setiap instrumen punya sumber, prosedur, dan ambang menutup 0-100', () => {
    for (const instrument of INSTRUMENTS) {
      expect(instrument.sources.length).toBeGreaterThan(0)
      expect(instrument.procedure.length).toBeGreaterThan(0)
      const thresholds = [...instrument.categoryThresholds].sort((a, b) => a.minScore - b.minScore)
      expect(thresholds[0]?.minScore).toBe(0)
      expect(thresholds[thresholds.length - 1]?.maxScore).toBe(100)
    }
  })

  it('menghitung satu kasus per instrumen', () => {
    for (const instrument of INSTRUMENTS) {
      const inputs = sampleInputs(instrument)
      const result = computeAssessment(instrument, inputs)
      expect(result.finalScore).toBeGreaterThanOrEqual(0)
      expect(result.finalScore).toBeLessThanOrEqual(100)
      expect(result.category.label.length).toBeGreaterThan(0)
    }
  })
})

function sampleInputs(instrument: Instrument): RawScoreInput[] {
  return instrument.indicators.map((indicator) => {
    if (indicator.rubricBands && indicator.rubricBands.length > 0) {
      const band = indicator.rubricBands[Math.min(2, indicator.rubricBands.length - 1)]
      return {
        indicatorId: indicator.id,
        rawValue: ((band?.min ?? 0) + (band?.max ?? 100)) / 2,
        sex: 'L',
        age: 14,
      }
    }
    const table = indicator.normTable?.find(
      (item) => item.sex === 'L' && 14 >= item.ageMin && 14 <= item.ageMax,
    )
    const point = table?.points[2] ?? table?.points[0]
    return {
      indicatorId: indicator.id,
      rawValue: point?.raw ?? 0,
      sex: 'L',
      age: 14,
    }
  })
}
