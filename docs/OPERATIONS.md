# Operations runbook

## Starting the stack

```bash
docker compose up -d
docker compose ps                # all services should show "healthy"
```

If any service reports unhealthy, wait 30 s and re-check — databases take time to initialise.

## Migrations

```bash
python database/migrate_and_seed.py   # idempotent; safe to re-run
```

Creates schemas, tables, seeds 12 assets, 15 vulnerabilities, 10 controls, risk snapshots, and governance data.

## Common issues

### api-gateway returns 502

The upstream services are still starting. Check:
```bash
curl http://localhost:8080/health
docker compose logs api-gateway
```

### WebSocket /ws not delivering messages

1. Confirm notification-service is running: `curl http://localhost:8086/health`
2. Verify nginx forwarding: `curl -i -H "Upgrade: websocket" -H "Connection: Upgrade" http://localhost:3000/ws`
3. Check Redis bridge logs: `docker compose logs notification-service`

### Frontend blank page after rebuild

`VITE_WS_URL` is a build-time override; the default is empty, which makes the client derive the broker URL `ws(s)://<host>/ws` from the page origin. Rebuild after changing it:
```bash
docker compose build frontend
docker compose up -d frontend
```

## Backups

```bash
# PostgreSQL
scripts/backup_db.ps1     # or backup_db.sh on Linux
# Exports to database/backups/<timestamp>.sql.gz
```

## Logs

```bash
docker compose logs -f <service-name>
# Examples:
docker compose logs -f risk-engine
docker compose logs -f notification-service
```

## Health endpoints

Every service exposes `GET /health`:
```bash
for port in 8080 8081 8082 8083 8084 8085 8086 8090 8091 8092; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health || echo "unreachable"
done
```