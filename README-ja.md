# Clawl - ウェブスクレイピングAPI

**Clawl**は、[Cloudflare Workers](https://workers.cloudflare.com/)と[Hono](https://hono.dev/)で構築された高速でセルフホスト可能なウェブスクレイピングAPIです。Firecrawlなどの商用サービスのコスト効率的な代替として設計されています。

## 特徴

- 🚀 **高速**: Cloudflare Workersエッジランタイムで構築
- 🔍 **OGP/メタ抽出**: Open Graph、メタタグ、JSON-LDを抽出
- 🎯 **カスタムセレクタ**: CSSセレクタで任意のデータを抽出
- 💾 **KVキャッシュ**: 設定可能なTTLを持つインテリジェントキャッシング
- 🔐 **APIキー認証**: エンドポイントを保護
- 🌐 **CORS対応**: 許可するオリジンを設定可能
- ✅ **完全な型付け**: Zod検証を使用したTypeScript製
- 🧪 **充実したテスト**: Vitestによる包括的なテストスイート

## 技術スタック

- **ランタイム**: Cloudflare Workers
- **フレームワーク**: Hono
- **パーサー**: Cheerio
- **バリデーション**: Zod
- **テスト**: Vitest
- **リント/フォーマット**: Biome

## はじめに

### 前提条件

- [Bun](https://bun.sh/) または Node.js 18+
- Cloudflareアカウント（デプロイ用）

### インストール

```bash
bun install
```

### 開発

```bash
# 開発サーバーを起動
bun run dev

# テストを実行
bun run test

# 型チェック
bun run typecheck

# リントとフォーマット
bun run check
```

### 設定

1. **KV namespaceの作成**:
```bash
wrangler kv namespace create CACHE_KV
wrangler kv namespace create CACHE_KV --preview
```

2. **`wrangler.toml`を更新** - KV IDを設定:
```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your_kv_id_here"
preview_id = "your_preview_kv_id_here"
```

3. **環境変数の設定**:
```bash
# APIキーを設定（カンマ区切り）
wrangler secret put API_KEYS
# 入力例: key1,key2,key3

# またはwrangler.tomlで設定
[vars]
CORS_ORIGINS = "https://yourdomain.com"
```

### デプロイ

```bash
# 本番環境にデプロイ
bun run deploy

# 特定の環境にデプロイ
wrangler deploy --env production
```

## APIドキュメント

### ベースURL

```
https://your-worker.workers.dev
```

### 認証

すべてのエンドポイント（`/v1/health`を除く）はBearerトークン認証が必要です：

```bash
Authorization: Bearer YOUR_API_KEY
```

### エンドポイント

#### 1. ヘルスチェック

```http
GET /v1/health
```

**レスポンス**:
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

#### 2. OGP/メタ/JSON-LD抽出

```http
GET /v1/ogp?url=https://example.com&cacheTtlSec=86400
```

**クエリパラメータ**:
- `url`（必須）: スクレイピング対象のURL
- `cacheTtlSec`（オプション）: キャッシュTTL（秒）（デフォルト: 86400）

**レスポンス**:
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

#### 3. カスタムセレクタで抽出

```http
POST /v1/extract
Content-Type: application/json
```

**リクエストボディ**:
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

**セレクタオプション**:
- `name`: 出力フィールド名
- `selector`: CSSセレクタ
- `attr`: 抽出する属性（`text`、`html`、または`href`、`src`などの任意のHTML属性）
- `multiple`: すべてのマッチを抽出（デフォルト: `false`）

**レスポンス**:
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

## 使用例

### cURL

```bash
# OGPデータを抽出
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://your-worker.workers.dev/v1/ogp?url=https://example.com"

# カスタムセレクタで抽出
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

// OGP抽出
const ogpResponse = await fetch(
  `${API_BASE}/v1/ogp?url=${encodeURIComponent('https://example.com')}`,
  {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  }
)
const ogpData = await ogpResponse.json()

// セレクタで抽出
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

## プロジェクト構造

```
src/
├── index.ts              # メインアプリエントリ
├── lib/
│   ├── types.ts         # TypeScript型定義
│   ├── errors.ts        # カスタムエラークラス
│   ├── schema.ts        # Zodスキーマ
│   └── utils.ts         # ユーティリティ関数
├── middlewares/
│   ├── auth.ts          # APIキー認証
│   ├── cors.ts          # CORS設定
│   └── error.ts         # エラーハンドラ
├── routes/
│   ├── health.ts        # ヘルスチェックエンドポイント
│   ├── ogp.ts           # OGP抽出エンドポイント
│   └── extract.ts       # カスタム抽出エンドポイント
└── services/
    ├── parser.ts        # CheerioによるHTML解析
    └── robots.ts        # robots.txt検証

tests/
└── unit/
    ├── utils.test.ts
    ├── robots.test.ts
    └── parser.test.ts
```

## テスト

```bash
# すべてのテストを実行
bun run test

# ウォッチモードでテストを実行
bun run test -- --watch

# UIでテストを実行
bun run test:ui
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `API_KEYS` | カンマ区切りのAPIキー | なし（開発モード） |
| `CORS_ORIGINS` | カンマ区切りの許可オリジン | `*` |
| `LOG_LEVEL` | ログレベル（debug, info, warn, error） | `info` |

## コスト最適化

Cloudflare Workers無料プラン：
- 100,000リクエスト/日
- KV: 1GBストレージ、100,000読み取り/日、1,000書き込み/日

キャッシュを有効にすると、ほとんどのリクエストは新しいコンテンツを取得する代わりにKVからヒットします。

## ロードマップ

- [ ] Headlessブラウザレンダリングサポート（Browser Rendering API経由）
- [ ] レート制限ミドルウェア
- [ ] マルチページスクレイピング用のクロールエンドポイント
- [ ] OpenAPI仕様
- [ ] Queuesを使用したリクエストキューイング
- [ ] 分析ダッシュボード

## 貢献

貢献を歓迎します！お気軽にプルリクエストを送ってください。

## ライセンス

MIT

## 謝辞

- [Hono](https://hono.dev/) - Webフレームワーク
- [Cheerio](https://cheerio.js.org/) - HTMLパーサー
- [Cloudflare Workers](https://workers.cloudflare.com/) - エッジランタイム
