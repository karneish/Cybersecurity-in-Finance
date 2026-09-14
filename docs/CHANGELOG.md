# CHANGELOG

Incremental build log for the Sovereign Cyber-Risk Observatory (SCRO) upgrade.

Entries 34-80 record iterative hardening notes applied after the initial 33 feature commits.- 2026-09-05 entry 34/80 - Add region heatmap legend thresholds for EAL exposure
- 2026-09-05 entry 35/80 - Normalize SRI sector weights for data confidence
- 2026-09-05 entry 36/80 - Aggregate TPRM cascade depth for tier-2 vendors
- 2026-09-05 entry 37/80 - Make drill engine idempotent for repeated scenario runs
- 2026-09-05 entry 38/80 - Guard budget allocator against zero-budget input
- 2026-09-05 entry 39/80 - Roll up data confidence into national summary
- 2026-09-05 entry 40/80 - Restructure regulator report tables for print
- 2026-09-05 entry 41/80 - Refresh early-warning thresholds in national summary
- 2026-09-05 entry 42/80 - Add severity colors to sector compliance gaps
- 2026-09-05 entry 43/80 - Enable dependency-graph drill down in agency breakdown
- 2026-09-05 entry 44/80 - Add horizontal scroll fallback to region heatmap
- 2026-09-05 entry 45/80 - Tag drill audit-chain entries with exercise id
- 2026-09-05 entry 46/80 - Normalize vendor risk-share in TPRM rollups
- 2026-09-05 entry 47/80 - Parallelize sector solve in national optimizer
- 2026-09-05 entry 48/80 - Normalize report timestamps to UTC
- 2026-09-05 entry 49/80 - Extend idempotency guard to gov tables in migration
- 2026-09-05 entry 50/80 - Use ON CONFLICT upsert in governance seed
- 2026-09-05 entry 51/80 - Add python compileall step to CI
- 2026-09-05 entry 52/80 - Add java compile matrix with caching to CI
- 2026-09-05 entry 53/80 - Cache frontend build in CI
- 2026-09-05 entry 54/80 - Fix auth token scope bug in smoke script
- 2026-09-05 entry 55/80 - Add register fallback path to smoke script
- 2026-09-05 entry 56/80 - Order gateway routes for /api/risk precedence
- 2026-09-05 entry 57/80 - Dedupe gateway CORS headers on responses
- 2026-09-05 entry 58/80 - Tune compose healthcheck start_period
- 2026-09-05 entry 59/80 - Persist redis data via compose named volume
- 2026-09-05 entry 60/80 - Document remote Postgres variants in .env.example
- 2026-09-05 entry 61/80 - Refresh README port matrix and service map
- 2026-09-05 entry 62/80 - Polish README demo walkthrough steps
- 2026-09-05 entry 63/80 - Add route guard before national page
- 2026-09-05 entry 64/80 - Persist persona tab selection on national page
- 2026-09-05 entry 65/80 - Format national KPIs in INR crores
- 2026-09-05 entry 66/80 - Format sector chart tooltips as INR
- 2026-09-05 entry 67/80 - Handle empty state in region heatmap
- 2026-09-05 entry 68/80 - Handle empty state in agency list
- 2026-09-05 entry 69/80 - Add vendor filter search to TPRM panel
- 2026-09-05 entry 70/80 - Add framework selector to compliance panel
- 2026-09-05 entry 71/80 - Add copy-to-clipboard to regulator report
- 2026-09-05 entry 72/80 - Animate drill result timeline
- 2026-09-05 entry 73/80 - Add ROSI tooltip to budget allocator
- 2026-09-05 entry 74/80 - Show SRI breakdown as stacked bars
- 2026-09-05 entry 75/80 - Order early warnings recent-first
- 2026-09-05 entry 76/80 - Emphasize critical assets in cascade paths
- 2026-09-05 entry 77/80 - Refresh exercise history after drill run
- 2026-09-05 entry 78/80 - Format heatmap legend values as INR
- 2026-09-05 entry 79/80 - Aggregate smoke script exit codes
- 2026-09-05 entry 80/80 - Final validation pass against live stack

## 81–103: Python-Only (Java → FastAPI) Migration

- 2026-09-11 entry 81 - Create shared `services/common/cybercommon` package (DB models, JWT, bcrypt, Redis, FastAPI deps)
- 2026-09-11 entry 82 - Migration 010: `auth.refresh_tokens`, `public.security_events`, `gov.compliance_docs` (+ pgvector)
- 2026-09-11 entry 83 - Port auth-service to Python (login/register/refresh rotation/roles/users)
- 2026-09-11 entry 84 - Port asset-service to Python (CRUD/dependencies/criticality/stats)
- 2026-09-11 entry 85 - Port vulnerability-service to Python (CRUD/findings/prioritization/stats/bulk)
- 2026-09-11 entry 86 - Port control-service to Python (CRUD/effectiveness/coverage/status)
- 2026-09-11 entry 87 - Port ingestion-service to Python (ingest/simulate/stats + event replay + live SIEM/EDR/IAM/CSPM connectors)
- 2026-09-11 entry 88 - Port notification-service to Python native WebSocket STOMP broker (/ws)
- 2026-09-11 entry 89 - Rewrite api-gateway in Python (JWT filter, Redis rate limiting, per-service circuit breaker)
- 2026-09-11 entry 90 - Add XGBoost ML forecast to risk-engine (`/api/risk/forecast/ml`) with weekly-seeded snapshots
- 2026-09-11 entry 91 - Add RAG compliance to ai-service (pgvector corpus + `/api/ai/rag/query|status|refresh`)
- 2026-09-11 entry 92 - Frontend `useWebSocket.ts` → native STOMP `brokerURL`; `VITE_WS_URL=ws://localhost:8086/ws`
- 2026-09-11 entry 93 - Rewrite docker-compose + .env.example to Python-only (build context ./services, common installed first)
- 2026-09-11 entry 94 - Delete Java sources + Maven poms (7 services); CI Java job removed; update docs/TODO
