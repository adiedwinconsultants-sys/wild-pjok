import type { ErrorHandler } from 'hono'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import type { AppBindings } from '../types'

export const errorHandler: ErrorHandler<AppBindings> = (error, c) => {
  const requestId = c.get('requestId') ?? 'unknown'

  if (error instanceof AppError) {
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
          requestId,
        },
      },
      error.status,
    )
  }

  if (error instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data yang dikirim tidak valid',
          details: {
            issues: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
          requestId,
        },
      },
      422,
    )
  }

  console.error(
    JSON.stringify({
      level: 'error',
      requestId,
      method: c.req.method,
      path: c.req.path,
      message: error instanceof Error ? error.message : 'unknown error',
    }),
  )

  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server',
        requestId,
      },
    },
    500,
  )
}

export const notFoundHandler = (c: Parameters<ErrorHandler<AppBindings>>[1]) =>
  c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint tidak ditemukan',
        requestId: c.get('requestId') ?? 'unknown',
      },
    },
    404,
  )
