# Deploying to Render (backend) + Vercel (frontend)

This document explains how to run the **same** CyberRisk Quantifier stack as a
hosted backend service on Render, with the React frontend on Vercel.

No application code is changed — the deployed API surface is byte-for-byte the
same as `docker compose up` locally:

| Endpoint (local)                     | Endpoint (Render)                            |
|-------------------------------------|----------------------------------------------|
| `http://localhost:8080/api/*`       | `https://<backend>.onrender.com/api/*`       |
| `ws://localhost:8086/ws`            | `wss://<backend>.onrender.com/ws`            |
| `http://localhost:8080/docs`        | `https://<backend>.onrender.com/docs`        |
| `http://localhost:8080/health`      | `https://<backend>.onrender.com/health`      |

The whole backend (api-gateway + auth, asset, vulnerability, control,
ingestion, notification, risk-engine, investment-optimizer, ai-service) is
packaged into **one container** (`deploy/render/Dockerfile`). nginx is the
single public entry point and routes `/api/*` to the gateway and `/ws` to the
STOMP WebSocket broker, exactly like the frontend's nginx does locally.

---

## 1. The Blueprint (fastest — recommended)

The repository root `render.yaml` is a Render Blueprint that provisions:

- **cyberrisk-db** — managed PostgreSQL
- **cyberrisk-redis** — managed Key Value (Redis-compatible)
- **cyberrisk-backend** — the unified web service, with every env var wired

Steps:

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com) click
   **New + → Blueprint** and select the repository.
3. Render parses `render.yaml` and asks you to provide the `sync: false`
   variables:
   - `JWT_SECRET` — a long random string (at least 32 chars).
   - `CORS_ORIGINS` — your Vercel frontend URL plus localhost for dev, as a
     **JSON array string** (the gateway parses it with `json.loads`), e.g.
     `["https://cyberrisk.vercel.app","http://localhost:3000"]`
   - `OPENAI_API_KEY` — optional; leave empty to keep the offline mock LLM.
4. Create the Blueprint. Wait for `cyberrisk-backend` to build and deploy
   (first deploy installs numpy/scipy/xgboost/ortools — allow several minutes).
5. When the service is `Live`, verify: open
   `https://<backend>.onrender.com/health` → `{"status":"healthy",...}`.

> **Instance sizing:** the default web plan is `standard` (2 GB). The stack
> (numpy/scipy/pandas/xgboost/sklearn/ortools + ten processes) is memory
> hungry. If the service restarts with OOM errors, go to the service
> **Settings → Instance type** and move up to `standard-plus` (4 GB) or `pro`.

### If you skip the Blueprint (manual dashboard setup)

1. **New + → PostgreSQL** — name `cyberrisk-db` (free/basic is fine), create.
2. **New + → Redis** (Key Value) — name `cyberrisk-redis`, create.
3. **New + → Web Service → select the repo**:
   - **Runtime** — `Docker`
   - **Root directory** — `.`
   - **Dockerfile path** — `deploy/render/Dockerfile`
   - **Health check path** — `/health`
   - **Instance type** — at least `standard` (2 GB).
4. Add the env vars from the table below. Use each resource's
   **Internal Connection String** (Dashboard → resource → Connect).
5. Create the service.

### Environment variables

| Variable | Source | Example |
|---|---|---|
| `DATABASE_URL` | Postgres → Internal Connection String | `postgresql://user:pass@host:5432/cyberrisk` |
| `REDIS_URL` | Redis → Internal Connection String | `redis://red-xxxx.internal:6379` |
| `JWT_SECRET` | you (secret) | long random string |
| `CORS_ORIGINS` | you (**JSON array** — see below) | `["https://myapp.vercel.app","http://localhost:3000"]` |
| `JWT_EXPIRY` | default `900000` | same as local `.env` |
| `JWT_REFRESH_EXPIRY` | default `604800000` | same as local `.env` |
| `AUTH_ALLOW_REGISTER` | default `false` | keep `false` |
| `USE_MOCK_LLM` | default `true` | `true` = zero-cost offline AI |
| `OPENAI_API_KEY` | optional | only for real LLM answers |
| `LLM_MODEL` | default `gpt-4o` | — |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | default `2` / `2` | keeps 8 services under Render's connection cap |

The service-to-service URLs (`AUTH_SERVICE_URL`, `RISK_ENGINE_URL`, ...) are
baked into the image as `http://127.0.0.1:<port>` — you do **not** need to set
them.

> **DB pool note:** `DB_POOL_SIZE=2` + `DB_MAX_OVERFLOW=2` per service keeps the
> total pool budget around 30 connections so it fits even entry-level Render
> Postgres instances. If you use a bigger Postgres plan you may raise these.

---

## 2. Deploying the frontend to Vercel

The frontend lives in the `frontend/` subdirectory. On Vercel:

1. **Import the same GitHub repo** into Vercel.
2. In **Import Project → Root Directory**, set `frontend`.
3. Framework preset: **Vite**. Build command `npm run build`, output
   `dist` (defaults are fine — `vercel.json` already handles SPA routing).
4. Under **Environment Variables**, add two **build-time** variables:

   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<backend>.onrender.com/api` |
   | `VITE_WS_URL` | `wss://<backend>.onrender.com/ws` |

   (`VITE_API_BASE_URL` defaults to `/api` in the code; on Vercel `/api` would
   point at Vercel and break — it **must** be set to the Render backend.)
5. Deploy.

On Vercel the browser talks directly to the Render backend, so CORS must allow
the Vercel origin — that is exactly what `CORS_ORIGINS` on the Render service
does (must include `https://<your-app>.vercel.app`).

> **⚠️ `CORS_ORIGINS` is a JSON array string**, not comma-separated: the gateway
> settings class (`services/api-gateway/app/config.py`) declares
> `cors_origins: list[str]`, so any other format (or a plain `*`) crashes the
> gateway at startup.

---

## 3. Verifying

Once both deployments are live:

1. `https://<backend>.onrender.com/health` → `{"status":"healthy",...}`
2. `https://<backend>.onrender.com/docs` → gateway Swagger UI.
3. Open the Vercel URL, log in with a seeded demo account
   (`scro_regulator` / `Scro@2026!`) and click through the dashboard.
4. Live feed: trigger `POST /api/ingestion/simulate` (authenticated) — the
   dashboard notification bell should light up over the WebSocket.

The repository's end-to-end script also works against the deployed backend:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1 `
  -Base "https://<backend>.onrender.com/api" `
  -WsUrl "https://<backend>.onrender.com"
```

---

## 4. Troubleshooting

- **First deploy is slow** — normal; the image downloads numpy/scipy/xgboost/
  ortools wheels and the container then runs `database/migrate_and_seed.py`
  before opening port `$PORT`. Later deploys are fast (migration is idempotent).
- **Service restarts with OOM** — raise the instance type (see above) or lower
  `DB_POOL_SIZE`/`DB_MAX_OVERFLOW`.
- **Frontend API calls fail with CORS errors** — set `CORS_ORIGINS` on the
  Render service to the exact Vercel origin.
- **WebSocket never connects** — check the browser console URL is
  `wss://<backend>.onrender.com/ws` (set `VITE_WS_URL` and redeploy the
  frontend; it is a build-time value).
- **Login 401 / token issues** — confirm `JWT_SECRET` is set (services share
  it) and that `DATABASE_URL` points at the Postgres that the seeder filled.
- **`pgvector` warning during migration** — expected; the RAG engine stores
  embeddings as JSONB and falls back to pure-Python cosine similarity.

## 5. What was added for this deployment

```
render.yaml                       # Render Blueprint (Postgres + Redis + web service)
deploy/render/
├── Dockerfile                    # unified backend image (all 10 services + nginx)
├── supervisord.conf              # one process per microservice
├── nginx.conf.template           # public edge: /api/*, /ws, /health
└── start.sh                      # wait-for-DB/Redis → migrate+seed → nginx → supervisord
```

No application code or API routes were changed.