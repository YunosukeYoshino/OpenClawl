import { describe, expect, it } from 'vitest'
import {
  extractBySelectors,
  extractJsonLd,
  extractMeta,
  extractOGP,
} from '../../src/services/parser'

describe('parser service', () => {
  describe('extractOGP', () => {
    it('should extract OGP tags', () => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Test Title" />
  <meta property="og:description" content="Test Description" />
  <meta property="og:image" content="https://example.com/image.jpg" />
  <meta property="og:url" content="https://example.com" />
</head>
<body></body>
</html>
      `.trim()

      const baseUrl = 'https://example.com'
      const ogp = extractOGP(html, baseUrl)

      expect(ogp.title).toBe('Test Title')
      expect(ogp.description).toBe('Test Description')
      expect(ogp.image).toBe('https://example.com/image.jpg')
      expect(ogp.url).toBe('https://example.com/')
    })

    it('should return empty object when no OGP tags', () => {
      const html = '<html><head></head><body></body></html>'
      const ogp = extractOGP(html, 'https://example.com')
      expect(ogp).toEqual({})
    })

    it('should convert relative URLs to absolute', () => {
      const html = `
<html>
<head>
  <meta property="og:image" content="/images/test.jpg" />
</head>
</html>
      `.trim()

      const ogp = extractOGP(html, 'https://example.com')
      expect(ogp.image).toBe('https://example.com/images/test.jpg')
    })
  })

  describe('extractMeta', () => {
    it('should extract standard meta tags', () => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Page Title</title>
  <meta name="description" content="Page description" />
  <meta name="keywords" content="test, keywords" />
  <meta name="author" content="John Doe" />
</head>
<body></body>
</html>
      `.trim()

      const meta = extractMeta(html)

      expect(meta.title).toBe('Page Title')
      expect(meta.description).toBe('Page description')
      expect(meta.keywords).toBe('test, keywords')
      expect(meta.author).toBe('John Doe')
    })

    it('should extract charset and viewport', () => {
      const html = `
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
</html>
      `.trim()

      const meta = extractMeta(html)

      expect(meta.charset).toBe('UTF-8')
      expect(meta.viewport).toBe('width=device-width, initial-scale=1.0')
    })
  })

  describe('extractJsonLd', () => {
    it('should extract JSON-LD structured data', () => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Test Article",
    "author": {
      "@type": "Person",
      "name": "Jane Doe"
    }
  }
  </script>
</head>
<body></body>
</html>
      `.trim()

      const jsonLd = extractJsonLd(html)

      expect(jsonLd).toHaveLength(1)
      expect(jsonLd[0]['@type']).toBe('Article')
      expect(jsonLd[0].headline).toBe('Test Article')
    })

    it('should return empty array when no JSON-LD', () => {
      const html = '<html><head></head><body></body></html>'
      const jsonLd = extractJsonLd(html)
      expect(jsonLd).toEqual([])
    })

    it('should handle multiple JSON-LD scripts', () => {
      const html = `
<html>
<head>
  <script type="application/ld+json">{"@type": "Article"}</script>
  <script type="application/ld+json">{"@type": "BreadcrumbList"}</script>
</head>
</html>
      `.trim()

      const jsonLd = extractJsonLd(html)

      expect(jsonLd).toHaveLength(2)
      expect(jsonLd[0]['@type']).toBe('Article')
      expect(jsonLd[1]['@type']).toBe('BreadcrumbList')
    })

    it('should handle invalid JSON gracefully', () => {
      const html = `
<html>
<head>
  <script type="application/ld+json">{ invalid json }</script>
</head>
</html>
      `.trim()

      const jsonLd = extractJsonLd(html)
      expect(jsonLd).toEqual([])
    })
  })

  describe('extractBySelectors', () => {
    const html = `
<!DOCTYPE html>
<html>
<body>
  <h1 class="title">Main Title</h1>
  <div class="content">
    <p>First paragraph</p>
    <p>Second paragraph</p>
  </div>
  <a href="/relative" class="link">Link Text</a>
  <img src="https://example.com/image.jpg" alt="Image" />
</body>
</html>
    `.trim()

    it('should extract text content by default', () => {
      const result = extractBySelectors(
        html,
        [{ name: 'title', selector: 'h1.title' }],
        'https://example.com'
      )

      expect(result.title).toBe('Main Title')
    })

    it('should extract HTML content when specified', () => {
      const result = extractBySelectors(
        html,
        [{ name: 'content', selector: '.content', attr: 'html' }],
        'https://example.com'
      )

      expect(result.content).toContain('<p>First paragraph</p>')
      expect(result.content).toContain('<p>Second paragraph</p>')
    })

    it('should extract specific attributes', () => {
      const result = extractBySelectors(
        html,
        [
          { name: 'linkHref', selector: 'a.link', attr: 'href' },
          { name: 'imgSrc', selector: 'img', attr: 'src' },
        ],
        'https://example.com'
      )

      expect(result.linkHref).toBe('https://example.com/relative')
      expect(result.imgSrc).toBe('https://example.com/image.jpg')
    })

    it('should extract multiple elements', () => {
      const result = extractBySelectors(
        html,
        [{ name: 'paragraphs', selector: '.content p', multiple: true }],
        'https://example.com'
      )

      expect(result.paragraphs).toEqual(['First paragraph', 'Second paragraph'])
    })

    it('should return null for non-existent selectors', () => {
      const result = extractBySelectors(
        html,
        [{ name: 'missing', selector: '.does-not-exist' }],
        'https://example.com'
      )

      expect(result.missing).toBeNull()
    })
  })
})
