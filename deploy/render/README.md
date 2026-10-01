# Deploying to Render (backend) + Vercel (frontend)

This document explains how to run the **same** CyberRisk Quantifier stack as a
hosted backend service on Render, with the React frontend on Vercel.

No application code is changed — the deployed API surface is byte-for-byte the
same as `make up` locally:

| Endpoint (local)                     | Endpoint (Render)                            |
|-------------------------------------|----------------------------------------------|
| `http://localhost:8080/api/*`       | `https://<backend>.onrender.com/api/*`       |
| `ws://localhost:8086/ws`            | `wss://<backend>.onrender.com/ws`            |
| `http://localhost:8080/docs`        | `https://<backend>.onrender.com/docs`        |
| `http://localhost:8080/health`      | `https://<backend>.onrender.com/health`      |

There is **no container image**. `render.yaml` declares `runtime: python`, and the
whole backend (api-gateway + auth, asset, vulnerability, control, ingestion,
notification, risk-engine, investment-optimizer, ai-service) runs inside **one
Render web service**:

| Phase | What Render runs |
|---|---|
| **build** | `apt-get install nginx supervisor curl`, then `pip install -r requirements.txt` and `pip install ./services/common` |
| **start** | `bash deploy/render/start.sh` — normalise `DATABASE_URL` for TLS → wait for Postgres → wait for Redis → `database/migrate_and_seed.py` → render `nginx.conf` + `supervisord.conf` from their templates → `exec supervisord` |

### Why one Python process, not ten

supervisord starts **two** programs: `backend` and `nginx`.

The backend program is `deploy/render/serve_all.py`, which imports all ten
services and runs **ten uvicorn servers on a single shared event loop**. Each
service keeps its own port (8081–8092, gateway on 18080) and its own ASGI app, so
every route and every inter-service HTTP URL is byte-for-byte what it was before —
only the process topology changed.

That consolidation is what makes the **free** plan viable. Measured on this
repository:

| Topology | Resident memory |
|---|---|
| 10 separate processes | ~1.0–1.4 GB |
| 1 process, 10 servers (`serve_all.py`) | **~231 MB** |

Ten processes each pay for their own interpreter and their own copy of
numpy/pandas/scipy/scikit-learn/xgboost/ortools; that duplication, not your data,
was the entire problem. The Free plan's 512 MB now fits with ~280 MB to spare.

**nginx is the single public entry point** on `$PORT` and routes `/api/*` to the
gateway, `/ws` to the STOMP WebSocket broker and `/health` to the gateway — so the
browser only ever needs one URL.

---

## 1. The Blueprint (fastest — recommended)

The repository root `render.yaml` is a Render Blueprint that provisions:

- **cyberrisk-redis** — managed Key Value (Redis-compatible), `plan: free`
- **cyberrisk-backend** — the single native-Python web service, `plan: free`

It deliberately does **not** provision a database. Render's free Postgres expires
30 days after creation and cannot be downgraded afterwards, so the database comes
from **Neon** (also free, no expiry) and you paste its pooled connection string
into `DATABASE_URL` when prompted.

Steps:

1. Push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com) click
   **New + → Blueprint** and select the repository.
3. Render parses `render.yaml` and asks you to provide the `sync: false`
   variables:
   - `DATABASE_URL` — your **Neon pooled connection string**, e.g.
     `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.
     `start.sh` appends `sslmode=require` if it is missing, so paste it as-is.
   - `CORS_ORIGINS` — **your Vercel frontend origin**, e.g.
     `https://cyberrisk.vercel.app`. A comma-separated list and a JSON array
     string both parse (the gateway accepts either); `["https://cyberrisk.vercel.app","http://localhost:3000"]`
     is equally valid. **Never leave it empty** — the gateway logs a startup
     warning and every browser request is blocked.
   - `OPENAI_API_KEY` — optional; leave empty to keep the offline mock LLM.

   `JWT_SECRET` is generated for you (`generateValue: true`).
4. Create the Blueprint. Wait for `cyberrisk-backend` to build and deploy
   (first deploy installs numpy/scipy/pandas/xgboost/ortools — allow several
   minutes).
5. When the service is `Live`, verify: open
   `https://<backend>.onrender.com/health` → `{"status":"healthy",...}`.
6. **Keep it awake.** A free service sleeps after 15 idle minutes and needs
   30–60s to wake. Add a free [UptimeRobot](https://uptimerobot.com) monitor on
   `https://<backend>.onrender.com/health` with a 5-minute interval and it stays
   warm, so visitors never see a loading page. This uses 744 of the 750 free
   instance-hours a month, so **do not add a second free web service** to the same
   workspace — two always-on services need ~1,488 hours and Render suspends
   everything until the month resets.

> **Instance sizing — read before choosing a plan:** the **free plan (0.1 CPU /
> 512 MB) is sufficient**, because all ten services share one Python process that
> measures ~231 MB. The blueprint requests `free`. Two caveats:
>
> - **CPU is the tighter constraint.** Free gives 0.1 CPU for the whole backend.
>   CRUD pages, login, risk scoring and the dashboards all respond normally;
>   the XGBoost ML forecast (`/api/risk/forecast`) and the ortools scenario
>   simulation can be slow. If you need those to be quick, `0.5c-512mb` ($7/mo)
>   is the cheapest step up — note it has the *same* 512 MB of RAM.
> - **Don't split the service.** A second free web service would need its own
>   750 shared instance-hours, and two always-on services overrun the budget.

### If you skip the Blueprint (manual dashboard setup)

1. **New + → Key Value** (Redis) — name `cyberrisk-redis`, plan `free`, IP allow
   list empty (internal only).
2. **Create a Neon project** and copy its **pooled** connection string.
3. **New + → Web Service → select the repo**:
   - **Runtime** — `Python`
   - **Root directory** — `.`
   - **Build command** — see the table below
   - **Start command** — `bash deploy/render/start.sh`
   - **Health check path** — `/health`
   - **Instance type** — `free`
4. Add the env vars from the table below. Use the Key Value's **Internal
   Connection String** (Dashboard → resource → Connect).
5. Create the service.

### Build / start commands (for the manual path)

```
apt-get update
  && apt-get install -y --no-install-recommends nginx supervisor curl
  && rm -rf /var/lib/apt/lists/*
  && pip install --upgrade pip
  && pip install -r requirements.txt
  && pip install ./services/common
```
```
bash deploy/render/start.sh
```

### Environment variables

| Variable | Source | Example |
|---|---|---|
| `DATABASE_URL` | Postgres → Internal Connection String | `postgresql://user:pass@host:5432/cyberrisk` |
| `REDIS_URL` | Redis → Internal Connection String | `redis://red-xxxx.internal:6379` |
| `JWT_SECRET` | you (secret) | long random string |
| `CORS_ORIGINS` | you (**comma-separated or JSON array** — see below) | `https://cyberrisk.vercel.app` |
| `JWT_EXPIRY` | default `3600` | same as local `.env` |
| `JWT_REFRESH_EXPIRY` | default `604800` | same as local `.env` |
| `AUTH_ALLOW_REGISTER` | default `false` | keep `false` |
| `USE_MOCK_LLM` | default `true` | `true` = zero-cost offline AI |
| `OPENAI_API_KEY` | optional | only for real LLM answers |
| `LLM_MODEL` | default `gpt-4o` | — |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | default `2` / `2` | keeps the DB-backed services under Render's connection cap |

The service-to-service URLs (`AUTH_SERVICE_URL`, `RISK_ENGINE_URL`, ...) are set
to `http://127.0.0.1:<port>` by the blueprint — all ten services share one
process and one host, so they talk over loopback. You do **not** need to set them
by hand.

> **DB pool note:** `DB_POOL_SIZE=2` + `DB_MAX_OVERFLOW=2` per service keeps the
> total pool budget around 30 connections so it fits even entry-level Render
> Postgres instances. If you use a bigger Postgres plan you may raise these.

> **Database URL note:** `start.sh` appends `?sslmode=require` to `DATABASE_URL`
> when it is missing, because Render Postgres requires TLS. Locally the same
> variable is `postgresql://…@localhost:5432/cyberrisk`.

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

   Both are mandatory when the frontend is hosted separately:
   - `VITE_API_BASE_URL` **must keep the `/api` suffix** — every backend route is
     `/api/*`, so without it every request 404s. (`/api` would also point at
     Vercel itself.)
   - `VITE_WS_URL` is an absolute `wss://` URL with **no trailing slash**.
5. Deploy.

On Vercel the browser talks directly to the Render backend, so CORS must allow
the Vercel origin — that is exactly what `CORS_ORIGINS` on the Render service
does (must include `https://<your-app>.vercel.app`).

> **⚠️ `CORS_ORIGINS` format:** the gateway reads a plain string and parses it
> itself (`split_origins` in `services/api-gateway/app/config.py`), accepting
> **either** a comma-separated list (`https://a.app,https://b.app`) **or** a JSON
> array string (`["https://a.app","https://b.app"]`). A bare `*` is not a valid
> allowlist entry, and an empty value blocks every browser request.

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

- **First deploy is slow** — normal; the build downloads the numpy/scipy/xgboost/
  ortools wheels and `start.sh` then runs `database/migrate_and_seed.py` before
  supervisord opens port `$PORT`. Later deploys are fast (migration is
  idempotent).
- **Service restarts with OOM / repeatedly killed** — the consolidated backend
  measures ~231 MB, so this should not happen on the 512 MB free plan. If it
  does, check that `deploy/render/serve_all.py` is actually the thing running
  (a stale ten-process supervisor config would be ~1.4 GB). Confirm with
  `ps aux | grep serve_all` in the shell, and lower `DB_POOL_SIZE` /
  `DB_MAX_OVERFLOW` if the database pool is what grew.
- **Endpoints feel slow / `/api/risk/forecast` times out** — this is CPU, not
  memory. Free gives 0.1 CPU shared by all ten services. Raise the simulation
  count guard or upgrade to `0.5c-512mb`.
- **`start.sh` fails with "nginx not found" / "supervisord not found"** — the
  build command did not run the `apt-get install`. `start.sh` resolves both
  binaries from `PATH` (or `/usr/sbin/nginx`, `/usr/bin/supervisord`) and aborts
  early with a readable message rather than a silent restart loop.
- **`start.sh` fails with "python environment is incomplete"** — the build's
  `pip install` step did not complete; the traceback above it names the missing
  import.
- **Frontend API calls fail with CORS errors** — set `CORS_ORIGINS` on the
  Render service to the exact Vercel origin (no trailing slash).
- **WebSocket never connects** — check the browser console URL is
  `wss://<backend>.onrender.com/ws` (set `VITE_WS_URL` and redeploy the
  frontend; it is a build-time value).
- **Login 401 / token issues** — confirm `JWT_SECRET` is set (the whole backend
  share it) and that `DATABASE_URL` points at the Postgres that the seeder filled.
- **Gateway cannot reach an upstream** — check the supervisord program state
  (Settings → Logs shows `supervisorctl`-style output). All services are on
  `127.0.0.1`, so a failure is a crashed process, not a networking issue.
- **`pgvector` warning during migration** — expected; the RAG engine stores
  embeddings as JSONB and falls back to pure-Python cosine similarity.

## 5. What was added for this deployment

```
render.yaml                       # Render Blueprint (Postgres + Redis + native-Python web service)
requirements.txt                  # union of every backend dependency (what Render pip-installs)
deploy/render/
├── README.md                     # this document
├── start.sh                      # wait-for-DB/Redis → migrate+seed → render configs → exec supervisord
├── supervisord.conf.template     # backend (1 process, 10 servers) + nginx (rendered to .render/)
└── nginx.conf.template           # public edge on $PORT: /api/*, /ws, /health
```

No application code or API routes were changed.