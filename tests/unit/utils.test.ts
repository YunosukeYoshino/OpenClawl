import { describe, expect, it } from 'vitest'
import { generateCacheKey, isValidUrl, normalizeUrl, toAbsoluteUrl } from '../../src/lib/utils'

describe('utils', () => {
  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true)
      expect(isValidUrl('http://example.com/path')).toBe(true)
      expect(isValidUrl('https://sub.example.com:8080/path?q=1')).toBe(true)
    })

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false)
      expect(isValidUrl('ftp://example.com')).toBe(false)
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('//example.com')).toBe(false)
    })
  })

  describe('normalizeUrl', () => {
    it('should normalize URLs by removing trailing slash', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path')
    })

    it('should normalize URLs by sorting query params', () => {
      expect(normalizeUrl('https://example.com?b=2&a=1')).toBe('https://example.com?a=1&b=2')
    })

    it('should remove hash fragments', () => {
      expect(normalizeUrl('https://example.com#section')).toBe('https://example.com')
      expect(normalizeUrl('https://example.com/path#hash')).toBe('https://example.com/path')
    })

    it('should lowercase the scheme and host', () => {
      expect(normalizeUrl('HTTPS://EXAMPLE.COM/Path')).toBe('https://example.com/Path')
    })
  })

  describe('toAbsoluteUrl', () => {
    it('should convert relative URLs to absolute', () => {
      expect(toAbsoluteUrl('/path', 'https://example.com')).toBe('https://example.com/path')
      expect(toAbsoluteUrl('../other', 'https://example.com/foo/bar/')).toBe(
        'https://example.com/foo/other'
      )
    })

    it('should keep absolute URLs unchanged', () => {
      expect(toAbsoluteUrl('https://other.com/path', 'https://example.com')).toBe(
        'https://other.com/path'
      )
    })

    it('should handle protocol-relative URLs', () => {
      expect(toAbsoluteUrl('//cdn.example.com/image.png', 'https://example.com')).toBe(
        'https://cdn.example.com/image.png'
      )
    })
  })

  describe('generateCacheKey', () => {
    it('should generate consistent hash for same input', async () => {
      const key1 = await generateCacheKey('https://example.com', { foo: 'bar' })
      const key2 = await generateCacheKey('https://example.com', { foo: 'bar' })
      expect(key1).toBe(key2)
    })

    it('should generate different hash for different input', async () => {
      const key1 = await generateCacheKey('https://example.com', { foo: 'bar' })
      const key2 = await generateCacheKey('https://example.com', { foo: 'baz' })
      expect(key1).not.toBe(key2)
    })

    it('should include cache: prefix', async () => {
      const key = await generateCacheKey('https://example.com', {})
      expect(key).toMatch(/^cache:/)
    })
  })
})
