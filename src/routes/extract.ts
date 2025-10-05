import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { FetchError, ValidationError } from '../lib/errors'
import { extractRequestSchema } from '../lib/schema'
import type { ApiResponse, Env, ExtractionResult } from '../lib/types'
import { generateCacheKey, isValidUrl } from '../lib/utils'
import { extractBySelectors, extractJsonLd, extractMeta, extractOGP } from '../services/parser'

const extract = new Hono<{ Bindings: Env }>()

extract.post('/', zValidator('json', extractRequestSchema), async (c) => {
  const { url, selectors, includeOgp, includeMeta, includeJsonLd, cacheTtlSec } =
    c.req.valid('json')

  if (!isValidUrl(url)) {
    throw new ValidationError(`Invalid URL: ${url}`)
  }

  // Check cache
  const cacheKey = await generateCacheKey(url, {
    type: 'extract',
    selectors,
    includeOgp,
    includeMeta,
    includeJsonLd,
  })
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

  // Extract data based on options
  const result: ExtractionResult = {
    custom: extractBySelectors(html, selectors, url),
  }

  if (includeOgp) {
    result.ogp = extractOGP(html, url)
  }

  if (includeMeta) {
    result.meta = extractMeta(html)
  }

  if (includeJsonLd) {
    result.jsonLd = extractJsonLd(html)
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

export default extract
