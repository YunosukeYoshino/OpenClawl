import type { Context, Next } from 'hono'
import { UnauthorizedError } from '../lib/errors'
import type { Env } from '../lib/types'

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const apiKeys = c.env.API_KEYS

  // If no API keys are configured, allow all requests (development mode)
  if (!apiKeys || apiKeys.trim() === '') {
    return await next()
  }

  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    throw new UnauthorizedError('Missing Authorization header')
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer') {
    throw new UnauthorizedError('Invalid authorization scheme. Use Bearer token.')
  }

  if (!token) {
    throw new UnauthorizedError('Missing API key')
  }

  // Check if token is in the allowed keys
  const validKeys = apiKeys.split(',').map((k) => k.trim())

  if (!validKeys.includes(token)) {
    throw new UnauthorizedError('Invalid API key')
  }

  await next()
}
