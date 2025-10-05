import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { FetchError, ValidationError } from '../lib/errors'
import { ogpRequestSchema } from '../lib/schema'
import type { ApiResponse, Env, ExtractionResult } from '../lib/types'
import { generateCacheKey, isValidUrl } from '../lib/utils'
import { extractJsonLd, extractMeta, extractOGP } from '../services/parser'

const ogp = new Hono<{ Bindings: Env }>()

ogp.get('/', zValidator('query', ogpRequestSchema), async (c) => {
  const { url, cacheTtlSec } = c.req.valid('query')

  if (!isValidUrl(url)) {
    throw new ValidationError(`Invalid URL: ${url}`)
  }

  // Check cache
  const cacheKey = await generateCacheKey(url, { type: 'ogp' })
  const cached = await c.env.CACHE_KV.get(cacheKey, 'json')

  if (cached) {
    const response: ApiResponse<ExtractionResult> = {
      ok: true,
      meta: {
        source: url,
        cached: true,
        timestamp: Date.now(),
      },
      data: cached as ExtractionResult,
    }
    return c.json(response)
  }

  // Fetch the URL
  let html: string
  try {
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Clawl/1.0 (Scraping Bot; +https://github.com/yourusername/clawl)',
      },
    })

    if (!fetchResponse.ok) {
      throw new FetchError(
        `Failed to fetch: ${fetchResponse.status} ${fetchResponse.statusText}`,
        url
      )
    }

    html = await fetchResponse.text()
  } catch (error) {
    if (error instanceof FetchError) throw error
    throw new FetchError(`Network error: ${(error as Error).message}`, url)
  }

  // Extract data
  const result: ExtractionResult = {
    ogp: extractOGP(html, url),
    meta: extractMeta(html),
    jsonLd: extractJsonLd(html),
  }

  // Cache the result
  if (cacheTtlSec > 0) {
    await c.env.CACHE_KV.put(cacheKey, JSON.stringify(result), {
      expirationTtl: cacheTtlSec,
    })
  }

  const response: ApiResponse<ExtractionResult> = {
    ok: true,
    meta: {
      source: url,
      cached: false,
      timestamp: Date.now(),
    },
    data: result,
  }

  return c.json(response)
})

export default ogp
