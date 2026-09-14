# Mock data

JSON fixture files used by `database/migrate_and_seed.py` to populate the database with demo data.

## Files

| File | Records | Description |
|---|---|---|
| `assets.json` | 12 | Banking/telecom/health assets with governance tags, business values, criticality scores |
| `vulnerabilities.json` | 15 | CVEs with CVSS scores, severities, exploitability ratings |
| `controls.json` | 10 | Security controls (MFA, patching, EDR, firewall, etc.) with cost and effectiveness |
| `sample-events.json` | 5 | Example security events for ingestion pipeline testing |

## Asset governance tags

Each asset in `assets.json` includes:
- `sector`: BANKING, TELECOM, or HEALTH
- `region`: NORTH, SOUTH, EAST, or WEST
- `agency`: RBI, CERT_IN, or NCIIPC
- `critical_infrastructure`: boolean
- `classification`: RESTRICTED, CONFIDENTIAL, INTERNAL, or PUBLIC

## Seeding

```bash
python database/migrate_and_seed.py
```

The seeder is idempotent — re-running it will not duplicate records (it checks for existing data before inserting).