export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeUrl(urlString: string): string {
  const url = new URL(urlString)

  // Lowercase scheme and host
  const protocol = url.protocol.toLowerCase()
  const host = url.hostname.toLowerCase() + (url.port ? `:${url.port}` : '')

  // Normalize pathname - remove trailing slash except for root
  let pathname = url.pathname
  if (pathname.endsWith('/') && pathname.length > 1) {
    pathname = pathname.slice(0, -1)
  }
  // If pathname is empty or just '/', use empty string for root
  if (pathname === '/') {
    pathname = ''
  }

  // Sort query parameters
  const params = Array.from(url.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const search = params.length > 0 ? `?${new URLSearchParams(params).toString()}` : ''

  // Manually construct to have full control
  return `${protocol}//${host}${pathname}${search}`
}

export function toAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  return new URL(relativeUrl, baseUrl).toString()
}

export async function generateCacheKey(
  url: string,
  params: Record<string, unknown>
): Promise<string> {
  const data = JSON.stringify({ url, params })
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `cache:${hashHex}`
}
