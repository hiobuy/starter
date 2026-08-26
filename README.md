# HIOBuy API Starter

A minimal open-source **Next.js** starter for building with the HIOBuy Product API.

Search products from **1688 and Taobao**, browse results, open product details, and learn how to integrate HIOBuy APIs into your own application.

**[Live Demo](https://starter.demo.hiobuy.com) · [GitHub](https://github.com/hiobuy/starter) · [API Documentation](https://developers.hiobuy.com) · [Get API Key](https://developers.hiobuy.com)**

## Features

| Demo                              | HIOBuy API                          |
| --------------------------------- | ----------------------------------- |
| Keyword search & product listing  | `POST /v1/products/search`          |
| Image search                      | `POST /v1/products/search-by-image` |
| Parse Taobao / 1688 product links | `POST /v1/products/parse`           |
| Product details & variants        | `POST /v1/products/detail`          |

The starter keeps your HIOBuy API key on the server using Next.js Route Handlers. The browser never receives your API key. The browser only calls this app’s `/api/products/*` routes, which proxy to the HIOBuy Product API.

## Demo Usage

The public live demo uses a HIOBuy demo application with server-side credentials.

API credentials are never exposed to the browser.

The demo application is protected by HIOBuy Gateway rate limits and usage quotas. If the public demo reaches its usage limit, some API requests may temporarily return a rate-limit response.

For development and integration testing, create your own HIOBuy Developer App and API key:

https://developers.hiobuy.com

The public demo is intended for evaluation only and should not be used as an API proxy for production applications.

## Quick Start

### 1. Get a HIOBuy API key

Create a developer account at [developers.hiobuy.com](https://developers.hiobuy.com), create an App, and obtain an API key.

Make sure your App has access to the marketplace channels you want to use, such as **1688** or **Taobao**. An API key alone is not enough — the App must also be authorized for those channels.

For development, we recommend using a test or sandbox key where available.

### 2. Clone the starter

```bash
git clone https://github.com/hiobuy/starter.git
cd starter
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Add your HIOBuy API key:

```env
HIOBUY_API_KEY=your_api_key_here
```

Optional:

```env
HIOBUY_DEFAULT_LANGUAGE=en
```

Never commit `.env.local` or expose your API key in frontend code.

### 4. Install and run

```bash
pnpm install
pnpm dev
```

Or with npm:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## How It Works

```text
Browser
   │
   ▼
Next.js Route Handler  (/api/products/*)
   │
   │  Authorization: Bearer <HIOBUY_API_KEY>
   ▼
HIOBuy Product API
```

Your API key is stored only in the server environment. Frontend code should call this starter’s proxy routes (for example `POST /api/products/search`), not the HIOBuy API host directly.

Example browser → proxy request body:

```json
{
  "channel": "1688",
  "keyword": "phone case",
  "page": 1,
  "page_size": 20
}
```

## Project Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── product/
│   │   └── [channel]/[id]/
│   └── api/
│       └── products/
│           ├── search/
│           ├── search-by-image/
│           ├── parse/
│           └── detail/
│
├── components/
│
└── lib/
    └── hiobuy.ts
```

`lib/hiobuy.ts` contains the server-side HIOBuy API client.

The routes under `app/api/products/` act as a secure proxy between the browser and HIOBuy.

## Important Notes

### Product IDs

Use the `id` from search (or parse) results in later product requests. The Product API accepts `id` directly.

### API Keys

Never:

* expose your API key in client-side JavaScript;
* commit API keys to Git;
* include production credentials in public repositories.

Keep credentials in server-side environment variables or a secrets manager.

## What This Starter Does Not Include

This project intentionally focuses on the **Product API**.

It does not include:

* Order creation
* Procurement
* Warehouse fulfillment
* International shipping
* Payment

See other HIOBuy examples for these workflows.

## Deployment

The official HIOBuy Starter demo is deployed on Cloudflare Workers:

**https://starter.demo.hiobuy.com**

This project is a standard Next.js application and does not require Cloudflare for local development or self-hosting.

```bash
pnpm preview   # OpenNext build + local Workers runtime (uses .env.local)
pnpm deploy    # production deploy (does NOT bake .env.local)
```

### Secrets (required for production)

OpenNext can embed Next.js `.env*` values into the Worker server bundle at **build** time. That is why a local `pnpm deploy` with `.env.local` present may appear to “work” even if you never ran `wrangler secret put`.

`pnpm deploy` temporarily moves `.env.local` aside during the build so API keys are **not** shipped inside the Worker. Set runtime secrets on Cloudflare instead:

```bash
wrangler secret put HIOBUY_API_KEY
# optional:
wrangler secret put HIOBUY_DEFAULT_LANGUAGE
```

Do not put secrets in `wrangler.jsonc`, Git, or any `NEXT_PUBLIC_*` variable.

If you already deployed while `.env.local` was present, **rotate that API key** in the Developer Portal and redeploy with Cloudflare Secrets.

## Documentation

For complete API documentation, authentication, marketplace authorization, request parameters, and response schemas, visit:

**[HIOBuy Developer Documentation](https://hiobuy.com/api-docs)**

## License

MIT

This project is provided as an integration example for developers building with HIOBuy APIs. It is not intended to be a production-ready storefront.
