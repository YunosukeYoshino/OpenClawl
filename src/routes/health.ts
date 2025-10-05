import { Hono } from 'hono'
import type { Env } from '../lib/types'

const health = new Hono<{ Bindings: Env }>()

health.get('/', (c) => {
  return c.json({
    ok: true,
    meta: {
      source: 'health',
      cached: false,
      timestamp: Date.now(),
    },
    data: {
      status: 'healthy',
      version: '1.0.0',
    },
  })
})

export default health
