import { describe, expect, it } from 'vitest'
import { isAllowedByRobots, parseRobotsTxt } from '../../src/services/robots'

describe('robots service', () => {
  describe('parseRobotsTxt', () => {
    it('should parse simple robots.txt', () => {
      const robotsTxt = `
User-agent: *
Disallow: /admin
Disallow: /private
Allow: /public
`.trim()

      const rules = parseRobotsTxt(robotsTxt)
      expect(rules.disallow).toContain('/admin')
      expect(rules.disallow).toContain('/private')
      expect(rules.allow).toContain('/public')
    })

    it('should handle wildcard user agents', () => {
      const robotsTxt = `
User-agent: *
Disallow: /secret

User-agent: Googlebot
Disallow: /google-secret
`.trim()

      const rules = parseRobotsTxt(robotsTxt)
      expect(rules.disallow).toContain('/secret')
    })

    it('should handle empty robots.txt', () => {
      const rules = parseRobotsTxt('')
      expect(rules.disallow).toEqual([])
      expect(rules.allow).toEqual([])
    })

    it('should ignore comments', () => {
      const robotsTxt = `
# This is a comment
User-agent: *
Disallow: /admin # inline comment
`.trim()

      const rules = parseRobotsTxt(robotsTxt)
      expect(rules.disallow).toContain('/admin')
    })
  })

  describe('isAllowedByRobots', () => {
    const robotsTxt = `
User-agent: *
Disallow: /admin
Disallow: /api/private
Allow: /api/public
`.trim()

    it('should allow paths not in disallow list', () => {
      expect(isAllowedByRobots('/home', robotsTxt)).toBe(true)
      expect(isAllowedByRobots('/', robotsTxt)).toBe(true)
    })

    it('should disallow paths in disallow list', () => {
      expect(isAllowedByRobots('/admin', robotsTxt)).toBe(false)
      expect(isAllowedByRobots('/admin/users', robotsTxt)).toBe(false)
      expect(isAllowedByRobots('/api/private', robotsTxt)).toBe(false)
    })

    it('should allow paths explicitly in allow list', () => {
      expect(isAllowedByRobots('/api/public', robotsTxt)).toBe(true)
      expect(isAllowedByRobots('/api/public/users', robotsTxt)).toBe(true)
    })

    it('should allow all paths when robots.txt is empty', () => {
      expect(isAllowedByRobots('/admin', '')).toBe(true)
      expect(isAllowedByRobots('/anything', '')).toBe(true)
    })

    it('should handle wildcard patterns', () => {
      const wildcardRobots = `
User-agent: *
Disallow: /*.json$
`.trim()

      expect(isAllowedByRobots('/api/data.json', wildcardRobots)).toBe(false)
      expect(isAllowedByRobots('/api/data.xml', wildcardRobots)).toBe(true)
    })
  })
})
