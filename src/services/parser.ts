import * as cheerio from 'cheerio'
import { toAbsoluteUrl } from '../lib/utils'

export interface SelectorConfig {
  name: string
  selector: string
  attr?: 'text' | 'html' | string // text, html, or any attribute name
  multiple?: boolean
}

export function extractOGP(html: string, baseUrl: string): Record<string, string> {
  const $ = cheerio.load(html)
  const ogp: Record<string, string> = {}

  $('meta[property^="og:"]').each((_i, elem) => {
    const property = $(elem).attr('property')
    const content = $(elem).attr('content')

    if (property && content) {
      const key = property.replace('og:', '')
      // Convert relative URLs to absolute for image, url, etc.
      if (['image', 'url', 'video', 'audio'].includes(key)) {
        ogp[key] = toAbsoluteUrl(content, baseUrl)
      } else {
        ogp[key] = content
      }
    }
  })

  return ogp
}

export function extractMeta(html: string): Record<string, string> {
  const $ = cheerio.load(html)
  const meta: Record<string, string> = {}

  // Extract title
  const title = $('title').text()
  if (title) {
    meta.title = title
  }

  // Extract meta tags by name
  $('meta[name]').each((_i, elem) => {
    const name = $(elem).attr('name')
    const content = $(elem).attr('content')

    if (name && content) {
      meta[name] = content
    }
  })

  // Extract charset
  const charset = $('meta[charset]').attr('charset')
  if (charset) {
    meta.charset = charset
  }

  return meta
}

export function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const $ = cheerio.load(html)
  const jsonLdData: Array<Record<string, unknown>> = []

  $('script[type="application/ld+json"]').each((_i, elem) => {
    const content = $(elem).html()
    if (content) {
      try {
        const data = JSON.parse(content)
        jsonLdData.push(data)
      } catch {
        // Ignore invalid JSON
      }
    }
  })

  return jsonLdData
}

export function extractBySelectors(
  html: string,
  selectors: SelectorConfig[],
  baseUrl: string
): Record<string, string | string[] | null> {
  const $ = cheerio.load(html)
  const result: Record<string, string | string[] | null> = {}

  for (const config of selectors) {
    const { name, selector, attr = 'text', multiple = false } = config

    const elements = $(selector)

    if (elements.length === 0) {
      result[name] = null
      continue
    }

    if (multiple) {
      const values: string[] = []
      elements.each((_i, elem) => {
        const value = extractValue($, elem, attr, baseUrl)
        if (value) {
          values.push(value)
        }
      })
      result[name] = values
    } else {
      const value = extractValue($, elements.first()[0], attr, baseUrl)
      result[name] = value
    }
  }

  return result
}

function extractValue(
  $: cheerio.CheerioAPI,
  elem: Parameters<cheerio.CheerioAPI>[0],
  attr: string,
  baseUrl: string
): string | null {
  if (attr === 'text') {
    return $(elem).text().trim()
  }

  if (attr === 'html') {
    return $(elem).html()
  }

  // Extract specific attribute
  const value = $(elem).attr(attr)
  if (!value) {
    return null
  }

  // Convert relative URLs to absolute for href, src, etc.
  if (['href', 'src', 'action', 'data'].includes(attr)) {
    return toAbsoluteUrl(value, baseUrl)
  }

  return value
}
