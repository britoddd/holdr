# Holdr.

Personal item inventory manager. Track what you own, where it's stored, and how often you use it — then check Tokopedia market prices to see how easy each item would be to sell.

_Last updated: 2026-04-27_

## Features

- Add, edit, and delete items (name, description, quantity, category, storage place, date owned, usage frequency, image)
- Manage custom categories and storage places
- Image upload (stored as base64 data URL)
- Market price lookup via a Tokopedia scraper, with a 0–100 sellability score based on price and sold counts

## Structure

| Path | Description | Port |
|------|-------------|------|
| `holdr/` | Frontend — Next.js 15, React 19, Tailwind 4, shadcn/ui, Zustand | 4000 |
| `backend/api/` | Express API — image upload, forwards scrape requests | 4040 |
| `backend/scraper-service/` | Express service running the Playwright scraper | 4050 |
| `backend/tokopedia-scraper/` | Playwright scraper for Tokopedia search results | — |

## Getting started

Requires Node.js, pnpm, and Playwright browsers (`npx playwright install chromium`).

```bash
# 1. Scraper service
cd backend/tokopedia-scraper && npm install
cd ../scraper-service && npm install && npm start

# 2. API
cd backend/api && npm install
SCRAPER_SERVICE_URL=http://localhost:4050 node app.js

# 3. Frontend
cd holdr && pnpm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4040" > .env.local
pnpm dev
```

Open http://localhost:4000.

## Environment variables

| Variable | Used by | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | frontend | — (required) |
| `SCRAPER_SERVICE_URL` | api | `http://192.168.18.91:3001` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | api (`db.js`, optional PostgreSQL) | `localhost`, `5432`, `holdr`, `postgres`, `postgres` |

See `backend/api/DATABASE_SETUP.md` for database setup.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/upload-image` | Upload an image (`image` field, max 5MB) |
| `GET` | `/api/scrape?q=<query>&max=<n>` | Tokopedia search results (max 50) |
