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

`VITE_WS_URL` is a build-time env var. Defaults to `ws://localhost:3000/ws/` (same-origin via nginx proxy). When running Vite dev server, it proxies to `localhost:8086` via `vite.config.ts`.

## Production build

The Docker multi-stage build runs `npm run build` and serves the output via nginx on port 3000. nginx proxies:
- `/api/` → `api-gateway:8080`
- `/ws` + `/ws/` → `notification-service:8086` (with WebSocket upgrade headers)