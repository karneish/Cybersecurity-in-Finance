# Sovereign Cyber-Risk Observatory (SCRO) — Implementation Plan

> Problem Statement 26105 — AI-Powered Continuous Cyber Risk Quantification
> and Investment Optimization Platform
> Date: 2026-09-05 | Status: BUILD COMPLETE — 116 backend tests green + 48 frontend Vitest green; full-stack smoke `scripts/smoke_sacro.ps1` 12/12 PASS (2026-09-20)

## 1. Background

The existing platform (CyberRisk Twin, ~95% complete) converts cybersecurity
telemetry into quantified financial risk (EAL in INR, 0-100 risk scores) and
optimizes security investment via OR-Tools. All 12 containers run end-to-end.
The risk-engine already implements: compliance mapping (RBI/SEBI/DPDP/NIST/CIS/ISO),
tamper-evident SHA-256 audit chain, Monte Carlo loss distribution, forecast,
data-quality confidence, risk graph + blast radius, crown-jewel attack paths,
and a live Redis→recalc→WebSocket event loop.

## 2. Elevation

FROM: one organization's cyber risk dashboard
TO: **Sovereign Cyber-Risk Observatory (SCRO)** — a national digital twin that
rolls quantified cyber risk up through asset → agency → sector → region → nation,
with regulator-grade drill-down, national cyber exercises (drills), national
budget allocation across sectors, third-party/vendor risk cascade (TPRM), and a
tamper-evident evidence chain.

The upgrade is aggregation + governance + presentation — the engine is reused.
This keeps it implementable both in this project and in real life.

## 3. Confirmed Scope (from stakeholder Q&A)

- [x] Full observatory: national/region/sector/agency roll-ups + SRI + drill
- [x] Sector-level compliance + regulator-grade drill-down
- [x] National budget allocator (sector-level OR-Tools)
- [x] Third-Party / Vendor Risk (TPRM) cascade module
- [x] Both government personas: Ministry/CERT-In oversight AND regulator (RBI-style)
- [x] Reliability + gov-readiness hardening

## 4. Environment / Prerequisites

- [x] Create local `.env` (gitignored) with: DATABASE_URL, DB_USER, DB_PASSWORD
      (done — Phase E5; .env.example is the template)
- [x] NeonDB decision — local Postgres (`cyberrisk`) in use; NeonDB switch deferred until deployment
- [x] Node 18+ (frontend), Python 3.11/3.12 (services), Docker (JDK n/a after Java→Python migration)

## 5. Key Design Decisions (locked)

- D1. Region view = ECharts heatmap matrix (NO external India geojson — reliable offline)
- D2. Inter-agency federation simulated via gov.agencies hierarchy (multi-tenant = Phase 3)
- D3. Seeding stays idempotent; existing 12 assets get UPDATED with governance tags,
      not re-created (migrate_and_seed.py skips when assets exist)
- D4. All new endpoints follow the existing camelCase-on-wire + snake_case storage pattern
- D5. No new math or infra — every new module calls existing core engines
- D6. Secrets move strictly to `.env`; nothing new hardcoded

## 6. Architecture Map (new vs reused)

| Layer | Reused | New |
|---|---|---|
| DB | asset/vuln/control/risk/investment schemas | gov schema + asset.assets governance columns |
| risk-engine | RiskCalculator, EALCalculator, ScenarioSimulator, ComplianceMapper, DataQualityEngine, RiskGraph, AuditChain, event_consumer | national_twin.py, tprm.py, drill_engine.py, sector compliance, new routes |
| investment-optimizer | OR-Tools optimizer.py | national/sector-scope optimize route |
| frontend | client.ts pattern, EChart.tsx, MainLayout, App.tsx | /national page, national + tprm components, api+types additions |
| infra | docker-compose | healthchecks, restart policy, .env-driven secrets |

## 7. Database Changes — Migration `008_create_sovereignty_tables.sql`

### 7.1 asset.assets new columns
- ADD COLUMN IF NOT EXISTS sector VARCHAR(50)
- ADD COLUMN IF NOT EXISTS region VARCHAR(50)
- ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES gov.agencies(id)
- ADD COLUMN IF NOT EXISTS is_critical_infra BOOLEAN DEFAULT false
- ADD COLUMN IF NOT EXISTS classification VARCHAR(20) DEFAULT 'CONFIDENTIAL'
- CREATE INDEX idx_assets_sector_region ON asset.assets(sector, region)

### 7.2 New gov schema tables
- gov.agencies (id, name, agency_type, sector, region, parent_agency_id, classification)
- gov.sector_profiles (sector PK, sector_name, regulator, threshold_critical_mln, weight)
- gov.exercises (id, name, scenario_key, impact_scope, sector, region, baseline_eal,
  simulated_eal, eal_reduction, eal_reduction_percent, status, executed_by, executed_at)
- gov.early_warnings (id, warning_type, target_type, target_id, severity, title,
  description, threshold_value, current_value, status, created_at)
- gov.vendors (id, name, vendor_type, criticality_score, business_value_inr, sector,
  region, assessment_score, last_assessed_at)
- gov.asset_vendors (id, asset_id FK, vendor_id FK, service_type, risk_share, UNIQUE(asset_id, vendor_id))

## 8. New API Endpoints

### risk-engine (/api/risk)
- [x] GET /risk/national/summary — national totals + top sectors + top CI assets
- [x] GET /risk/national/sectors — per-sector rollups (EAL, score, coverage, SRI, vulns)
- [x] GET /risk/national/regions — per-region rollups (heatmap payload)
- [x] GET /risk/national/agencies — per-agency rollups + hierarchy
- [x] GET /risk/national/sri — Sovereign Risk Index + per-sector breakdown
- [x] GET /risk/national/report — regulator-ready report (rollups + compliance +
      data-quality + audit verify())
- [x] GET /risk/compliance/{sector} — sector-scoped compliance coverage
- [x] POST /risk/exercises — create/run a drill
- [x] GET /risk/exercises — drill history
- [x] GET /risk/tprm — vendor exposure summary
- [x] GET /risk/tprm/vendors — vendor list w/ compromise probability
- [x] GET /risk/tprm/cascade/{vendor_id} — vendor → asset upstream cascade
- [x] GET /risk/tprm/asset/{asset_id} — asset vendor-attribution

### investment-optimizer (/api/investment)
- [x] POST /investment/national/optimize — national budget across sectors + national ROSI

## 9. TODO — IMPLEMENTATION TASKS

### PHASE A — Database & Seed
- [x] A1. Create database/migrations/008_create_sovereignty_tables.sql (Section 7 DDL)
- [x] A2. Extend database/migrate_and_seed.py:
      - [x] Seed gov.agencies (3 agencies: Payments Corp/BANKING, Telecom Ministry/TELECOM,
            Health Authority/HEALTH; regions incl. north/south/west/east)
      - [x] Seed gov.sector_profiles (BANKING→RBI, PAYMENTS→RBI, TELECOM→TRAI,
            HEALTH→IRDAI+DPDP, GOVERNMENT→NCIIPC)
      - [x] UPDATE existing 12 assets with sector/region/agency_id/is_critical_infra
            (by fixed string IDs; idempotent)
      - [x] Seed gov.vendors (3) + gov.asset_vendors links w/ risk_share
      - [x] Seed 1 historical gov.exercises row
      - [x] Extend idempotency guard to gov tables
- [x] A3. Run migration + seed against LOCAL postgres (db `cyberrisk`); verify counts
      (NeonDB migration deferred — user will switch when ready)

### PHASE B — risk-engine (Python)
- [x] B1. core/national_twin.py — SovereignTwin(db)
      - [x] summary() / sectors() / regions() / agencies() roll-ups
      - [x] sovereign_risk_index(sector) = 0.35·norm(score) + 0.30·norm(EALshare)
            + 0.20·controlCoverage + 0.15·dataConfidence
      - [x] regulator_report() (reuses ComplianceMapper + DataQualityEngine + AuditChain.verify)
- [x] B2. core/tprm.py — TPRMManager(db)
      - [x] vendor_compromise_probability from assessment_score + open vulns + service_type
      - [x] upstream cascade vendor → assets → dependents (reuse RiskGraph semantics)
      - [x] contribution EAL = asset impact × risk_share; per-vendor + per-asset exposure
- [x] B3. core/drill_engine.py — DrillEngine(db)
      - [x] Templates: WORM, RANSOMWARE, SUPPLY_CHAIN, DDOS (scope sector/region/agency/national)
      - [x] Builds changes[] → reuses ScenarioSimulator
      - [x] Persists gov.exercises + commits audit-chain entry
      - [x] Scope-corrected before/after EAL per drill scope (vs enterprise-wide)
- [x] B4. core/compliance.py — add IRDAI, TRAI, NCIIPC/CERT-In + sector_compliance(sector)
- [x] B5. schemas/risk_schemas.py — National*, Sector*, Region*, Agency*, SRI*, Report*,
      Exercise*, TPRM* models (camelCase aliases)
- [x] B6. api/routes/risk_routes.py — add the 13 new endpoints (Section 8)
- [x] B7. core/event_consumer.py — exponential backoff + jitter in reconnect loop (reliability)

### PHASE C — investment-optimizer (Python)
- [x] C1. core/optimizer.py — national/sector-scope mode (reuse OR-Tools objective)
- [x] C2. api/routes/optimize_routes.py — POST /investment/national/optimize
      (allocation per sector, projected EAL reduction, national ROSI)

Note (verified): seeded gov.exercises + EAL_SPIKE warning baselines re-synced to the
live RiskCalculator engine (₹127.0M banking) so drill history is consistent with live
drills. Seed risk_calculations rows are simplified placeholders (pre-existing platform
behavior); live EAL is always computed by RiskCalculator (same as /score, /eal).

### PHASE D — Frontend (React)
- [x] D1. src/api/riskApi.ts — 13 new fns; src/api/investmentApi.ts — nationalOptimize
- [x] D2. src/types/national.ts — all response types
- [x] D3. src/components/national/:
      - [x] NationalSummaryHeader (national EAL + SRI + top sector)
      - [x] SectorRiskChart (ranked/treemap)
      - [x] RegionHeatmap (ECharts heatmap matrix)
      - [x] AgencyBreakdown (hierarchy + drill-down to assets)
      - [x] DrillPanel (scenario + scope + RUN + before/after)
      - [x] NationalBudgetAllocator (budget input + per-sector allocation + ROSI)
      - [x] ComplianceSectorPanel (sector regulator gaps)
      - [x] TprmPanel (vendors + cascade drill-down)
      - [x] RegulatorReportView (regulator-ready report + audit verify badge)
- [x] D4. pages/NationalObservatory.tsx — two tabs:
      - [x] Oversight tab (Ministry/CERT-In: KPIs, sector/region, SRI, drill, budget)
      - [x] Regulatory tab (RBI-style: agency compliance gaps, warnings, TPRM, report)
- [x] D5. App.tsx — add /national route
- [x] D6. MainLayout.tsx — add "National Observatory" nav item (lucide Landmark/Flag icon)

### PHASE E — Hardening & Reliability
- [x] E1. FIX verified bug: services/api-gateway/src/main/resources/application.yml
      lines 21, 37 → ${VULN_SERVICE_URL}, ${INVESTMENT_URL} (match compose + .env)
- [x] E2. Grep ALL Java services for ${...} appConfig vars and align with compose env names
- [x] E3. docker-compose.yml: remove hardcoded NeonDB url/user/pass → ${JDBC_DATABASE_URL},
      ${DB_USER}, ${DB_PASSWORD} (Python uses ${DATABASE_URL}); healthchecks + restart:
      unless-stopped added to all services
- [x] E4. .env.example — document DATABASE_URL/JDBC_DATABASE_URL/DB_USER/DB_PASSWORD
      (jdbc form for Java, postgres form for Python)
- [x] E5. Create local .env from existing creds (gitignored)
- [x] E6. Frontend: wire dead RiskDetailModal into RiskAnalysis asset rows
- [x] E7. Frontend: replace hardcoded BudgetCard allocated={0} with live data
- [x] E8. README.md at repo root (setup, env, ports, demo)
- [x] E9. .github/workflows/ci.yml — frontend build + python compileall (all Python services + `services/common`).

### PHASE G — Java → Python Full Migration
- [x] G1. Port auth-service to Python/FastAPI (login, register, refresh-token rotation, users/RBAC) using shared `cybercommon`.
- [x] G2. Port asset-service, vulnerability-service, control-service, ingestion-service, notification-service, api-gateway to Python.
- [x] G3. Shared `services/common/cybercommon` package: Postgres models, JWT, bcrypt, Redis, FastAPI auth deps.
- [x] G4. Migration `database/migrations/010_create_python_features.sql` (refresh_tokens, security_events, compliance_docs + pgvector).
- [x] G5. Gateway features: JWT filter, Redis rate limiting (per-IP + per-user), per-service circuit breaker, excluded paths.
- [x] G6. Risk-engine (Python): XGBoost ML forecast at `/api/risk/forecast/ml` (weekly-seeded snapshots feed supervised training).
- [x] G7. ai-service RAG compliance: pgvector-backed corpus (ISO 27001, NIST CSF, CIS, RBI, SEBI, DPDP, TRAI, IRDAI, NCIIPC) + `/api/ai/rag/*`.
- [x] G8. Notification-service switched from SockJS/Spring STOMP to native WebSocket STOMP broker (`/ws`); frontend `useWebSocket.ts` uses `brokerURL` derived from the page origin (empty `VITE_WS_URL`).
- [x] G9. Delete Java sources + Maven poms; CI Java job removed; docker-compose 100% Python (build context `./services`, common installed first).

### PHASE F — Verification & Demo
- [x] F1. docker compose build (all 12 + no new services) — built & running; validated via
      docker compose up + smoke test. NOTE: DB host in .env uses host.docker.internal
      (containers can't reach a host-local Postgres via localhost)
- [x] F2. Frontend: npm run build — zero TS errors (+ python -m compileall across services)
- [x] F3. scripts/smoke_sacro.ps1 (or .sh) end-to-end: login → /risk/national/summary →
      /risk/compliance/{sector} → POST /risk/exercises (drill) → /investment/national/optimize →
      /risk/tprm/cascade/{id} → /risk/audit/verify → WebSocket alive
      (match real auth API: login resp field `token`, register body `fullName`)
- [x] F4. Manual demo run — both personas *(executed 2026-09-19 against the live stack, fully covered by
       smoke_sacro.ps1 12/12 + README §20a)*:
      1. Ministry oversight: national EAL ₹6,520 Cr + SRI 0.70, sector heatmap, RANSOMWARE drill (+54% surge)
      2. Regulator: per-agency RBI/DPDP compliance (BANKING → 6 RBI requirements), vendor cascade
         (₹15,863 Cr exposure / 4 direct assets), audit verify INTACT, AI summary (mock-LLM)
      3. National budget: ₹5 Cr → ₹1.54 Cr allocated across 3 sectors / 22 controls → −67.5% EAL, ROSI ≈ +285,000%
- [x] F5. Update TODO.md with new completed items + overall status

### PHASE H — Delivery close-out (2026-09-19)
- [x] H1. WS6 extras: OR-Tools **CP-SAT** knapsack in `optimizer.py` (`_maximize_mode`, `optimize_national`); `delay_remediation` scenario + `delay_analysis` block in `scenario_engine.py`; business-unit rollup `EALCalculator.business_units()` + `GET /api/risk/business-units`; `tests/test_cp_knapsack.py` (6) + `tests/test_delay_scenario.py` (6)
- [x] H2. WS7 — downloadable reports: `GET /api/risk/report/export?section=eal|compliance|business-units|trends|full` (CSV via `_csv_download`); `frontend/src/utils/exportCsv.ts` (+tests); export buttons on `ExecutiveDashboard`
- [x] H3. WS8 — alert engine: migration `012_create_alert_system.sql` (`alert_rules` + `alert_events`, 4 seeded rules); `cybercommon.models.AlertRule/AlertEvent`; notification-service `core/alerts.py` + `routes/alerts_routes.py`; STOMP auto-eval on `risk.events.updated` + broadcast on `risk.events.alert → /topic/risk/alert`; gateway route `/api/alerts`; `AlertsFeed.tsx` on ExecutiveDashboard
- [x] H4. Test expansion: ai-service **OpenAI path** test (`tests/test_openai_integration.py`) + notification-service **STOMP bridge** tests (`tests/test_stomp_bridge.py`) → 116 backend tests total
- [x] H5. Infrastructure + docs: `db-init` migration/seed container in `docker-compose.yml` (13th service); `README.md` §16 route table rewritten to match `App.tsx`; WS broker-URL docs fixed (empty `VITE_WS_URL`); `.env.example`, `frontend/README.md`, `docs/{OPERATIONS,DEPLOYMENT,SECURITY_HARDENING}.md`, `SUPPORT.md` updated

## 10. Definition of Done
- All Phase A-F checkboxes ticked and verified
- Migration 008 + seed applied idempotently on existing NeonDB
- 13 new risk endpoints + 1 new investment endpoint returning camelCase payloads
- /national page live on :3000 with both persona tabs; all panels fetch live APIs
- docker-compose secrets removed; .env drives DB; gateway routes fixed
- Smoke test passes end-to-end; builds clean (TS + Java + Python)

## 11. Risks & Mitigations
- Existing DB reachable? → fallback: provide new NeonDB link (Phase 0)
- Java env drift beyond gateway → E2 greps all services before compose up
- ECharts v6 heatmap quirks → fall back to ranked bar list for regions
- Seed drift on already-seeded DB → A2 uses UPDATE-by-fixed-UUID path

## 12. Notes for Real-Life Implementation (non-hackathon)
- gov.agencies becomes real multi-tenant enterprises; federation via anonymized
  telemetry (differential privacy) pushed by date-partitioned data feeds
- National drill maps to CERT-In/NCIIPC exercises; budgets align to annual schemes
- Evidence chain adds regulator public-key verification anchors

## 13. Hardening Sprint (2026-09-13)

| Area | Work Completed |
|------|----------------|
| **Config hygiene** | All 11 `config.py` use `SettingsConfigDict(env_file=".env", extra="ignore")` — root `.env` no longer crashes pydantic; password hashing via `bcrypt` directly (passlib incompatible with bcrypt 5.x); fixed truncated demo bcrypt seed hashes |
| **Backend quality** | 63 Python tests green across 5 suites; `python -m compileall` +1 `cybercommon` package; CI `python-tests` job added |
| **Structured logging** | `cybercommon.logging_setup` JSON formatter + uvicorn patch wired into all 10 services |
| **DB pooling** | `pool_size/max_overflow/pool_recycle/pool_timeout/pool_pre_ping` env-configurable across cybercommon/risk-engine/investment-optimizer |
| **Gateway hardening** | Security headers middleware + Prometheus `/metrics` + `/api-docs` index (4 gateway tests) |
| **Caching** | `cybercommon.cache` Redis util + `@cached` decorator; national observatory endpoints cached (TTL configurable); evicted on risk events |
| **Frontend** | Vitest + RTL (36 tests), ESLint flat config + Prettier, toast system, WS backoff, PDF export, hardened `nginx.conf`, `npm run build` clean |
| **Ops** | `scripts/backup_db.{sh,ps1}` pg_dump backups with retention; Mermaid diagrams in `architecture.md` |