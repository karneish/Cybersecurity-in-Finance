# asset-service

Asset inventory, dependency graph, criticality scoring, and statistics.

**Port:** 8082  
**Stack:** FastAPI + SQLAlchemy

## Key features

- **CRUD:** create, read, update, delete assets
- **Filters:** by type, environment, owner, exposure, sector, region, agency
- **Criticality scoring:** 0–100 score computed from business value, exposure, sensitivity, and critical-infrastructure flag
- **Dependency graph:** edges between assets (type: network/logic/data), with blast-radius and attack-path queries
- **Stats:** counts by type, environment, owner, exposure, severity, criticality band

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/assets` | List with pagination + filters |
| POST | `/api/assets` | Create (auto-computes criticality) |
| GET | `/api/assets/stats` | Distribution statistics |
| GET | `/api/assets/{id}` | Full detail + dependencies |
| PUT | `/api/assets/{id}` | Update (recomputes criticality) |
| DELETE | `/api/assets/{id}` | Delete |
| GET | `/api/assets/{id}/dependencies` | Dependency edges |
| POST | `/api/assets/{id}/dependencies` | Add dependency edge |
| DELETE | `/api/assets/{id}/dependencies/{depId}` | Remove edge |

## Data model

Assets have governance tags: `sector`, `region`, `agency`, `critical_infrastructure`,
`classification`. These drive the national observatory roll-ups in risk-engine.