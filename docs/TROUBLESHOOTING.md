# Troubleshooting guide

## Setup failures

### `pip install` fails or times out

Network timeouts while installing the backend dependency union
(`requirements.txt`). Set `PIP_DEFAULT_TIMEOUT=120` in your environment and retry:

```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install ./services/common
```

On Render the same install runs as the build command — a slow first deploy is
usually just the numpy/scipy/xgboost/ortools wheels.

### Frontend build fails (TypeScript errors)

```bash
cd frontend
npm run typecheck
```
Fix any type errors; all API response types live in `frontend/src/types/`.

### `common` package collision (flat-layout warning)

Install the shared `cybercommon` package before anything that imports it:

```bash
pip install ./services/common
```

Its distribution name is `cybercommon`, not `common`, precisely to avoid
setuptools flat-layout conflicts.

## Runtime issues

### "relation does not exist" after migration

The database schemas were not created. Run:
```bash
python database/migrate_and_seed.py
```

### A service will not start (`make up`)

Read `.dev/logs/<service>.log` — every process writes its own file. `make status`
shows which stack ports are actually listening. Common causes: `requirements.txt`
not installed (import error), or a port already taken by a previous run (re-run
`make down`, then `make up`).

### JWT validation fails (401 on valid token)

- `JWT_SECRET` must match between the auth-service and api-gateway.
- Default in `.env.example` is fine for local dev; change in production.
- Token `exp` claim is in seconds from epoch; ensure server clocks are correct.

### Services can't reach Postgres

All processes run natively on the host, so `DATABASE_URL` must point at
`localhost`, not a container-network hostname. Verify in `.env`:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/cyberrisk
```
If Postgres is on another machine, use that host's hostname or IP instead.

### Redis connection refused

Redis must be running locally — nothing in the stack starts it for you. Check it
is listening on 6379 and that `.env` has:
```
REDIS_URL=redis://localhost:6379
```
Without Redis the gateway's rate limiter and circuit breaker degrade open, but
ingestion/event fan-out and the `/ws` STOMP bridge go silent.

## Performance

### Risk-engine calculation is slow

The risk-engine queries all assets + vulns + controls in one request. For the
seeded data set (12 assets) this is fast. For larger datasets, ensure Postgres
has appropriate indexes on `asset.assets`, `vuln.vulnerabilities`, and
`control.security_controls`.

### Frontend loads slowly in dev mode

Vite dev server is fast; slow loads usually mean the backend API is returning
large payloads. Check browser network tab for the slow request.