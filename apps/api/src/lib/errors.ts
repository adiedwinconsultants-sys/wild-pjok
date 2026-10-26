import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_RESET_TOKEN'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'ADMIN_USER_NOT_FOUND'
  | 'LAST_SUPERADMIN'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'CLASS_NOT_FOUND'
  | 'CLASS_HAS_ASSESSMENTS'
  | 'CLASS_DUPLICATE'
  | 'STUDENT_NOT_FOUND'
  | 'STUDENT_DUPLICATE'
  | 'STUDENT_HAS_RESULTS'
  | 'INSTRUMENT_NOT_FOUND'
  | 'ASSESSMENT_NOT_FOUND'
  | 'ASSESSMENT_PARTICIPANTS_INVALID'
  | 'ASSESSMENT_FINALIZED'
  | 'ASSESSMENT_CONFLICT'
  | 'ASSESSMENT_NOT_FINALIZED'
  | 'INCOMPLETE_SCORES'
  | 'SCORE_INVALID'
  | 'RESULT_NOT_FOUND'
  | 'EXPORT_NOT_FOUND'
  | 'EXPORT_FAILED'
  | 'IMPORT_INVALID'
  | 'PAYLOAD_TOO_LARGE'

export class AppError extends Error {
  readonly status: ContentfulStatusCode
  readonly code: ErrorCode
  readonly details?: Record<string, unknown>

  constructor(
    status: ContentfulStatusCode,
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    if (details !== undefined) {
      this.details = details
    }
  }
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(422, 'VALIDATION_ERROR', message, details)
}

export function unauthorized(message = 'Sesi tidak valid'): AppError {
  return new AppError(401, 'UNAUTHORIZED', message)
}

export function forbidden(message = 'Anda tidak berhak mengakses sumber daya ini'): AppError {
  return new AppError(403, 'FORBIDDEN', message)
}

export function notFound(code: ErrorCode, message: string): AppError {
  return new AppError(404, code, message)
}

export function conflict(code: ErrorCode, message: string): AppError {
  return new AppError(409, code, message)
}
