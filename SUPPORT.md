# Support

## Getting started

1. **Native stack (recommended)** — see `README.md §18.1`. Bring up PostgreSQL and
   Redis, copy `.env.example` to `.env`, then run
   `powershell -ExecutionPolicy Bypass -File scripts/dev.ps1` (Windows) or
   `./scripts/dev.sh` (bash) — or `make up` / `make down`.
2. **By hand** — install `requirements.txt` + `./services/common`, then run each
   `services/*/app/main.py` on its port with `uvicorn` (ports in `README.md §7`).
3. **Hosted** — Render Blueprint (`render.yaml`) for the backend, Vercel for the
   frontend; see `deploy/render/README.md`.

## Troubleshooting checklist

| Symptom | Likely cause | Fix |
|---|---|---|
| Gateway returns 502 on `/api/...` | Upstream service not ready | `make status` to see which ports listen; re-run the health probe after 30 s |
| A service is missing from `.dev/logs/` | It failed to boot | Read `.dev/logs/<service>.log`; re-run `make up` |
| WebSocket not connecting | Upgrade headers / wrong broker URL | Locally the Vite dev server proxies `/ws` → `:8086`; on Vercel set `VITE_WS_URL=wss://<backend>.onrender.com/ws` (build-time) |
| `database/migrate_and_seed.py` fails | DATABASE_URL wrong or Postgres unreachable | Check `.env` DATABASE_URL; confirm port 5432 is listening |
| Frontend shows blank page | misconfigured `VITE_WS_URL` | Leave `VITE_WS_URL` empty so it derives same-origin `ws(s)://<host>/ws`, or set it to the public `ws(s)://<host>/ws` path |
| Every browser request blocked | `CORS_ORIGINS` empty or missing the frontend origin | Set it to the serving origin (comma-separated list or JSON array); the gateway logs a startup warning when empty |
| 401 on every authenticated call | JWT_SECRET mismatch or token expired | Re-login; confirm JWT_SECRET in `.env` matches what was used at token creation |

## Logs

```bash
make logs                              # tail every process log
type .dev\logs\api-gateway.log          # gateway proxy decisions
type .dev\logs\risk-engine.log          # risk calc & WS publishing
type .dev\logs\notification-service.log # STOMP broker / Redis bridge
```

Service URLs for a live look: frontend http://localhost:3000 · gateway http://localhost:8080/docs · per-service `/health` and `/docs` on ports 8081–8086, 8090–8092.

## Where to ask

- **Bug reports:** GitHub Issues → Bug report template.
- **Feature requests:** GitHub Issues → Feature request template.
- **Security issues:** see `SECURITY.md` — please do not open a public issue.