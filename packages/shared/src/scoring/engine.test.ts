import { describe, expect, it } from 'vitest'
import type { Indicator, Instrument } from '../types'
import {
  computeAssessment,
  computeFinalScore,
  computeIndicatorScores,
  computeProcessProduct,
  resolveCategory,
  validateCompleteness,
} from './engine'
import { ScoringError } from './errors'

const norm = (
  id: string,
  weight: number,
  kind: 'process' | 'product',
  points: Array<[number, number]>,
): Indicator => ({
  id,
  name: id,
  description: id,
  unit: 'skor',
  kind,
  weight,
  higherIsBetter: true,
  required: true,
  normTable: [
    {
      sex: 'L',
      ageMin: 10,
      ageMax: 18,
      points: points.map(([raw, score]) => ({ raw, score })),
    },
  ],
})

const instrument: Instrument = {
  id: 'demo',
  slug: 'demo',
  version: 1,
  group: 'kebugaran_jasmani',
  name: 'Demo',
  description: 'demo',
  purpose: 'demo',
  procedure: ['demo'],
  indicators: [
    norm('a', 0.5, 'product', [
      [0, 0],
      [100, 100],
    ]),
    norm('b', 0.5, 'product', [
      [0, 0],
      [100, 100],
    ]),
  ],
  categoryThresholds: [
    { minScore: 0, maxScore: 60, category: 'perlu_bimbingan', label: 'Perlu Bimbingan' },
    { minScore: 60, maxScore: 75, category: 'cukup', label: 'Cukup' },
    { minScore: 75, maxScore: 90, category: 'baik', label: 'Baik' },
    { minScore: 90, maxScore: 100, category: 'sangat_baik', label: 'Sangat Baik' },
  ],
  sources: [{ title: 'Demo', year: 2024 }],
  assessesProcess: false,
  assessesProduct: true,
  scoringFormula: { type: 'weighted_sum' },
}

describe('computeIndicatorScores', () => {
  it('menghitung semua indikator', () => {
    const scores = computeIndicatorScores(instrument, [
      { indicatorId: 'a', rawValue: 100, sex: 'L', age: 14 },
      { indicatorId: 'b', rawValue: 50, sex: 'L', age: 14 },
    ])
    expect(scores).toHaveLength(2)
    expect(scores[0]?.normalizedValue).toBe(100)
    expect(scores[1]?.normalizedValue).toBe(50)
  })

  it('melempar error terkontrol bila indikator wajib hilang', () => {
    try {
      computeIndicatorScores(instrument, [{ indicatorId: 'a', rawValue: 100, sex: 'L', age: 14 }])
      expect.fail('harus melempar')
    } catch (error) {
      expect(error).toBeInstanceOf(ScoringError)
      const scoringError = error as ScoringError
      expect(scoringError.code).toBe('MISSING_INDICATOR')
      expect(scoringError.details?.missing).toEqual(['b'])
    }
  })

  it('menolak indikator yang tidak dikenal', () => {
    expect(() =>
      computeIndicatorScores(instrument, [
        { indicatorId: 'a', rawValue: 100, sex: 'L', age: 14 },
        { indicatorId: 'b', rawValue: 100, sex: 'L', age: 14 },
        { indicatorId: 'z', rawValue: 100, sex: 'L', age: 14 },
      ]),
    ).toThrow(ScoringError)
  })
})

describe('computeFinalScore', () => {
  it('menghitung weighted sum', () => {
    const scores = computeIndicatorScores(instrument, [
      { indicatorId: 'a', rawValue: 100, sex: 'L', age: 14 },
      { indicatorId: 'b', rawValue: 50, sex: 'L', age: 14 },
    ])
    expect(computeFinalScore(instrument, scores)).toBe(75)
  })

  it('menolak total bobot yang tidak 1.0', () => {
    const broken: Instrument = {
      ...instrument,
      indicators: [
        norm('a', 0.5, 'product', [
          [0, 0],
          [100, 100],
        ]),
        norm('b', 0.4, 'product', [
          [0, 0],
          [100, 100],
        ]),
      ],
    }
    expect(() => computeFinalScore(broken, [])).toThrow(ScoringError)
  })

  it('menghitung formula process_product', () => {
    const mixed: Instrument = {
      ...instrument,
      indicators: [
        norm('p', 0.4, 'process', [
          [0, 0],
          [100, 100],
        ]),
        norm('q', 0.6, 'product', [
          [0, 0],
          [100, 100],
        ]),
      ],
      assessesProcess: true,
      scoringFormula: { type: 'process_product', processWeight: 0.4, productWeight: 0.6 },
    }
    const scores = computeIndicatorScores(mixed, [
      { indicatorId: 'p', rawValue: 100, sex: 'L', age: 14 },
      { indicatorId: 'q', rawValue: 50, sex: 'L', age: 14 },
    ])
    const kindScores = computeProcessProduct(mixed, scores)
    expect(kindScores.processScore).toBe(100)
    expect(kindScores.productScore).toBe(50)
    expect(computeFinalScore(mixed, scores)).toBe(70)
  })
})

describe('resolveCategory', () => {
  it('mengembalikan kategori sesuai ambang', () => {
    expect(resolveCategory(instrument, 59.99).category).toBe('perlu_bimbingan')
    expect(resolveCategory(instrument, 60).category).toBe('cukup')
    expect(resolveCategory(instrument, 75).category).toBe('baik')
    expect(resolveCategory(instrument, 90).category).toBe('sangat_baik')
    expect(resolveCategory(instrument, 100).category).toBe('sangat_baik')
  })

  it('menolak nilai di luar 0-100', () => {
    expect(() => resolveCategory(instrument, 101)).toThrow(ScoringError)
  })
})

describe('validateCompleteness', () => {
  it('mengembalikan indikator yang kosong', () => {
    expect(validateCompleteness(instrument, [{ indicatorId: 'a' }])).toEqual(['b'])
    expect(validateCompleteness(instrument, [{ indicatorId: 'a' }, { indicatorId: 'b' }])).toEqual(
      [],
    )
  })
})

describe('computeAssessment', () => {
  it('menggabungkan skor, kategori, dan agregat', () => {
    const result = computeAssessment(instrument, [
      { indicatorId: 'a', rawValue: 100, sex: 'L', age: 14 },
      { indicatorId: 'b', rawValue: 80, sex: 'L', age: 14 },
    ])
    expect(result.finalScore).toBe(90)
    expect(result.category.category).toBe('sangat_baik')
    expect(result.productScore).toBe(90)
    expect(result.processScore).toBeNull()
  })
})
