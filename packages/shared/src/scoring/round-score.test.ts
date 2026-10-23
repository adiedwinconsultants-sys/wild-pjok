import { describe, expect, it } from 'vitest'
import { ScoringError } from './errors'
import { roundScore } from './round-score'

describe('roundScore', () => {
  it('membulatkan 2 desimal half-up', () => {
    expect(roundScore(1.005)).toBe(1.01)
    expect(roundScore(2.675)).toBe(2.68)
    expect(roundScore(85.555)).toBe(85.56)
    expect(roundScore(0.004)).toBe(0)
    expect(roundScore(12.344)).toBe(12.34)
  })

  it('menangani nilai negatif half-up', () => {
    expect(roundScore(-1.005)).toBe(-1.01)
    expect(roundScore(-2.344)).toBe(-2.34)
  })

  it('menolak NaN dan Infinity', () => {
    expect(() => roundScore(Number.NaN)).toThrow(ScoringError)
    expect(() => roundScore(Number.POSITIVE_INFINITY)).toThrow(ScoringError)
  })
})
