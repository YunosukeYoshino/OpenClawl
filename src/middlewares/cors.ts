import type { Context } from 'hono'
import { cors as honoCors } from 'hono/cors'
import type { Env } from '../lib/types'

export function corsMiddleware(c: Context<{ Bindings: Env }>) {
  const origins = c.env.CORS_ORIGINS || '*'

  // Parse origins (can be comma-separated)
  const allowedOrigins = origins.split(',').map((o) => o.trim())

  return honoCors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400, // 24 hours
    credentials: true,
  })
}
