export { ScoringError } from './errors'
export type { ScoringErrorCode } from './errors'
export { clampScore, roundScore } from './round-score'
export { normalizeRawValue, scoreFromRubric } from './normalize'
export type { NormalizationResult } from './normalize'
export {
  assertWeightsSumToOne,
  computeAssessment,
  computeFinalScore,
  computeIndicatorScores,
  computeProcessProduct,
  resolveCategory,
  validateCompleteness,
} from './engine'
export type { ComputedAssessment, IndicatorScore, RawScoreInput } from './engine'
