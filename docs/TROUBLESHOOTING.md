# Troubleshooting guide

## Build failures

### `pip install` fails during Docker build

Network timeouts during `pip install`. Fix: all service Dockerfiles set
`PIP_DEFAULT_TIMEOUT=120`. If it still fails, rebuild with:
```bash
docker compose build --no-cache <service>
```

### Frontend build fails (TypeScript errors)

```bash
cd frontend
npm run typecheck
```
Fix any type errors; all API response types live in `frontend/src/types/`.

### `common` package collision (flat-layout warning)

All service Dockerfiles install `common` FIRST from `/opt/common/`, then
copy only `pyproject.toml` + `app/` into the service directory. Do not
change the order in any Dockerfile.

## Runtime issues

### "relation does not exist" after migration

The database schemas were not created. Run:
```bash
python database/migrate_and_seed.py
```

### JWT validation fails (401 on valid token)

- `JWT_SECRET` must match between the auth-service and api-gateway.
- Default in `.env.example` is fine for local dev; change in production.
- Token `exp` claim is in seconds from epoch; ensure server clocks are correct.

### Docker containers can't reach host Postgres

`DATABASE_URL` should use `host.docker.internal` (not `localhost`) when
Postgres runs on the host. Verify in `.env`:
```
DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/cyberrisk
```

### Redis connection refused

If using the Docker Redis (default), ensure the redis service is running:
```bash
docker compose ps redis
docker compose logs redis
```

## Performance

### Risk-engine calculation is slow

The risk-engine queries all assets + vulns + controls in one request. For the
seeded data set (12 assets) this is fast. For larger datasets, ensure Postgres
has appropriate indexes on `asset.assets`, `vuln.vulnerabilities`, and
`control.security_controls`.

### Frontend loads slowly in dev mode

Vite dev server is fast; slow loads usually mean the backend API is returning
large payloads. Check browser network tab for the slow request.