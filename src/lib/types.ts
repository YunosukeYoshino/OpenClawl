export interface Env {
  CACHE_KV: KVNamespace
  CORS_ORIGINS?: string
  API_KEYS?: string
  LOG_LEVEL?: string
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  meta: {
    source: string
    cached: boolean
    timestamp: number
  }
  data?: T
  error?: {
    message: string
    code?: string
  }
}

export interface OGPData {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: string
  site_name?: string
  [key: string]: string | undefined
}

export interface MetaData {
  title?: string
  description?: string
  keywords?: string
  author?: string
  charset?: string
  viewport?: string
  [key: string]: string | undefined
}

export interface ExtractionResult {
  ogp?: OGPData
  meta?: MetaData
  jsonLd?: Array<Record<string, unknown>>
  custom?: Record<string, string | string[] | null>
}
