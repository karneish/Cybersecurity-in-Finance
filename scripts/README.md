# Scripts

## Smoke test

```bash
powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1
```

End-to-end verification of the full stack:
1. Health checks on all 12 services
2. Login/register for all 4 demo users
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
| `smoke_sacro.ps1` | PowerShell, `Invoke-WebRequest` (included in Windows) |
| `backup_db.ps1` | PowerShell, `pg_dump` in PATH |
| `backup_db.sh` | bash, `pg_dump` in PATH |

All scripts read from `.env` or use sensible defaults matching `.env.example`.