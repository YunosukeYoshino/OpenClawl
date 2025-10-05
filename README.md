# Clawl - Web Scraping API

**Clawl** is a fast, self-hosted web scraping API built with [Cloudflare Workers](https://workers.cloudflare.com/) and [Hono](https://hono.dev/). It's designed as a cost-effective alternative to services like Firecrawl.

## Features

- 🚀 **Fast**: Built on Cloudflare Workers edge runtime
- 🔍 **OGP/Meta Extraction**: Extract Open Graph, meta tags, and JSON-LD
- 🎯 **Custom Selectors**: Extract any data with CSS selectors
- 💾 **KV Caching**: Intelligent caching with configurable TTL
- 🔐 **API Key Authentication**: Secure your endpoints
- 🌐 **CORS Support**: Configure allowed origins
- ✅ **Fully Typed**: Written in TypeScript with Zod validation
- 🧪 **Well Tested**: Comprehensive test suite with Vitest

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Parser**: Cheerio
- **Validation**: Zod
- **Testing**: Vitest
- **Linting**: Biome

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or Node.js 18+
- Cloudflare account (for deployment)

### Installation

```bash
bun install
```

### Development

```bash
# Start development server
bun run dev

# Run tests
bun run test

# Type checking
bun run typecheck

# Linting and formatting
bun run check
```

### Configuration

1. **Set up KV namespace**:
```bash
wrangler kv namespace create CACHE_KV
wrangler kv namespace create CACHE_KV --preview
```

2. **Update `wrangler.toml`** with your KV IDs:
```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your_kv_id_here"
preview_id = "your_preview_kv_id_here"
```

3. **Set environment variables**:
```bash
# Set API keys (comma-separated)
wrangler secret put API_KEYS
# Enter: key1,key2,key3

# Or configure in wrangler.toml
[vars]
CORS_ORIGINS = "https://yourdomain.com"
```

### Deployment

```bash
# Deploy to production
bun run deploy

# Deploy with specific environment
wrangler deploy --env production
```

## API Documentation

### Base URL

```
https://your-worker.workers.dev
```

### Authentication

All endpoints (except `/v1/health`) require Bearer token authentication:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

#### 1. Health Check

```http
GET /v1/health
```

**Response**:
```json
{
  "ok": true,
  "meta": {
    "source": "health",
    "cached": false,
    "timestamp": 1234567890
  },
  "data": {
    "status": "healthy",
    "version": "1.0.0"
  }
}
```

#### 2. Extract OGP/Meta/JSON-LD

```http
GET /v1/ogp?url=https://example.com&cacheTtlSec=86400
```

**Query Parameters**:
- `url` (required): Target URL to scrape
- `cacheTtlSec` (optional): Cache TTL in seconds (default: 86400)

**Response**:
```json
{
  "ok": true,
  "meta": {
    "source": "https://example.com",
    "cached": false,
    "timestamp": 1234567890
  },
  "data": {
    "ogp": {
      "title": "Example Domain",
      "description": "Example description",
      "image": "https://example.com/image.jpg"
    },
    "meta": {
      "title": "Example Domain",
      "description": "Example description",
      "keywords": "example, domain"
    },
    "jsonLd": [
      {
        "@type": "WebSite",
        "name": "Example"
      }
    ]
  }
}
```

#### 3. Extract with Custom Selectors

```http
POST /v1/extract
Content-Type: application/json
```

**Request Body**:
```json
{
  "url": "https://example.com",
  "selectors": [
    {
      "name": "title",
      "selector": "h1.title",
      "attr": "text"
    },
    {
      "name": "links",
      "selector": "a.link",
      "attr": "href",
      "multiple": true
    }
  ],
  "includeOgp": true,
  "includeMeta": true,
  "includeJsonLd": false,
  "cacheTtlSec": 3600
}
```

**Selector Options**:
- `name`: Output field name
- `selector`: CSS selector
- `attr`: Attribute to extract (`text`, `html`, or any HTML attribute like `href`, `src`)
- `multiple`: Extract all matches (default: `false`)

**Response**:
```json
{
  "ok": true,
  "meta": {
    "source": "https://example.com",
    "cached": false,
    "timestamp": 1234567890
  },
  "data": {
    "custom": {
      "title": "Main Title",
      "links": [
        "https://example.com/page1",
        "https://example.com/page2"
      ]
    },
    "ogp": { ... },
    "meta": { ... }
  }
}
```

## Usage Examples

### cURL

```bash
# Extract OGP data
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/v1/ogp?url=https://example.com"

# Extract with custom selectors
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "selectors": [
      {"name": "title", "selector": "h1"}
    ]
  }' \
  "https://your-worker.workers.dev/v1/extract"
```

### JavaScript/TypeScript

```typescript
const API_BASE = 'https://your-worker.workers.dev'
const API_KEY = 'your-api-key'

// Extract OGP
const ogpResponse = await fetch(
  `${API_BASE}/v1/ogp?url=${encodeURIComponent('https://example.com')}`,
  {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  }
)
const ogpData = await ogpResponse.json()

// Extract with selectors
const extractResponse = await fetch(`${API_BASE}/v1/extract`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    selectors: [
      { name: 'title', selector: 'h1' },
      { name: 'paragraphs', selector: 'p', multiple: true }
    ]
  })
})
const extractData = await extractResponse.json()
```

## Project Structure

```
src/
├── index.ts              # Main app entry
├── lib/
│   ├── types.ts         # TypeScript types
│   ├── errors.ts        # Custom error classes
│   ├── schema.ts        # Zod schemas
│   └── utils.ts         # Utility functions
├── middlewares/
│   ├── auth.ts          # API key authentication
│   ├── cors.ts          # CORS configuration
│   └── error.ts         # Error handler
├── routes/
│   ├── health.ts        # Health check endpoint
│   ├── ogp.ts           # OGP extraction endpoint
│   └── extract.ts       # Custom extraction endpoint
└── services/
    ├── parser.ts        # HTML parsing with Cheerio
    └── robots.ts        # robots.txt validation

tests/
└── unit/
    ├── utils.test.ts
    ├── robots.test.ts
    └── parser.test.ts
```

## Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test -- --watch

# Run tests with UI
bun run test:ui
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEYS` | Comma-separated API keys | None (dev mode) |
| `CORS_ORIGINS` | Comma-separated allowed origins | `*` |
| `LOG_LEVEL` | Log level (debug, info, warn, error) | `info` |

## Cost Optimization

Cloudflare Workers free tier:
- 100,000 requests/day
- KV: 1 GB storage, 100,000 reads/day, 1,000 writes/day

With caching enabled, most requests hit KV instead of fetching fresh content.

## Roadmap

- [ ] Headless browser rendering support (via Browser Rendering API)
- [ ] Rate limiting middleware
- [ ] Crawl endpoint for multi-page scraping
- [ ] OpenAPI specification
- [ ] Request queuing with Queues
- [ ] Analytics dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- [Hono](https://hono.dev/) - Web framework
- [Cheerio](https://cheerio.js.org/) - HTML parser
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge runtime
