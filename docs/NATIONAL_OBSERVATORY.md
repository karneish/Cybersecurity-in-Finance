# National Observatory (SCRO) field guide

The Sovereign Cyber-Risk Observatory (SCRO) is the national-tier view in the
platform. It rolls quantified asset risk up through **agency → sector → region →
nation** and lets ADMIN users run national exercises and budget allocation.

## Access control

All `/api/risk/national/*` endpoints require the **ADMIN** role. The gateway
enforces this via the JWT role claim — the frontend hides the menu item for
non-ADMIN users, but the server is the real gate.

## Concepts

| Concept | What it answers |
|---|---|
| National summary | "What is the whole-nation EAL and SRI right now?" |
| Sector profile | Per-sector EAL, top risks, regulator, thresholds |
| Region heatmap | Geographic distribution of at-risk assets (ECharts world map) |
| Agency breakdown | Roll-up by regulating agency (RBI, CERT-IN, NCIIPC) |
| National drill | "What happens to sector EAL if ransomware/DDOS/supply-chain hits?" |
| Budget allocator | "Given ₹X, which sectors/controls reduce risk the most?" |
| Regulator report | Compliance status + audit-chain verification badge |
| Early warnings | Pre-emptive national advisories |

## Key endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/risk/national/summary` | EAL, SRI, top sectors, critical assets |
| `GET /api/risk/national/sectors` | Sector profiles |
| `GET /api/risk/national/regions` | Region heatmap data |
| `GET /api/risk/national/agencies` | Agency breakdown |
| `POST /api/risk/national/sri` | Recompute SRI |
| `GET /api/risk/national/report` | Regulator-grade report |
| `POST /api/risk/exercises` | Run WORM/RANSOMWARE/SUPPLY_CHAIN/DDOS drill |
| `POST /api/investment/national` | Allocate national budget across sectors |
| `POST /api/risk/audit/verify` | Verify the tamper-evident audit chain |
| `GET /api/risk/national/early-warnings` | Advisories |

## Drill workflow

1. ADMIN selects a drill type (e.g. RANSOMWARE).
2. `POST /api/risk/exercises` copies production snapshots and applies per-sector surge multipliers.
3. Sector EAL surges are recomputed and persisted as `risk_events`.
4. `risk.events.updated` is published to Redis → WebSocket → frontend drill panel refreshes live.
5. Output is finalised (`/finalize`) and an audit-chain entry is written.