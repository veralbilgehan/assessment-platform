# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

An HR candidate assessment platform (in Turkish) that lets evaluators manage positions, score candidates, run AI-generated tests, compare CVs, and analyse documents. The backend also serves the built frontend in production.

## Commands

### Backend
```bash
cd backend
npm run dev        # nodemon watch mode (development)
npm start          # production (node src/app.js)
```

### Frontend
```bash
cd frontend-react
npm run dev        # Vite dev server on port 5173
npm run build      # production build to dist/
npm run lint       # ESLint
npm run preview    # preview the production build locally
```

### Database migrations
Each migration file is a standalone script — run the one(s) needed:
```bash
cd backend
node src/db/migrate.js    # migration 002 + admin user seed
node src/db/migrate4.js   # migration 004
node src/db/migrate5.js   # migration 005
```

### Docker (production)
```bash
docker build -t assessment-platform .
docker run -p 8080:8080 --env-file backend/.env assessment-platform
```

There is no automated test suite.

## Architecture

### Monorepo layout
- `backend/` — Node.js / Express REST API (CommonJS)
- `frontend-react/` — React 19 / Vite SPA (ESM)
- `belgelerimden_sec.py` — standalone Python utility, unrelated to the main app

### Backend

**Entry point:** `backend/src/app.js` — mounts all routers under `/api/*`, serves the React `dist/` as static files, and provides a `/health` check endpoint.

**Database:** PostgreSQL via a single `pg.Pool` singleton (`src/db/pool.js`). All queries are raw SQL — no ORM. Several important DB views are used directly in query results (e.g. `v_degerlendirme_ozet`, `v_kiyaslama_ozet`, `v_test_raporu`). The schema lives in `src/db/migrations/`.

**Auth:** JWT, 8-hour expiry. The middleware in `src/middleware/auth.js` exposes:
- `requireAuth` — validates Bearer token, attaches `req.user`
- `optionalAuth` — same but passes through if no token
- `requireRole('admin')` / `requireRole(['admin','degerlendirici'])` — composable role guard
- `tokenUret(kullanici)` — signs a token

Roles: `admin`, `degerlendirici`, `izleyici`.

**AI:** `src/services/aiService.js` wraps the Anthropic SDK for evaluation article generation. Several routes instantiate the client directly (belgeler, testler, kiyaslamalar) with `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. All AI calls use `claude-opus-4-7` with `thinking: { type: 'adaptive' }` where deep reasoning is needed.

**SSE pattern:** All AI-heavy endpoints stream via Server-Sent Events. The pattern is consistent:
```
res.setHeader('Content-Type', 'text/event-stream')
// …stream events…
res.write(`data: ${JSON.stringify({ ... })}\n\n`)
// terminate with:
res.write('data: [DONE]\n\n')
res.end()
```
A keepalive `setInterval` writes `: ping\n\n` every 20 s to prevent proxy/Cloud Run timeouts.

**Error responses** always use Turkish key `hata`: `{ hata: 'message' }`. Validation errors (express-validator) return `{ hatalar: [...] }`.

**Routes summary:**
| Mount | File |
|---|---|
| `/api/auth` | auth.js — login, register (admin only), current user, password change |
| `/api/sektorler` | sektorler.js — sector CRUD |
| `/api/hiyerarsi` | hiyerarsi.js — cascading sector→department→position→competency |
| `/api/pozisyonlar` | pozisyonlar.js — position detail + questions |
| `/api/degerlendirmeler` | degerlendirmeler.js — evaluations, scoring, AI article (SSE) |
| `/api/belgeler` | belgeler.js — document upload/analysis/generation/comparison (SSE, multer, pdf-parse, mammoth) |
| `/api/testler` | testler.js — test projects, AI question generation (SSE), candidate sessions, email reports |
| `/api/kiyaslamalar` | kiyaslamalar.js — head-to-head CV comparison with AI scoring (SSE) |
| `/api/deneme` | deneme.js — free trial test flow |
| `/api/evrak` | evrakKutusu.js — document inbox |

### Frontend

**Routing:** Three top-level routes (`/`, `/giris`, `/app`). The entire authenticated experience lives on `/app` with tab-based navigation — active tab is `useState` in `App.jsx`, not URL segments.

**Auth state:** `src/context/AuthContext.jsx` — stores JWT and user object in `localStorage`. Provides `{ user, token, girisYap, cikisYap, girisli }` via `useAuth()`.

**Data fetching:** TanStack React Query (staleTime 30 s, retry 1). All API functions are centralised in `src/api/index.js` and use the Axios instance from `src/api/client.js`, which auto-attaches the Bearer token via a request interceptor. SSE/stream endpoints are exposed as URL string constants (e.g. `AI_STREAM_URL`, `BELGE_ANALIZ_SSE`) consumed with the native `EventSource` / `fetch` API in the page components.

**Environment variable:** `VITE_API_URL` — defaults to empty string so all `/api/*` paths are relative. The Vite dev server proxies `/api` to `http://localhost:3001`.

### Development networking
- Frontend dev server: `localhost:5173` (proxy `/api` → `localhost:3001`)
- Backend dev server: port from `process.env.PORT` (set to `3001` in `.env` for local dev)
- Production (Docker): both served from port `8080`

## Environment variables (backend `.env`)

```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET
ANTHROPIC_API_KEY
PORT                     # 3001 locally, 8080 in Docker
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM   # optional — email features disabled if absent
```

## Language conventions

The entire codebase is in Turkish: variable names, database columns, API response fields, UI labels, and error messages. Follow this convention when adding code. Key recurring terms: `pozisyon` (position), `degerlendirme` (evaluation), `yetkinlik` (competency), `aday` (candidate), `sektör` (sector), `departman` (department), `belge` (document), `hata` (error), `oturum` (session).
