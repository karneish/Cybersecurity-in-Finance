# Deployment guide

## Local development (Docker Compose)

```bash
cp .env.example .env          # review DATABASE_URL — default uses host.docker.internal
docker compose up --build     # 12 containers
# In a second terminal:
python database/migrate_and_seed.py
```

The frontend is at `http://localhost:3000`, the gateway API at `http://localhost:8080/docs`.

## Production considerations

1. **Change all secrets** in `.env`: `JWT_SECRET`, `POSTGRES_PASSWORD`.
2. **Frontend nginx** already proxies `/api/` and `/ws/` to internal services.
   In production, put an external TLS-terminating reverse proxy (nginx, Traefik, Caddy)
   in front of port 3000.
3. **Postgres** should run outside Docker (managed service or separate host); update
   `DATABASE_URL` accordingly. The containers reach the host via `host.docker.internal`.
4. **Redis** can remain in Docker for dev; for production use a managed Redis instance
   and update `REDIS_URL`.
5. **`USE_MOCK_LLM=true`** gives offline responses. Set `OPENAI_API_KEY` + `USE_MOCK_LLM=false`
   only if you want LLM-backed answers.

## Environment variables

All variables are listed in `.env.example`. Key groups:

| Group | Variables |
|---|---|
| Database | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL` |
| Redis | `REDIS_URL` |
| Auth | `JWT_SECRET`, `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY` |
| LLM | `USE_MOCK_LLM`, `OPENAI_API_KEY` |
| Gateway | `GATEWAY_ORIGIN_WHITELIST` |
| Frontend | `VITE_WS_URL` (build-arg override; default empty → same-origin derived `ws(s)://<host>/ws`) |

## Smoke test

```bash
# With Docker stack running:
powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1
```

Verifies health on all 12 services, login for all 4 roles, authenticated CRUD,
risk-engine, WebSocket, investment optimizer, AI assistant, and audit chain.