# Database

## Structure

The platform uses PostgreSQL with domain-specific schemas:

| Schema | Purpose |
|---|---|
| `auth` | Users, audit logs, refresh tokens |
| `asset` | Asset inventory, dependency graph |
| `vuln` | Vulnerabilities, findings |
| `control` | Security controls, asset-control mappings |
| `risk` | Risk calculations, snapshots, events, audit entries |
| `investment` | Optimiser plans and line items |
| `gov` | Agencies, sector profiles, exercises, vendors, compliance docs |
| `public` | Data sources, security events |

## Files

| File | Purpose |
|---|---|
| `init.sql` | Creates all schemas |
| `001_create_auth_tables.sql` through `010_create_python_features.sql` | Sequential migrations |
| `migrate_and_seed.py` | Runs all migrations + seeds demo data (idempotent) |
| `demo_login_pgadmin.sql` | pgAdmin helper for the auth schema |
| `backups/` | Timestamped SQL dumps from backup scripts |

## Migrations

```bash
# From host (Postgres running locally):
python database/migrate_and_seed.py

# From Docker:
docker compose exec api-gateway python database/migrate_and_seed.py
```

Safe to re-run — the seeder is idempotent and skips existing data.

## Seed data

- 12 assets with governance tags (sector/region/agency/classification)
- 15 vulnerabilities with CVSS scores
- 10 controls with effectiveness/coverage
- 14 asset-control relationships
- 18 dependency edges
- 25 weekly risk snapshots per asset (for ML training)
- 3 agencies, 3 sector profiles, 3 vendors
- 7 ingestion data sources
- RAG compliance corpus (seeded lazily by ai-service on first query)

## Backup scripts

```bash
scripts/backup_db.ps1     # Windows
scripts/backup_db.sh      # Linux/macOS
```

Exports to `database/backups/<timestamp>.sql.gz`.