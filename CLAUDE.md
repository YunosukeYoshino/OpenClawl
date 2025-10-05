# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Clawl is a Cloudflare Workers-based web scraping API built with Hono framework. It's designed as a cost-effective, self-hosted alternative to commercial scraping services like Firecrawl. The API extracts structured data (OGP, meta tags, JSON-LD) and custom CSS selector-based content from web pages, with KV-based caching.

## Development Commands

```bash
# Development
bun run dev                    # Start local Wrangler dev server
bun run test                   # Run all tests with Vitest
bun run test -- path/to/file   # Run specific test file
bun run test -- --watch        # Run tests in watch mode
bun run test:ui                # Run tests with UI

# Code Quality
bun run typecheck              # TypeScript type checking (tsc --noEmit)
bun run check                  # Biome lint + format (with --write)
bun run lint                   # Biome lint only
bun run format                 # Biome format only

# Deployment
bun run deploy                 # Deploy to Cloudflare Workers
wrangler deploy --env production  # Deploy to specific environment
```

## Architecture

### Request Flow

1. **Entry Point** (`src/index.ts`): Main Hono app with middleware chain
2. **Middleware Chain**:
   - Logger (Hono built-in)
   - CORS (dynamic origin from `CORS_ORIGINS` env var)
   - Auth (Bearer token, skipped if `API_KEYS` not set - dev mode)
   - Error Handler (global error boundary)
3. **Route Handlers** (`src/routes/`):
   - `/v1/health` - Public health check (no auth)
   - `/v1/ogp` - GET endpoint for OGP/meta/JSON-LD extraction
   - `/v1/extract` - POST endpoint for custom CSS selector extraction
4. **Services** (`src/services/`):
   - `parser.ts` - Cheerio-based HTML parsing and data extraction
   - `robots.ts` - robots.txt parsing and validation (not currently enforced)

### Key Data Flow Patterns

**Caching Pattern** (used in both `/v1/ogp` and `/v1/extract`):
```
1. Generate cache key: hash(url + request params)
2. Check KV cache → if HIT: return cached response
3. Fetch URL with custom User-Agent
4. Parse HTML with service layer
5. Store in KV with TTL
6. Return response with `cached: false`
```

**Validation Pattern**:
- All routes use `@hono/zod-validator` with schemas from `src/lib/schema.ts`
- Zod schemas auto-generate TypeScript types (exported as `OGPRequest`, `ExtractRequest`, etc.)
- Validation errors return 400 with ZodError details

### Type System Architecture

**Environment Bindings** (`src/lib/types.ts`):
- `Env` interface defines Cloudflare Workers bindings (KV namespace, env vars)
- All Hono contexts are typed as `Hono<{ Bindings: Env }>`

**Response Structure**:
- All API responses conform to `ApiResponse<T>` with `ok`, `meta`, `data`, `error` fields
- `meta.cached` indicates if response came from KV cache
- `meta.timestamp` is millisecond timestamp

**Parser Return Types**:
- `extractOGP()` → `Record<string, string>` (OGP tags keyed by property name)
- `extractMeta()` → `Record<string, string>` (meta tags keyed by name)
- `extractJsonLd()` → `Array<Record<string, unknown>>` (parsed JSON-LD scripts)
- `extractBySelectors()` → `Record<string, string | string[] | null>` (custom extractions)

### Error Handling Architecture

Custom error classes extend `AppError` (`src/lib/errors.ts`):
- `ValidationError` → 400
- `UnauthorizedError` → 401
- `ForbiddenError` → 403 (robots.txt)
- `NotFoundError` → 404
- `RateLimitError` → 429
- `FetchError` → 502
- `ParseError` → 500

The global error handler (`src/middlewares/error.ts`) catches:
1. ZodError → 400 with `err.issues`
2. AppError → custom status code with error code
3. Unknown errors → 500

## Configuration

### Environment Setup

Before first run, you must create KV namespaces:
```bash
wrangler kv namespace create CACHE_KV
wrangler kv namespace create CACHE_KV --preview
```

Update `wrangler.toml` with the generated IDs.

### Environment Variables

- `API_KEYS` (secret): Comma-separated Bearer tokens. If unset, auth is disabled (dev mode).
- `CORS_ORIGINS` (var): Comma-separated origins or `*`. Defaults to `*`.
- `LOG_LEVEL` (var): Not currently used, but available for future logging.

Set secrets with: `wrangler secret put API_KEYS`

### Multi-Environment Setup

`wrangler.toml` defines `[env.development]` and `[env.production]` with different CORS/logging configs. Deploy with `wrangler deploy --env production`.

## Testing Strategy

Tests use Vitest with `@cloudflare/vitest-pool-workers` for Workers runtime emulation.

**Test Organization**:
- `tests/unit/utils.test.ts` - URL normalization, cache key generation
- `tests/unit/robots.test.ts` - robots.txt parsing and pattern matching
- `tests/unit/parser.test.ts` - Cheerio-based extraction (OGP, meta, selectors)

**Testing Pattern**:
- Unit tests are pure function tests (no network, no KV)
- No integration tests yet (add these for route handlers with mocked fetch/KV)

**Running Specific Tests**:
```bash
bun run test tests/unit/parser.test.ts
bun run test -- --grep "extractOGP"  # Run tests matching pattern
```

## Adding New Routes

1. Create route file in `src/routes/` (e.g., `crawl.ts`)
2. Define Zod schema in `src/lib/schema.ts`
3. Implement route handler as `new Hono<{ Bindings: Env }>()` with validator
4. Add route to `src/index.ts` with `app.route('/v1/crawl', crawl)`
5. Place route **after** `app.use('/v1/*', authMiddleware)` for auth protection
6. Write tests in `tests/unit/` or `tests/integration/`

## Adding New Parsers/Services

**Parser Functions** (`src/services/parser.ts`):
- Accept `html: string` and optionally `baseUrl: string`
- Use `cheerio.load(html)` to get Cheerio instance
- Convert relative URLs to absolute with `toAbsoluteUrl()` from `src/lib/utils.ts`
- Return structured data matching types in `src/lib/types.ts`

**Service Pattern**:
- Keep services pure (no side effects, no KV access)
- Route handlers manage caching, fetching, error handling
- Services only transform data

## Cloudflare Workers Specifics

**Runtime Constraints**:
- No Node.js APIs (use Web APIs: `fetch`, `crypto.subtle`, `URL`, etc.)
- No filesystem access
- CPU time limit: ~50ms (free tier), cache aggressively
- KV is eventually consistent, use for read-heavy caching only

**KV Usage Pattern**:
```typescript
// Write
await c.env.CACHE_KV.put(key, JSON.stringify(data), { expirationTtl: ttl })

// Read
const cached = await c.env.CACHE_KV.get(key, 'json')
```

**Type Safety with Bindings**:
- Always type contexts as `Context<{ Bindings: Env }>`
- Access bindings via `c.env.CACHE_KV`, `c.env.API_KEYS`, etc.

## Common Patterns

### URL Normalization
Use `normalizeUrl()` from `src/lib/utils.ts` for consistent caching:
- Lowercases scheme and host
- Removes trailing slashes
- Sorts query parameters
- Removes hash fragments

### Cache Key Generation
Use `generateCacheKey(url, params)` to create SHA-256 hash with `cache:` prefix.

### Adding Middleware
1. Create in `src/middlewares/`
2. Add to global chain in `src/index.ts` with `app.use('*', middleware)`
3. Or add to specific routes with `app.use('/path/*', middleware)`

### Selector Extraction
Selectors support:
- `attr: "text"` - Text content (default)
- `attr: "html"` - Inner HTML
- `attr: "href"` / `"src"` - Attributes (auto-converted to absolute URLs)
- `multiple: true` - Returns array instead of single value

## Deployment Checklist

1. Set KV namespace IDs in `wrangler.toml`
2. Set `API_KEYS` secret: `wrangler secret put API_KEYS`
3. Update `CORS_ORIGINS` in `wrangler.toml` [vars] or [env.production.vars]
4. Run `bun run typecheck && bun run check && bun run test`
5. Deploy: `bun run deploy` or `wrangler deploy --env production`
6. Test deployed worker with `curl` (see README for examples)

## Future Roadmap Features

The codebase includes schemas for a `/v1/crawl` endpoint (`crawlRequestSchema` in `src/lib/schema.ts`) that is not yet implemented. This will support multi-page crawling with depth limits and URL pattern matching.
