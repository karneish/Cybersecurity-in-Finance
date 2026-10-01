# Operations runbook

## Starting the stack

```bash
make up          # powershell -ExecutionPolicy Bypass -File scripts/dev.ps1  |  ./scripts/dev.sh
make status      # which of 3000, 8080-8086, 8090-8092 are listening
```

`scripts/dev.ps1` / `scripts/dev.sh` verify that PostgreSQL and Redis are
reachable, install dependencies (unless `--skip-install`), start the ten uvicorn
processes plus the Vite dev server, record PIDs in `.dev/pids.json` and run
migrations + seed.

Stop with `make down` (`-Stop` / `--stop`). If a service reports unhealthy on
first start, wait 30 s and re-check — upstreams and the database need a moment.

## Migrations

```bash
make migrate     # == python database/migrate_and_seed.py   (idempotent; safe to re-run)
```

Creates schemas, tables, seeds 12 assets, 15 vulnerabilities, 10 controls, risk snapshots, and governance data. On Render this runs automatically on every boot via `deploy/render/start.sh`.

## Common issues

### api-gateway returns 502

The upstream services are still starting. Check:
```bash
curl http://localhost:8080/health
type .dev\logs\api-gateway.log
```

### WebSocket /ws not delivering messages

1. Confirm notification-service is running: `curl http://localhost:8086/health`
2. Verify the Vite dev proxy forwards `/ws`: `curl -i -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:3000/ws`
3. Check Redis bridge logs: `type .dev\logs\notification-service.log`

### Frontend blank page after rebuild

`VITE_WS_URL` is a build-time override; the default is empty, which makes the client derive the broker URL `ws(s)://<host>/ws` from the page origin. Rebuild after changing it:
```bash
make restart     # stop the stack, then start it again
```

## Backups

```bash
# PostgreSQL
scripts/backup_db.ps1     # or backup_db.sh on Linux
# Exports to database/backups/<timestamp>.sql.gz
```

## Logs

```bash
make logs                                     # tail every process log
type .dev\logs\risk-engine.log                # risk calc & WS publishing
type .dev\logs\notification-service.log       # STOMP broker / Redis bridge
```

Logs live in `.dev/logs/` (one file per process). The host-equivalent on Render is Settings → Logs, which also carries the `start.sh` bootstrap output and supervisord state.

## Health endpoints

Every service exposes `GET /health`:
```bash
for port in 8080 8081 8082 8083 8084 8085 8086 8090 8091 8092; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health || echo "unreachable"
done
```