export type ScoringErrorCode =
  | 'INVALID_NUMBER'
  | 'MISSING_INDICATOR'
  | 'DUPLICATE_INDICATOR'
  | 'UNKNOWN_INDICATOR'
  | 'NORM_NOT_FOUND'
  | 'NORM_INVALID'
  | 'RUBRIC_NOT_FOUND'
  | 'INVALID_WEIGHTS'
  | 'INVALID_FORMULA'
  | 'CATEGORY_NOT_FOUND'
  | 'SCORE_OUT_OF_RANGE'

export class ScoringError extends Error {
  readonly code: ScoringErrorCode
  readonly details?: Record<string, unknown>

  constructor(code: ScoringErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ScoringError'
    this.code = code
    if (details !== undefined) {
      this.details = details
    }
  }
}
