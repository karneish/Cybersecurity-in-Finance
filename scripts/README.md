# Scripts

## Native dev stack

```bash
powershell -ExecutionPolicy Bypass -File scripts/dev.ps1   # Windows
./scripts/dev.sh                                     # bash
# or: make up / make down
```

Starts the ten uvicorn processes plus the Vite dev server on the ports in
`.env.example` (frontend 3000, gateway 8080 public, 8081–8086, 8090–8092).
Requires Python 3.11+, Node 20+ and a running PostgreSQL + Redis. PIDs land in
`.dev/pids.json`, logs in `.dev/logs/`.

| Flag | Effect |
|---|---|
| `-Stop` / `--stop` | Stop everything a previous run left behind |
| `-NoFrontend` / `--no-frontend` | Backend only, skip Vite |
| `-SkipInstall` / `--skip-install` | Skip `pip install -r requirements.txt` |

## Live tunnel (free, public URL from your PC)

Exposes the local stack over the internet with Cloudflare — no router changes,
no card, no server-ifying your laptop. The frontend on port 3000 is the single
door (SPA + `/api/*` + `/ws`).

```bash
powershell -ExecutionPolicy Bypass -File scripts/serve-free.ps1
```

- **Fixed mode** (default once configured): named tunnel + hostname, so the URL
  is the same every run.
- **Quick mode** (fallback): `https://<random>.trycloudflare.com`, changes on
  restart. Force with `-ForceQuick`.
- Press `Ctrl+C` to take it down; nothing is left running.

One-time setup for a permanent free URL (`cyberrisk.is-a.dev` via is-a.dev):

```bash
powershell -ExecutionPolicy Bypass -File scripts/tunnel-fixed-setup.ps1
```

Creates the named tunnel + ingress config, then prints the exact is-a.dev PR
content and a check-only mode via `-CheckOnly`.

## Smoke test

```bash
powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1
```

End-to-end verification of the full stack:
1. Health checks on every running service (gateway + 9 backends + frontend)
2. Login/register for all demo users
3. Authenticated CRUD on assets, vulnerabilities, controls, ingestion
4. Risk-engine: score, EAL, scenario, forecast, ML forecast
5. Gateway: bad-token rejection + happy-path forwarding
6. WebSocket: connect + subscribe to `/topic/risk/updated`
7. National: summary, sectors, regions, exercises, audit chain verify
8. Investment: optimize + national allocation
9. AI: recommend, query, RAG status/refresh/query

## Database backup

```bash
scripts/backup_db.ps1     # Windows (PowerShell)
scripts/backup_db.sh      # Linux/macOS (bash)
```

Exports a gzipped SQL dump to `database/backups/<timestamp>.sql.gz`.

## Common variables

| Script | Requirements |
|---|---|
| `dev.ps1` | PowerShell, Python 3.11+, Node 20+, PostgreSQL + Redis running |
| `dev.sh` | bash, Python 3.11+, Node 20+, PostgreSQL + Redis running |
| `serve-free.ps1` | PowerShell, native stack up on port 3000 (`make up`); fetches `cloudflared` into `%TEMP%\cloudflared` if absent |
| `tunnel-fixed-setup.ps1` | PowerShell, `cloudflared` (auto-fetched), Cloudflare + GitHub logins |
| `smoke_sacro.ps1` | PowerShell, `Invoke-WebRequest` (included in Windows) |
| `backup_db.ps1` | PowerShell, `pg_dump` in PATH |
| `backup_db.sh` | bash, `pg_dump` in PATH |

All scripts read from `.env` or use sensible defaults matching `.env.example`.