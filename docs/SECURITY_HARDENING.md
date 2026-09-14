# Security Hardening Checklist

Use this checklist when deploying the CyberRisk platform outside of local development.

## Secrets and credentials

- [ ] Changed `JWT_SECRET` from the default in `.env.example`
- [ ] Changed `POSTGRES_PASSWORD` to a strong value
- [ ] Changed all demo user passwords (`admin`, `ciso`, `analyst`)
- [ ] Removed or rotated the `admin123` default password
- [ ] Set `OPENAI_API_KEY` only in a secrets manager, not in `.env` committed to git

## Network

- [ ] Postgres is on a private network (not exposed to the internet)
- [ ] Redis is on a private network or uses authentication
- [ ] Only port 3000 (frontend/nginx) is publicly exposed
- [ ] Ports 8080–8092 (backend services) are NOT publicly exposed
- [ ] WebSocket traffic (`/ws`) goes through TLS in production

## Authentication

- [ ] `JWT_EXPIRY` is appropriate (default 3600 s = 1 hour)
- [ ] `JWT_REFRESH_EXPIRY` is appropriate (default 604800 s = 7 days)
- [ ] Refresh token reuse detection is active (default; do not disable)
- [ ] Role-based access is enforced server-side (not just frontend)

## Frontend

- [ ] `VITE_WS_URL` uses `ws://localhost:3000/ws/` (same-origin, proxied by nginx)
- [ ] Swagger/docs endpoints (`/docs`, `/redoc`) are blocked in production
- [ ] Health endpoints (`/health`) are not publicly accessible

## Database

- [ ] Regular backups are scheduled (see `scripts/backup_db.ps1` / `.sh`)
- [ ] Migrations have been run (`python database/migrate_and_seed.py`)
- [ ] Unused schemas are not accessible outside the application

## Logging and monitoring

- [ ] Container logs are shipped to a centralised logging system
- [ ] Failed login attempts are monitored (written to `auth.audit_logs`)
- [ ] Audit chain entries are verified periodically (`POST /api/risk/audit/verify`)

## Dependency management

- [ ] Dependabot is enabled (see `.github/dependabot.yml`)
- [ ] Security scan CI workflow runs weekly (see `.github/workflows/security-scan.yml`)
- [ ] Python and Node dependencies are up to date