import type { Context } from 'hono'
import { ZodError } from 'zod'
import { AppError } from '../lib/errors'
import type { ApiResponse } from '../lib/types'

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err)

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ApiResponse = {
      ok: false,
      meta: {
        source: '',
        cached: false,
        timestamp: Date.now(),
      },
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
      },
      data: err.issues,
    }
    return c.json(response, 400)
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    const response: ApiResponse = {
      ok: false,
      meta: {
        source: '',
        cached: false,
        timestamp: Date.now(),
      },
      error: {
        message: err.message,
        code: err.code,
      },
    }
    return c.json(response, err.statusCode as never)
  }

  // Handle unknown errors
  const response: ApiResponse = {
    ok: false,
    meta: {
      source: '',
      cached: false,
      timestamp: Date.now(),
    },
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  }

  return c.json(response, 500)
}
