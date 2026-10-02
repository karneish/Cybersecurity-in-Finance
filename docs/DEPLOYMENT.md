# Deployment guide

## Local development (native processes)

```bash
cp .env.example .env          # review DATABASE_URL — must point at localhost:5432
make install                  # pip install -r requirements.txt + ./services/common + npm install
make up                       # scripts/dev.ps1 (Windows) / scripts/dev.sh (bash)
```

The frontend is at `http://localhost:3000`, the gateway API at `http://localhost:8080/docs`. Stop with `make down`. Logs are in `.dev/logs/`.

Prerequisites: Python 3.11+, Node.js 20+, a running PostgreSQL and a running Redis. No container runtime is involved.

## Hosted deployment

| Piece | Where | How |
|---|---|---|
| Backend (all 10 services + Python edge proxy) | Render, **native Python runtime** | `render.yaml` Blueprint — see `deploy/render/README.md` |
| Frontend (static Vite build) | Vercel | Root Directory `frontend`, framework Vite, output `dist`; set `VITE_API_BASE_URL` and `VITE_WS_URL` as build-time env vars |
| PostgreSQL | **Neon** (free, no expiry) | Paste the pooled connection string into `DATABASE_URL` — Render's free Postgres expires after 30 days |
| Redis | Render managed Key Value (`cyberrisk-redis`, `plan: free`) | Injected into the blueprint automatically |

## Production considerations

1. **Change all secrets**: `JWT_SECRET` (Render generates one), and any database credentials you set by hand.
2. **CORS** — `CORS_ORIGINS` must list the frontend origin (comma-separated or a JSON array; empty blocks every browser request). On Render that is your Vercel origin, e.g. `https://cyberrisk.vercel.app`.
3. **TLS** — Render terminates TLS in front of the edge proxy on `$PORT`; `deploy/render/start.sh` appends `sslmode=require` to `DATABASE_URL` so Postgres traffic is encrypted too.
4. **Postgres** — use a managed instance (the blueprint provisions one) and set `DATABASE_URL` to its libpq `postgresql://` connection string. Locally, point it at `localhost`.
5. **Redis** — use a managed Key Value instance in production and set `REDIS_URL`; locally point it at `localhost:6379`.
6. **Memory** — the **free 512 MB plan is enough**: all ten services run as one Python process (`deploy/render/serve_all.py`, ~231 MB) instead of ten processes (~1.0–1.4 GB). The real constraint is CPU — free gives 0.1 core, so `/api/risk/forecast` and the ortools scenario simulation can be slow.
7. **Scale** — `numInstances: 1` is deliberate: the STOMP broker connections, risk-event consumer and ingestion connector runners are in-process singletons.
8. **`USE_MOCK_LLM=true`** gives offline responses. Set `OPENAI_API_KEY` + `USE_MOCK_LLM=false` only if you want LLM-backed answers.

## Environment variables

All variables are listed in `.env.example`. Key groups:

| Group | Variables |
|---|---|
| Database | `DATABASE_URL`, `DB_USER`, `DB_PASSWORD`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_PRE_PING` |
| Redis | `REDIS_URL` |
| Auth | `JWT_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY` |
| Gateway | `CORS_ORIGINS` (comma-separated list or JSON array) |
| LLM | `USE_MOCK_LLM`, `OPENAI_API_KEY`, `LLM_MODEL` |
| Frontend | `VITE_API_BASE_URL`, `VITE_WS_URL` (build-time; `/api` suffix required, no trailing slash on the wss URL) |

## Smoke test

```bash
# With the native stack running:
make smoke        # powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1
```

Verifies health on all services, login for all personas, authenticated CRUD,
risk-engine, WebSocket, investment optimizer, AI assistant, and audit chain.
