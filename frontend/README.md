# Frontend — CyberRisk Quantifier

React 18 + TypeScript + Vite + Tailwind CSS single-page application.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm run test         # vitest unit tests
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
```

## Architecture

- **Routing:** React Router v6, protected by `RoleGuard` (see `src/config/roles.ts`)
- **State:** Zustand stores (`authStore`, `themeStore`)
- **API:** 8 typed API clients in `src/api/` (auth, assets, vulnerabilities, controls, ingestion, risk, investment, ai)
- **WebSocket:** STOMP 1.2 via `@stomp/stompjs` — live notifications on `/topic/risk/updated` and `/topic/ingestion/event`
- **Theme:** light/dark mode, Tailwind CSS

## Role-based access

Four roles: ADMIN, CISO, ANALYST, VIEWER. Page access is defined in `src/config/roles.ts`:

| Page | Roles |
|---|---|
| `/dashboard`, `/risk-landscape`, `/forecast`, `/assets`, `/vulnerabilities`, `/notifications` | ANALYST, CISO, ADMIN |
| `/compliance`, `/controls`, `/invest` | CISO, ADMIN |
| `/national` | ADMIN |

Role filtering happens server-side on every API endpoint and client-side for navigation UX.

## WebSocket connection

`VITE_WS_URL` is a build-time env var. Leave it empty (default) so the client derives `ws(s)://<host>/ws` from the page origin — handled by the Vite dev proxy (`/ws` → `localhost:8086`) in development. Set it explicitly only to override, e.g. `wss://<backend>.onrender.com/ws` when hosted on Vercel.

## Production build

`npm run build` emits a static bundle to `dist/`. There is no container image and
no app server to run:

- **Vercel** — import the repo with Root Directory `frontend`, framework preset
  Vite, output `dist`. `vercel.json` already carries the SPA rewrite. Set two
  build-time variables: `VITE_API_BASE_URL=https://<backend>.onrender.com/api`
  (the `/api` suffix is required) and
  `VITE_WS_URL=wss://<backend>.onrender.com/ws`.
- **Self-hosted** — serve `dist/` behind nginx (or the backend's own
  `deploy/render/nginx.conf.template`, which also fronts `/api` and `/ws`) and
  proxy `/api/` → `api-gateway:8080`, `/ws` → `notification-service:8086` with the
  `Upgrade`/`Connection` headers.