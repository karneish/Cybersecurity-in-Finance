# control-service

Security control catalogue, effectiveness metrics, and per-asset coverage.

**Port:** 8084  
**Stack:** FastAPI + SQLAlchemy

## Key features

- **Control catalogue:** MFA, patching, EDR, firewall, IDS, backup, awareness, IAM, wire fraud detection
- **Effectiveness scoring:** effectiveness × coverage × maturity model
- **Coverage metrics:** per-control-type coverage across all assets
- **Asset binding:** attach/detach controls to specific assets with effectiveness overrides
- **Lifecycle:** status tracking (PLANNED → IMPLEMENTED → ACTIVE → DEPRECATED)

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/controls` | List with filters (type, status, maturity) |
| GET | `/api/controls/effectiveness` | Ranking by effectiveness × coverage × maturity |
| GET | `/api/controls/coverage` | Coverage by control type |
| POST | `/api/controls` | Create |
| PUT | `/api/controls/{id}` | Update |
| DELETE | `/api/controls/{id}` | Delete |
| POST | `/api/controls/asset/{assetId}` | Attach control to asset |
| PUT | `/api/controls/{id}/status` | Update lifecycle status |
| GET | `/api/controls/asset/{assetId}` | Controls on an asset |

## Risk reduction

Each control type has a maximum risk reduction weight used by the risk-engine's
independence model:

| Control type | Max reduction |
|---|---|
| PATCHING | 0.30 |
| MFA | 0.25 |
| EDR | 0.20 |
| IAM | 0.18 |
| FIREWALL | 0.15 |
| IDS | 0.12 |
| BACKUP | 0.10 |
| SECURITY_AWARENESS | 0.10 |