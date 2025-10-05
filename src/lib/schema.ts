import { z } from 'zod'

export const selectorConfigSchema = z.object({
  name: z.string().min(1),
  selector: z.string().min(1),
  attr: z.string().optional().default('text'),
  multiple: z.boolean().optional().default(false),
})

export const ogpRequestSchema = z.object({
  url: z.string().url(),
  cacheTtlSec: z.number().int().min(0).optional().default(86400), // 24 hours
})

export const extractRequestSchema = z.object({
  url: z.string().url(),
  selectors: z.array(selectorConfigSchema).min(1),
  includeOgp: z.boolean().optional().default(false),
  includeMeta: z.boolean().optional().default(false),
  includeJsonLd: z.boolean().optional().default(false),
  cacheTtlSec: z.number().int().min(0).optional().default(3600), // 1 hour
})

export const crawlRequestSchema = z.object({
  startUrl: z.string().url(),
  maxDepth: z.number().int().min(0).max(3).optional().default(1),
  maxPages: z.number().int().min(1).max(100).optional().default(10),
  matchPattern: z.string().optional(), // Regex pattern for path matching
  selectors: z.array(selectorConfigSchema).optional(),
  cacheTtlSec: z.number().int().min(0).optional().default(3600),
})

export type OGPRequest = z.infer<typeof ogpRequestSchema>
export type ExtractRequest = z.infer<typeof extractRequestSchema>
export type CrawlRequest = z.infer<typeof crawlRequestSchema>
export type SelectorConfig = z.infer<typeof selectorConfigSchema>
