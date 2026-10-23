import { describe, expect, it } from 'vitest'
import type { Indicator } from '../types'
import { ScoringError } from './errors'
import { normalizeRawValue, scoreFromRubric } from './normalize'

const normIndicator: Indicator = {
  id: 'lompat',
  name: 'Lompat',
  description: 'uji',
  unit: 'sentimeter',
  kind: 'product',
  weight: 1,
  higherIsBetter: true,
  required: true,
  normTable: [
    {
      sex: 'L',
      ageMin: 13,
      ageMax: 15,
      points: [
        { raw: 100, score: 0 },
        { raw: 200, score: 100 },
      ],
    },
    {
      sex: 'P',
      ageMin: 13,
      ageMax: 15,
      points: [
        { raw: 80, score: 100 },
        { raw: 160, score: 0 },
      ],
    },
  ],
}

const rubricIndicator: Indicator = {
  id: 'passing',
  name: 'Passing',
  description: 'uji',
  unit: 'skor',
  kind: 'process',
  weight: 1,
  higherIsBetter: true,
  required: true,
  rubricBands: [
    { min: 0, max: 55, points: 50, label: 'Kurang', description: 'a' },
    { min: 55, max: 70, points: 65, label: 'Cukup', description: 'b' },
    { min: 70, max: 85, points: 80, label: 'Baik', description: 'c' },
    { min: 85, max: 100, points: 95, label: 'Sangat Baik', description: 'd' },
  ],
}

describe('normalizeRawValue', () => {
  it('melakukan interpolasi linear', () => {
    const result = normalizeRawValue(normIndicator, 150, 'L', 14)
    expect(result.value).toBe(50)
    expect(result.clamped).toBe(false)
  })

  it('meng-clamp nilai di bawah dan di atas rentang', () => {
    expect(normalizeRawValue(normIndicator, 50, 'L', 14)).toEqual({
      value: 0,
      clamped: true,
      source: 'norm',
    })
    expect(normalizeRawValue(normIndicator, 250, 'L', 14).value).toBe(100)
  })

  it('mendukung higherIsBetter=false', () => {
    const result = normalizeRawValue(normIndicator, 120, 'P', 14)
    expect(result.value).toBe(50)
  })

  it('meng-clamp umur di luar tabel dan menandai hasil', () => {
    const result = normalizeRawValue(normIndicator, 150, 'L', 30)
    expect(result.clamped).toBe(true)
    expect(result.value).toBe(50)
  })

  it('menolak indikator tanpa norma/rubrik', () => {
    const { normTable: _normTable, ...withoutNorm } = normIndicator
    expect(() => normalizeRawValue(withoutNorm, 120, 'L', 14)).toThrow(ScoringError)
  })
})

describe('scoreFromRubric', () => {
  it('memilih band yang sesuai', () => {
    expect(scoreFromRubric(rubricIndicator, 60).value).toBe(65)
    expect(scoreFromRubric(rubricIndicator, 90).value).toBe(95)
  })

  it('meng-clamp ke band terdekat', () => {
    expect(scoreFromRubric(rubricIndicator, -5)).toEqual({
      value: 50,
      clamped: true,
      source: 'rubric',
    })
    expect(scoreFromRubric(rubricIndicator, 150).value).toBe(95)
  })
})
