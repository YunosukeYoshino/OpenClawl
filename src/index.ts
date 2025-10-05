import { Hono } from 'hono'
import { logger } from 'hono/logger'
import type { Env } from './lib/types'
import { authMiddleware } from './middlewares/auth'
import { corsMiddleware } from './middlewares/cors'
import { errorHandler } from './middlewares/error'
import extract from './routes/extract'
import health from './routes/health'
import ogp from './routes/ogp'

const app = new Hono<{ Bindings: Env }>()

// Global middlewares
app.use('*', logger())
app.use('*', (c, next) => corsMiddleware(c)(c, next))

// Error handler
app.onError(errorHandler)

// Public routes (no auth required)
app.route('/v1/health', health)

// Protected routes (auth required)
app.use('/v1/*', authMiddleware)
app.route('/v1/ogp', ogp)
app.route('/v1/extract', extract)

// Root route
app.get('/', (c) => {
  return c.json({
    name: 'Clawl API',
    version: '1.0.0',
    description: 'Web scraping and data extraction API',
    endpoints: {
      health: '/v1/health',
      ogp: '/v1/ogp',
      extract: '/v1/extract',
    },
  })
})

export default app
