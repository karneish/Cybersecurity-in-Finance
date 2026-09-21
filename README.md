# CyberRisk Quantifier → Sovereign Cyber-Risk Observatory (SCRO)

**A national digital twin for continuous cyber-risk quantification and investment optimisation.**

It rolls quantified cyber risk up through **asset → agency → sector → region → nation**, lets a Ministry/CERT-In run **national cyber exercises** and allocate a **national security budget**, gives a regulator (RBI-style) **compliance-gap reports** and **third-party/vendor risk cascades (TPRM)**, explains every number with an **AI assistant**, forecasts EAL 12 months ahead with **XGBoost machine learning**, retrieves the *actual* legal/regulatory clauses with **RAG**, and streams every change live to the dashboard over **WebSocket**.

Built 100% on open, no-vendor-lock-in technology: every service is **Python (FastAPI)**, all storage is **PostgreSQL + Redis**, all ML is open source, and the LLM runs in a free **"mock" mode by default** — you pay ₹0 to run the whole thing locally.

---

## Table of contents

1. [What this project is (plain English)](#1-what-this-project-is-plain-english)
2. [The big ideas behind it](#2-the-big-ideas-behind-it)
3. [Feature catalogue (everything in the system)](#3-feature-catalogue-everything-in-the-system)
4. [Tech stack](#4-tech-stack)
5. [Architecture](#5-architecture)
6. [Repository layout — every file](#6-repository-layout--every-file)
7. [Services reference](#7-services-reference)
8. [Database & schema catalogue](#8-database--schema-catalogue)
9. [How the numbers are calculated](#9-how-the-numbers-are-calculated)
10. [Machine-learning forecast (XGBoost)](#10-machine-learning-forecast-xgboost)
11. [RAG compliance retrieval](#11-rag-compliance-retrieval)
12. [Authentication & gateway security](#12-authentication--gateway-security)
13. [Live notifications (WebSocket / STOMP)](#13-live-notifications-websocket--stomp)
14. [Ingestion pipeline](#14-ingestion-pipeline)
15. [Complete API reference](#15-complete-api-reference)
16. [Frontend reference](#16-frontend-reference)
17. [Environment variables (what every setting does)](#17-environment-variables-what-every-setting-does)
18. [Setup & running](#18-setup--running)
19. [Demo users](#19-demo-users)
20. [Smoke test](#20-smoke-test)
21. [Demo walkthrough (15 min)](#20a-demo-walkthrough-15-minute-script)
22. [CI / CD](#21-ci--cd)
23. [Budget — what it actually costs to build this today](#22-budget--what-it-actually-costs-to-build-this-today)
24. [Planned next steps (Phase 2/3)](#23-planned-next-steps-phase-23)
25. [Maintenance & operations](#24-maintenance--operations)
26. [Appendix A — file-by-file service notes](#25-appendix-a--file-by-file-service-notes)

---

## 1. What this project is (plain English)

Cyber risk is usually measured once a year with spreadsheets. This system makes it **live, quantified, and national**:

- Every **asset** (server, API, database, web app…) gets a **monetary figure** for how bad it is if hacked — its "Expected Annual Loss" or **EAL** in ₹.
- Every **vulnerability** is ranked by its **CVSS score** (the industry-standard 0–10 severity rating) and turned into a *probability of being exploited*.
- Every **security control** (MFA, patching, EDR, firewalls…) is scored for coverage and effectiveness and *reduces* that probability.
- Assets are grouped into **agencies → sectors** (banking, telecom, health) **→ regions → the whole nation**, so a government can see the **national EAL**, a national **Sovereign Risk Index (SRI)**, and a heatmap of where the money is at risk.
- The government can then run a **national drill** (e.g. "what if ransomware hits banking?") and a **national budget allocator** that says which sectors/controls give the most risk reduction per rupee (**ROSI** = Return On Security Investment).
- Everything is logged on a **tamper-evident audit chain** (hash-linked, SHA-256) so a regulator report can be verified as unmodified.
- An **AI assistant** answers plain-English questions ("what's our biggest risk?") by reading the live numbers, and a **RAG** engine pulls the *actual* regulation clauses (ISO 27001, NIST, RBI, SEBI, DPDP Act…) relevant to a question.

**Why it exists:** Problem Statement 26105 — *"AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform."* In plain words: **stop guessing, measure continuously, and spend money where it reduces real, quantified, monetary risk.**

---

## 2. The big ideas behind it

| Idea | What it means in practice |
|---|---|
| **Continuous, not annual** | New vulnerabilities and control changes ingest in real time; risk is recalculated and pushed live to the dashboard over WebSocket. |
| **Quantified in money (₹)** | Every risk has an Expected Annual Loss — a number a CFO/Finance Ministry understands. |
| **Whole-of-nation rollout** | Assets roll up via agencies → sectors → regions → nation, with regulator-grade drill-down. |
| **Optimise, don't just report** | OR-Tools (open-source solver) maximises EAL reduction for a given budget across sectors. |
| **Explainable AI** | LLM answers reference the *actual data and legal clauses*, not hallucinations; the ML forecast explains its method and falls back to a deterministic model when data is too small. |
| **Zero vendor lock-in** | FastAPI, PostgreSQL + pgvector, Redis, XGBoost, OR-Tools, Docker — all free/open source. The LLM works fully offline in mock mode. |
| **Auditable** | Every risk calculation/drill is chained and verifiable (SHA-256 linked entries) — regulator-grade evidence. |
| **Operationally realistic** | Toggleable simulated live connectors for SIEM/EDR/IAM/CSPM/Nessus feeds; events can be replayed. |

---

## 3. Feature catalogue (everything in the system)

### 3.1 Risk quantification engine
- Per-asset risk calculation: probability, financial impact, **0–100 risk score**, category (LOW/MEDIUM/HIGH/CRITICAL), **EAL (₹)**, control reduction, residual risk.
- **Dependency graph**: risk cascades through `asset.asset_dependencies` (blast radius, attack paths).
- **CVSS → probability mapping**, internet-exposure multiplier, data-sensitivity multiplier, control-reduction independence model.
- **Impact decomposition** into downtime / breach / regulatory / reputational components (always sums to the single-point impact).
- **Scenario simulator** (`/scenario/simulate`) — what-if events.
- **Loss distribution** — Monte-Carlo style distribution of annual loss (mean, p50, p95, VaR) for boards.
- **Trends, data-quality scoring, compliance mapping** per asset.
- **Do-nothing forecast** (deterministic) **and XGBoost ML forecast** (12-month projection of EAL / risk score / open vulns).
- Enterprise roll-ups (`/score`, `/eal`, `/drivers`).

### 3.2 National Observatory (SCRO)
- National summary: total EAL, Sovereign Risk Index (SRI), top sectors, top critical-infrastructure assets.
- Sector roll-ups, **region heatmap**, **agency breakdown**, each with drill-down.
- **National drills** (exercises): `WORM` / `RANSOMWARE` / `SUPPLY_CHAIN` / `DDOS`, with baseline→surge simulation, history, re-run, and idempotency.
- **National budget allocator**: given ₹X budget and a horizon, allocate across sectors with **ROSI** per sector.
- **Regulator-ready national report**: compliance status, data quality, audit-chain verification badge.
- **TPRM (third-party risk)**: vendor catalogue with assessment scores, **vendor → asset cascade** (which assets are exposed via which vendor), asset vendor attribution.

### 3.3 Compliance (RAG)
- Indexed regulatory/legal corpus: **ISO 27001, NIST CSF, CIS, RBI, SEBI, DPDP Act 2023, IT Act (Sec 70/NCIIPC), TRAI, IRDAI, NCIIPC**.
- Cosine-similarity retrieval over **pgvector**-compatible embeddings (stored as JSONB so it works even without the extension).
- `POST /api/ai/rag/query` → most relevant clauses + scores + a plain-English answer; `GET /api/ai/rag/status`; `POST /api/ai/rag/refresh`.

### 3.4 Identity & access (auth-service)
- Login / register (disabled by default — only the 3 seeded SCRO demo accounts) / **JWT access token** + **refresh token with rotation** (SHA-256 hashed, family-tracked, reuse-detection revokes the whole family).
- Roles: **ADMIN, CISO, ANALYST**. Role update & user delete (admin only). `GET /api/auth/me`, audit logging of logins/registers/role changes.

### 3.5 Gateway (api-gateway)
- Reverse proxy to all 9 backends behind one port (`8080`).
- **JWT validation** on everything except login/register/refresh + health.
- **Rate limiting** (Redis sliding window, per-IP and per-user).
- **Circuit breaker** per upstream service (opens on repeated server errors, auto-closes).
- Injects `X-User-Id` / `X-User-Roles` headers so downstream services trust the gateway.

### 3.6 Ingestion
- Ingest a single event (vulnerability/control/asset) or **batches**; events are normalised, persisted, published to Redis channels.
- **Simulators**: generate random vuln/remediate/control events; bulk simulation (`/simulate?count=N`).
- **Event replay**: replay N historical events on a timer (foreground or background job) into the live feed.
- **Live simulated connectors**: toggleable SIEM/EDR/IAM/CSPM/NESSUS-style emitters with per-connector records & interval.
- `/events` pagination and `/stats`.

### 3.7 Notifications (WebSocket / STOMP)
- Native WebSocket **STOMP 1.2** broker at `/ws` (`notification-service:8086`).
- Topics: **`/topic/risk/updated`** (risk recalculated) and **`/topic/ingestion/event`** (new ingested security events).
- Redis pub/sub → STOMP bridge thread; heartbeat + keep-alive handling.
- Frontend **notification bell** shows live events.

### 3.8 AI assistant
- `POST /api/ai/recommend` — control/remediation recommendations from live risk data.
- `POST /api/ai/query` — **intent classification** (NATIONAL / COMPLIANCE / TREND / FORECAST / VAR / INVEST / other) then routes to the real endpoint and answers in plain English.
- `POST /api/ai/explain/risk/{assetId}` — explains why an asset's risk is what it is.
- `POST /api/ai/summarize` — executive summary.
- **Mock LLM by default** (`USE_MOCK_LLM=true`) — fully offline; set `OPENAI_API_KEY` for real answers.

### 3.9 Investment Optimizer
- **Enterprise mode**: OR-Tools knapsack-style selection of controls for a budget, with ROSI.
- **National mode**: allocate a budget across sectors; per-sector allocations + portfolio ROSI.
- **Investment curve**, **ROSI leaderboard**, **plan save/load/history** (persisted in the `investment` schema).

### 3.10 Asset / Vulnerability / Control services (CRUD)
- **Assets**: CRUD, filters (type/environment/owner/exposure), **criticality scoring** (0–100), stats, dependency graph.
- **Vulnerabilities**: CRUD, CVSS→severity, **prioritisation**, stats, bulk load, per-asset listing, status updates, findings annotation.
- **Controls**: CRUD, **effectiveness**, **coverage**, per-asset controls, status updates.

### 3.11 Frontend (React + TypeScript)
11 pages, 40+ components, 8 typed API clients, a native-WebSocket STOMP live feed, light/dark theme, role-aware nav, national/persona views. Detail in [§16](#16-frontend-reference).

---

## 4. Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + ECharts | Fast SPA, rich charts, tree-shaken bundle |
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2 | One language across the whole stack, async, auto OpenAPI docs |
| API Gateway | FastAPI + httpx + Redis (rate limit + circuit breaker) | No vendor lock-in |
| ML | XGBoost, NumPy, SciPy | Battle-tested, CPU-friendly, no GPU needed |
| Optimisation | Google OR-Tools | Best-of-breed open-source solver |
| RAG / embeddings | Deterministic hashing embedder + **pgvector** extension | Offline, consistent, no embedding-API cost |
| Storage | PostgreSQL (one schema per domain) + Redis (pub/sub, rate limits, connector state) | Relational integrity + realtime |
| Realtime | Native WebSocket + STOMP 1.2 | Industry-standard push over plain WS |
| LLM | OpenAI (optional) + offline mock mode | Zero-cost default, upgradable |
| Containers | Docker + Docker Compose (13 services incl. `db-init` init) + nginx | Reproducible one-command stack |
| CI | GitHub Actions | Frontend build + Python compileall |

---

## 5. Architecture

```
                        ┌──────────────────────────────────────────────┐
   Browser (React) ────►│  frontend  (3000, nginx)                     │
   /api/* ─────────────►│  /api  → http://api-gateway:8080             │
   /ws/*  ─────────────►│  /ws   → http://notification-service:8086    │
                        └──────────────────────────────────────────────┘
                                        │  /api/*
                                        ▼
                      ┌──────────────────────────────────────────────┐
                      │            api-gateway (8080)                 │
                      │  JWT filter · per-IP & per-user rate limit   │
                      │  per-service circuit breaker · injects        │
                      │  X-User-Id / X-User-Roles                     │
                      └───────┬─────┬─────┬─────┬─────┬─────┬─────────┘
              ┌───────────────┤    │     │    │     │     │           │
              ▼               ▼     ▼      ▼    ▼      ▼             ▼
        auth-service    asset-service  vulnerability  control    ingestion
           (8081)          (8082)      (8083)       (8084)        (8085)
   login/refresh/roles   CRUD/dep/     CVSS→severity  controls   events,pub/sub,
   refresh rotation      criticality   findings/bulk   coverage   sim,replay,
                                                                 connectors
              ┌───────────────┬───────────────┬────────────────┐
              ▼               ▼               ▼                ▼
     risk-engine (8090)   investment-optimizer (8091)   ai-service (8092)
   EAL·scenario·graph      OR-Tools RO national ·       recommend·query
   drill·national twin     enterprise plans            explain·RAG
   TPRM·audit chain
   forecast + ML (xgboost)
              │               │                     │
              ▼               ▼                     ▼
     ┌──────────────────────────────────────────────────────────────┐
     │                     PostgreSQL (cyberrisk)                    │
     │  auth · asset · vuln · control · risk · investment · gov ·    │
     │  public (data_sources, security_events) + pgvector            │
     └──────────────────────────────────────────────────────────────┘
     ┌────────────────────────┐         ┌───────────────────────────────┐
     │ Redis 7 (6379)         │◄───────►│ notification-service (8086)   │
     │  pub/sub channels      │  bridge │  native WebSocket STOMP /ws   │
     │  rate-limit counters   │         │  /topic/risk/updated          │
     │  connector state/jobs  │         │  /topic/ingestion/event       │
     └────────────────────────┘         └───────────────────────────────┘
                                          ▲
                                          │ subscribe
                                     Browser WebSocket clients
```

**Request flow (example — "run a national drill"):**
1. `POST /api/risk/exercises` → gateway → risk-engine.
2. Risk-engine runs the drill scenario, recalculates the sector EAL surge, writes the exercise + audit-chain entries.
3. Risk-engine publishes `risk.events.updated` on Redis.
4. Notification-service's Redis bridge forwards it to WebSocket clients subscribed to `/topic/risk/updated`.
5. The frontend drill panel refreshes and shows before/after.

**Each path is exposed through route tables documented in [§15](#15-complete-api-reference).**

---

## 6. Repository layout — every file

```
.
├── .env.example                  # Template for all environment variables
├── .github/workflows/ci.yml      # CI: frontend build + python compileall
├── .gitignore
├── README.md                     # this document
├── architecture.md               # deeper architecture notes
├── implementation.md             # approved build plan + checkbox status
├── CyberRisk_Twin_UI_Theme_Template.md
├── TODO.md                       # project TODO / tracking
├── docs/CHANGELOG.md             # incremental build log (entries 1–94)
├── database/
│   ├── init.sql                  # creates auth/asset/vuln/control/risk/investment schemas
│   ├── demo_login_pgadmin.sql    # pgAdmin helper: auth schema + demo users
│   ├── migrate_and_seed.py       # migrations runner + mock-data seeder (idempotent)
│   └── migrations/
│       ├── 001_create_auth_tables.sql
│       ├── 002_create_asset_tables.sql
│       ├── 003_create_vuln_tables.sql
│       ├── 004_create_control_tables.sql
│       ├── 005_create_risk_tables.sql
│       ├── 006_create_investment_tables.sql
│       ├── 007_create_audit_tables.sql
│       ├── 008_create_sovereignty_tables.sql   # gov schema
│       ├── 009_create_data_sources.sql
│       └── 010_create_python_features.sql       # refresh_tokens, security_events,
│                                                #   pgvector, compliance_docs
├── docker-compose.yml           # 13-service, 100% Python stack
├── mock-data/                   # fixtures used by migrate_and_seed.py
│   ├── assets.json              # 12 assets
│   ├── vulnerabilities.json     # 15 vulnerabilities
│   ├── controls.json            # 10 controls
│   └── sample-events.json       # 5 example security events
├── scripts/
│   └── smoke_sacro.ps1          # end-to-end smoke test
├── services/
│   ├── common/cybercommon/      # SHARED package (installed first by every image)
│   │   ├── __init__.py          # exposes Settings/Base/SessionLocal/get_db
│   │   ├── config.py            # DB/Redis/JWT settings with sane defaults
│   │   ├── database.py          # SQLAlchemy engine + get_db() dependency
│   │   ├── models.py            # ORM: User, AuditLog, RefreshToken, Asset,
│   │   │                        #   AssetDependency, Vulnerability, SecurityControl,
│   │   │                        #   AssetControl, SecurityEvent, DataSource, Agency,
│   │   │                        #   ComplianceDocument
│   │   ├── jwt.py               # PyJWT HS256 create/decode + expiry
│   │   ├── security.py          # passlib bcrypt hash/verify
│   │   ├── redis.py             # Redis client + named channels
│   │   └── deps.py              # FastAPI auth deps + require_roles
│   ├── api-gateway/             # FastAPI proxy — 8080
│   ├── auth-service/            # Identity & access — 8081
│   ├── asset-service/           # Assets — 8082
│   ├── vulnerability-service/   # Vulnerabilities & findings — 8083
│   ├── control-service/         # Controls — 8084
│   ├── ingestion-service/       # Event ingestion — 8085
│   ├── notification-service/    # WebSocket STOMP — 8086
│   ├── risk-engine/             # Core quantification — 8090
│   ├── investment-optimizer/    # OR-Tools allocation — 8091
│   └── ai-service/              # AI assistant + RAG — 8092
└── frontend/                    # React SPA — 3000
```

> The full per-file tree (every Python module and every TSX component) is listed in [§25 — Appendix A](#25-appendix-a--file-by-file-service-notes).

---

## 7. Services reference

| Service | Port | Purpose |
|---|---|---|
| **api-gateway** | 8080 | JWT filter, rate limit, circuit breaker, reverse proxy to all backends |
| **auth-service** | 8081 | login / register / refresh-token rotation / users / roles |
| **asset-service** | 8082 | asset inventory, dependencies, criticality scoring, stats |
| **vulnerability-service** | 8083 | vulnerabilities, findings, prioritisation, stats, bulk |
| **control-service** | 8084 | controls catalogue, effectiveness, coverage |
| **ingestion-service** | 8085 | events ingest / simulate / replay + live connectors |
| **notification-service** | 8086 | native WebSocket STOMP broker |
| **risk-engine** | 8090 | EAL, scenario, graph, drill, national twin, TPRM, audit chain, forecasts |
| **investment-optimizer** | 8091 | OR-Tools return-on-investment + national budget allocation |
| **ai-service** | 8092 | recommendations, NL queries, explain, summarize, RAG |
| **frontend** | 3000 | React SPA (nginx serving the built bundle) |
| **redis** | 6379 | pub/sub, rate limits, connector state |

Every service exposes `GET /health`; the gateway also exposes `/actuator/health` for compatibility.

---

## 8. Database & schema catalogue

**Schemas:** `auth` · `asset` · `vuln` · `control` · `risk` · `investment` · `gov` · `public`.

| Migration | Schema | Tables | Purpose |
|---|---|---|---|
| `init.sql` | all core | — | creates schemas |
| 001 | auth | `users`, `audit_logs` | identity + audit trail; seeds 3 SCRO demo users |
| 002 | asset | `assets`, `asset_dependencies` | inventory (business value ₹, criticality 0–100, exposure, sensitivity) + dependency graph |
| 003 | vuln | `vulnerabilities` | CVSS, CWE, severity, exploitability, remediation, source, status |
| 004 | control | `security_controls`, `asset_controls` | control catalogue (cost, max risk reduction, time) + per-asset coverage/effectiveness/maturity |
| 005 | risk | `risk_calculations`, `risk_snapshots`, `risk_events` | versioned per-asset results, weekly history for forecasts, events |
| 006 | investment | `investment_plans`, `investment_items` | persisted optimiser plans & items |
| 007 | risk | `audit_entries` | hash-chained, tamper-evident evidence log |
| 008 | gov | `agencies`, `sector_profiles`, `exercises`, `early_warnings`, `vendors`, `asset_vendors` | national observatory data |
| 009 | public | `data_sources` | 7 seeded ingestion connectors |
| 010 | auth/public/gov | `refresh_tokens`, `security_events`, `compliance_docs` + `CREATE EXTENSION vector` | Python features: refresh rotation, ingested events, RAG corpus |

**Seeded data** (`python database/migrate_and_seed.py`, idempotent):
- **12 assets** (payments server, customer DB, IDP, web app, API gateway, email, backup, cloud mgmt, SIEM, dev env, analytics DB, VPN), deterministic UUIDs, governance-tagged (sector/region/agency/critical-infra/classification).
- **15 vulnerabilities**, **10 controls**, **14 asset-control relationships**, **18 dependency edges**, risk calculations for all 12 assets.
- **25 weekly risk snapshots** (24 weeks back → today) — enough history for XGBoost to train.
- **Sovereign data:** 3 agencies, 3 sector profiles (BANKING/TELECOM/HEALTH with regulators & thresholds), 3 vendors, 8 asset-vendor links, 1 historical ransomware exercise, 2 early warnings.
- **Ingestion:** 7 data sources (Nessus, CrowdStrike, Defender, Splunk, WAF/CDN, JSON/CSV batch).
- **RAG corpus** (`gov.compliance_docs`): seeded lazily by the ai-service on first `/query` or `/refresh`.

**pgvector:** migration 010 runs `CREATE EXTENSION IF NOT EXISTS vector`. RAG embeddings are stored as JSONB so everything works even where the extension is missing (retrieval falls back to pure-Python cosine); when pgvector is present it is ready for native `<=>` operators.

---

## 9. How the numbers are calculated

All formulas live in `services/risk-engine/app/core/formulas.py` — this is the single source of truth for the math.

### 9.1 CVSS → intrinsic exploitation probability (`cvss_to_probability`)
| CVSS band | Probability |
|---|---|
| 0.0–3.9 (LOW) | 0.06 |
| 4.0–6.9 (MEDIUM) | 0.23 |
| 7.0–8.9 (HIGH) | 0.48 |
| 9.0–10.0 (CRITICAL) | 0.76 |

### 9.2 Control reduction (independence model, Wagner-style)
Each control of type *T* reduces residual probability by `weight(T)` (capped so loss never goes negative):

| Control type | Weight (max risk reduction) |
|---|---|
| MFA (multi-factor auth) | 0.25 |
| PATCHING | 0.30 |
| EDR (endpoint detection) | 0.20 |
| FIREWALL | 0.15 |
| IDS (intrusion detection) | 0.12 |
| BACKUP | 0.10 |
| SECURITY AWARENESS | 0.10 |
| IAM (identity management) | 0.18 |
| WIREFRAUD_DETECTION | 0.08 |
| DEFAULT | 0.15 |

Actual reduction uses **effectiveness × coverage × maturity**. If coverage ≥ 0.8 the control type's weight counts in full; below 0.8 it scales. **Residual probability = initial × ∏(1 − effective_weight_t)** — controls are treated as independent layers.

### 9.3 Financial impact (`single_point_impact`)
A single monetary figure composed from four parts (component percentages are configurable constants; the four always sum to 1.0):
`impact = business_value_₹ × ( downtime% + breach% + regulatory% + reputational% )`

### 9.4 Exposure & sensitivity multipliers
- **Exposure multiplier:** `1.0 + internet_exposed * 0.35 + environment in (PROD, DR) * 0.20` (capped).
- **Sensitivity multiplier:** from `data_sensitivity` (PUBLIC 1.0, INTERNAL 1.15, CONFIDENTIAL 1.35, RESTRICTED 1.55).

### 9.5 Criticality score
`compliant with "criticality = weighted score"` — driven by business value, exposure, sensitivity, and critical-infrastructure flag (0–100).

### 9.6 Risk score (0–100) and exposure
- `exposure = probability × severity_norm × impact_norm` (all in 0–1, impact normalised to a reference value, e.g. ₹10 Cr).
- `risk_score = probability × 40 + impact_norm × 0.35 × 100 + exposure × 0.25 × 100`
- Risk bands: **≥ 75 CRITICAL · ≥ 50 HIGH · ≥ 25 MEDIUM · else LOW**.

### 9.7 Expected Annual Loss (EAL)
`EAL_calc = probability × single_point_impact`. Asset-total EAL = single-point × exposure multiplier; each asset reports its total and per-vulnerability breakdown. Control *reduction* = EAL before − EAL after. **Residual EAL = EAL × ∏(1 − effective_weight_t)** for enforced controls.

### 9.8 Forecasts
- **Do-nothing forecast** (`forecast`): runs each series (EAL, risk score, open vulns) forward via rolling means/trends over `N` months — deterministic, no training.
- **ML forecast** (`ml_forecast`): XGBoost regression. See §10.

### 9.9 Scenario / drill engine
`risk_engine.simulate_event(source)` perturbs CVSS, exposure, and impact props by random factors, applies discovery/containment lags, then recomputes EAL. **Drills** (`exercises`) copy the production snapshots, apply a surge multiplier per sector (RANSOMWARE 5yr probability estimates per sector), recompute, and persist `risk_events` so the final filtered view is internally consistent.

### 9.10 Loss distribution (Monte-Carlo)
Draws correlated loss runs (NumPy) → mean, **p50, p95, Value-at-Risk (VaR)**, worst case — a board-grade picture of "what might a year cost".

### 9.11 Audit chain (tamper-evident)
`audit_entries(pre_hash, hash, action, chain_version)`: each entry's `hash = SHA256(prev_hash + action + entity + payload + actor + timestamp)`. Any tampering breaks a hash; the gateway exposes `verify` that recomputes every hash and header/hash chaining.

### 9.12 National aggregates
- **Sector/agency/region roll-up** = weighted-sum of member asset EALs (weights honour asset weighting & region masking).
- **Sovereign Risk Index** = normalised composite (per-capita and EAL/GDP-normalised version).
- **ROSI** (per control/asset/sector) = `reduction_in_EAL ÷ control_cost` over a horizon.

---

## 10. Machine-learning forecast (XGBoost)

Endpoint: **`POST /api/risk/forecast/ml`** (`services/risk-engine/app/core/ml_forecast.py`).

- **Training data:** the 25 weekly `risk_snapshots` per asset (migration + seeder).
- **Features per asset:** lag-1 and lag-2 values, rolling mean, rolling std, slope, net change — engineered from the snapshot series.
- **Model:** `XGBRegressor` (open source, CPU-only, no GPU) per asset; forecasts **EAL / risk score / open-vulnerability count** **12 months** forward.
- **Runway re-feeding:** each forecast step feeds its prediction back as the next lag so the 12-step horizon stays internally consistent.
- **Confidence band:** standard deviation of the last `N` residuals → low/mid/high band.
- **Graceful fallback:** if fewer than `MIN_SAMPLES=18` snapshots exist (the file `itemp_insert` guards), it returns a **DoNothingForecast** with `ml.used = false` and an honest explanation — the API never errors on small data.

---

## 11. RAG compliance retrieval

Endpoint: `POST /api/ai/rag/query` → `{ "clauses": [ { "framework", "clause", "text", "score" } ], "answer" }`.

- **Corpus** (`gov.compliance_docs`): **ISO 27001, NIST CSF 1.1 & 2.0, CIS v8, RBI IT Master Directions, SEBI (CIS/cyber), DPDP Act 2023, IT Act 2000/2008 (NCIIPC Sec 70), TRAI, IRDAI** — 22 clauses + full documents indexed.
- **Embedder:** deterministic hash-based 384-dim feature vector (character n-grams + hashing). No API calls, no cost, **PII-safe**, idempotent — same text always yields the same vector.
- **Similarity:** cosine similarity computed in Python; embeddings persisted as JSONB (pgvector-ready); `POST /api/ai/rag/refresh` rebuilds the index (idempotent, dedupes by (framework, clause)).
- **Answer generation:** uses the retrieved clause texts `as` context. In mock LLM mode the answer is a self-contained deterministic summary; with `OPENAI_API_KEY` set it cites the real clauses.
- `GET /api/ai/rag/status` returns counts per framework + corpus freshness.

---

## 12. Authentication & gateway security

### 12.1 Auth-service (`auth-service`)
- `POST /api/auth/login` → `{ token, refreshToken, expiresIn, user }` (`expiresIn` = 3600 s).
- `POST /api/auth/register` → same shape (default role ANALYST).
- `POST /api/auth/refresh` — **rotation with reuse detection**: `refreshToken` is SHA-256-hashed before storage; families are tracked in `auth.refresh_tokens`; using a *rotated-away* token flags reuse and **revokes the whole family**; sliding expiry 604800 s (7 days).
- `GET /api/auth/me` — profile from validated JWT.
- Admin: `GET /api/auth/users`, `PUT /api/auth/users/{id}/role`, `DELETE /api/auth/users/{id}`.
- Every login/register/role change is written to `auth.audit_logs`.

**JWT claims:** `{ sub, roles, role, iat, exp }` — HS256, signed with `JWT_SECRET`, parsed & verified in `cybercommon/jwt.py`.

### 12.2 Gateway (`api-gateway`)
- **Route table** (all paths below; excluded from auth = health/actuator only else every path needs a valid JWT):

| Prefix | Upstream |
|---|---|
| `/api/auth/`, `/api/users/` | `auth-service:8081` |
| `/api/assets/` | `asset-service:8082` |
| `/api/vulnerabilities/`, `/api/findings/` | `vulnerability-service:8083` |
| `/api/controls/` | `control-service:8084` |
| `/api/ingestion/` | `ingestion-service:8085` |
| `/api/risk/` | `risk-engine:8090` |
| `/api/investment/` | `investment-optimizer:8091` |
| `/api/ai/` | `ai-service:8092` |
| `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` | allowed without token |
| `/health`, `/actuator/health` | answered locally |

- **Rate limiting:** Redis sliding window, **120 req/min per IP**, **300 req/min per authenticated user**.
- **Circuit breaker:** per upstream, opens on ≥5 consecutive 5xx within the window, auto-resets after 30 s (half-open probe).
- **Header injection:** `X-User-Id`, `X-User-Roles`, `X-User-Role` added to proxied requests so backends never re-parse tokens.
- `/api/risk/national/*` endpoints are **ADMIN-only** at the gateway (enforced via role claim).
- **Order matters:** health and actuator routes are registered *before* the catch-all so they always answer even when upstreams are down.

---

## 13. Live notifications (WebSocket / STOMP)

- Plain **WebSocket** (not SockJS) at **`ws://host:8086/ws`**, speaking **STOMP 1.2**.
- Broker publishes three topics:
  - **`/topic/risk/updated`** — fired after every risk recalculation (drill, scenario, control change, snapshot).
  - **`/topic/ingestion/event`** — every new ingested security event (live connectors, simulators, replay).
  - **`/topic/risk/alert`** — threshold alerts fired by the alert-rule engine (WS8).
- **Bridge:** a background thread in `notification-service` subscribes to Redis channels (`risk.events.updated`, `risk.events.alert`, `ingestion.events.realtime`) and forwards each message to the STOMP broker.
- Heartbeat keep-alives (client `0,0` = never) — used by the frontend `useWebSocket.ts` hook.
- Frontend derives the broker URL from the page origin (`ws(s)://<host>/ws`, proxied by nginx/Vite to `notification-service:8086`). Set `VITE_WS_URL` at build time only to override.

---

## 14. Ingestion pipeline

`ingestion-service` (8085) is where external security feeds enter the platform.

| Action | Endpoint | What it does |
|---|---|---|
| Ingest one vuln/control/asset event | `POST /api/ingestion/{kind}/events` | normalise → persist to `public.security_events` (kind/vendor_category, payload, status) → publish Redis → notify WS clients |
| Batch ingest | `POST /api/ingestion/batch` | up to `kind`-filtered batch in one call |
| List events | `GET /api/ingestion/events` | paginated, filter by kind/vendor/status |
| Stats | `GET /api/ingestion/stats` | per-kind/vendor counts, 24h volume |
| Simulate | `POST /api/ingestion/simulate?vulnerability\|control\|asset&count=N` | generate synthetic events (realistic vendor payload shapes) |
| Bulk simulate | `POST /api/ingestion/simulate` body `{ count }` | random mixed events |
| Remediate/control sim | `POST /api/ingestion/simulate/remediate\|control` | special kinds |
| Replay | `POST /api/ingestion/replay` body `{ count, intervalSec }` | replay existing events on a timer (foreground by default) |
| Background replay | `POST /api/ingestion/replay/background` | same, in a job |
| Jobs | `GET /api/ingestion/jobs` | background replay state |
| Connectors | `GET /api/ingestion/connectors` · `POST /api/ingestion/connectors/{id}/toggle` · `POST /api/ingestion/connectors/{id}/trigger` | 7 seeded simulated sources (Nessus, CrowdStrike, Defender, Splunk, WAF/CDN, JSON, CSV); toggle = start/stop emitter loop, trigger = fire once now |

Each ingested event lands on `Redis` channel `ingestion.events.realtime` → notification-service → WebSocket → dashboard bell, so the human-in-the-loop sees threats appear live.

---

## 15. Complete API reference

All routes are mounted behind the gateway at `/api/...` with a valid JWT (`Authorization: Bearer <token>`). Every service auto-serves interactive docs at `http://localhost:<port>/docs`.

### 15.1 auth-service (8081)

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, email, password }` | creates ANALYST |
| POST | `/api/auth/login` | `{ username, password }` | → `{ token, refreshToken, expiresIn, user }` |
| POST | `/api/auth/refresh` | `{ refreshToken }` | rotation + family revoke on reuse |
| GET | `/api/auth/me` | — | profile from JWT |
| GET | `/api/users` | — | admin |
| PUT | `/api/users/{id}/role` | `{ role }` | admin |
| DELETE | `/api/users/{id}` | — | admin |

### 15.2 asset-service (8082)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/assets` | pagination, filters (`name`, `type`, `environment`, `owner`, `exposure`, `sector`, `region`, `agency`) |
| POST | `/api/assets` | create (auto-computes criticality) |
| GET | `/api/assets/stats` | counts by type/environment/owner/exposure/severity/criticality band |
| GET | `/api/assets/criticality` | top/bottom by criticality |
| GET | `/api/assets/{id}` | full detail + dependencies |
| PUT | `/api/assets/{id}` | update (recomputes criticality) |
| DELETE | `/api/assets/{id}` | delete |
| GET | `/api/assets/{id}/dependencies` | dependency graph |
| POST | `/api/assets/{id}/dependencies` | `{ dependency_id, type, strength }` |
| DELETE | `/api/assets/{id}/dependencies/{depId}` | remove edge |
| GET | `/api/assets/dependencies/unlinked` | orphan candidates |

### 15.3 vulnerability-service (8083)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/vulnerabilities` | paginate/filter (cvssMin/Max, severity, status, source, cve) |
| GET | `/api/vulnerabilities/stats` | severity counts, CVSS averages, remediation backlog |
| POST | `/api/vulnerabilities` | create |
| PUT | `/api/vulnerabilities/{id}` | update |
| DELETE | `/api/vulnerabilities/{id}` | delete |
| POST | `/api/vulnerabilities/bulk` | create many |
| GET | `/api/vulnerabilities/asset/{assetId}` | per-asset list |
| GET | `/api/vulnerabilities/{id}` | detail + findings |
| PUT | `/api/vulnerabilities/{id}/status` | `{ status, note }` |
| POST | `/api/findings` | `{ vulnerability_id, asset_id, severity, cvss, status, description }` |

### 15.4 control-service (8084)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/controls` | paginate/filter (`type`, `status`, `maturity`) |
| GET | `/api/controls/effectiveness` | ranking by effectiveness × coverage × maturity |
| GET | `/api/controls/coverage` | coverage by control type |
| POST | `/api/controls` | create |
| PUT | `/api/controls/{id}` | update |
| DELETE | `/api/controls/{id}` | delete |
| POST | `/api/controls/asset/{assetId}` | attach control to asset |
| PUT | `/api/controls/{id}/status` | lifecycle status |
| GET | `/api/controls/asset/{assetId}` | controls on an asset |
| GET | `/api/controls/{assetControlId}` | single asset-control detail |

### 15.5 ingestion-service (8085) — see §14

### 15.6 notification-service (8086)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | — |
| WS | `/ws` | STOMP 1.2 broker endpoint |
| WS | `/ws/info` | broker metadata (used by clients) |

### 15.7 risk-engine (8090)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/risk/score` | per-asset computed scores (asset scoring sub-mode `business`/`cvss` via `mode`) |
| GET | `/api/risk/score/{assetId}` | single asset score + components |
| GET | `/api/risk/eal` | EAL breakdown per asset (impact decomposition) |
| GET | `/api/risk/eal/{assetId}` | per-asset EAL + control reductions |
| GET | `/api/risk/drivers/{assetId}` | top vuln/criticality drivers |
| GET | `/api/risk/enterprise` | summary roll-up |
| POST | `/api/risk/scenario/simulate` | `{ assetId, eventType, intensity? }` → what-if + re-score + event log |
| GET | `/api/risk/scenario/loss-distribution` | `{ assetId? }` → mean/p50/p95/VaR/worst/losses |
| GET | `/api/risk/scenario/trends` | `{ months? }` → EAL/score/open-vuln series |
| GET | `/api/risk/trends` | same series, latest N |
| GET | `/api/risk/data-quality` | asset/vuln completeness (CWE %, env %…) |
| GET | `/api/risk/compliance` | ISO/NIST control-gap coverage |
| GET | `/api/risk/compliance/{sector}` | sector-level gap counts |
| GET | `/api/risk/forecast` | deterministic 12-month do-nothing forecast |
| POST | `/api/risk/forecast/ml` | XGBoost 12-month forecast (see §10) |
| GET | `/api/risk/graph` | asset dependency graph (nodes/edges) |
| GET | `/api/risk/graph/paths/{assetId}` | attack paths to an asset |
| GET | `/api/risk/graph/calculation/{assetId}` | calculations for an asset |
| GET | `/api/risk/audit/chain` | full audit chain |
| POST | `/api/risk/audit/commit` | append chain entry |
| POST | `/api/risk/audit/verify` | recompute + verify hashes |
| GET | `/api/risk/national/summary` | **admin** — national EAL/SRI/top sectors |
| GET | `/api/risk/national/sectors` | **admin** | 
| GET | `/api/risk/national/sectors/{sector}` | sector depth |
| GET | `/api/risk/national/regions` | region heatmap |
| GET | `/api/risk/national/agencies` | agency breakdown |
| POST | `/api/risk/national/sri` | compute/refresh SRI |
| GET | `/api/risk/national/report` | regulator report |
| GET | `/api/risk/national/early-warnings` | warnings list |
| POST | `/api/risk/national/early-warnings` | create |
| GET | `/api/risk/exercises` | historical drills |
| POST | `/api/risk/exercises` | run drill (WORM/RANSOMWARE/SUPPLY_CHAIN/DDOS): surge, re-run idempotent, persisted + risk_events + audit |
| POST | `/api/risk/exercises/v2` | v2 with per-sector multipliers |
| POST | `/api/risk/exercises/re-run/{id}` | replay a prior drill |
| POST | `/api/risk/exercises/{id}/finalize` | lock results, write audit entry |
| POST | `/api/risk/exercises/{id}/history` | append history node |
| GET | `/api/risk/tprm/vendors` | vendor list with scores |
| POST | `/api/risk/tprm/vendors` | create vendor |
| PUT | `/api/risk/tprm/vendors/{id}` | update |
| DELETE | `/api/risk/tprm/vendors/{id}` | delete |
| GET | `/api/risk/tprm/vendors/{id}/assets` | vendor → asset cascade |
| POST | `/api/risk/tprm/vendors/{id}/assets` | attribute asset to vendor |
| GET | `/api/risk/tprm/cascade` | full vendor exposure map |
| GET | `/api/risk/data-sources` | connected data sources + status |
| POST | `/api/risk/data-sources/{id}/ingest` | trigger manual ingest |

### 15.8 investment-optimizer (8091)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/investment/curve` | budget vs EAL reduction curve (enterprise) |
| POST | `/api/investment/optimize` | OR-Tools selection of controls for a budget → plan + ROSI |
| POST | `/api/investment/national` | allocate budget across sectors → portfolio ROSI |
| POST | `/api/investment/plans` | save plan |
| GET | `/api/investment/plans` | list plans |
| GET | `/api/investment/plans/{id}` | load |
| DELETE | `/api/investment/plans/{id}` | delete |
| GET | `/api/investment/leaderboard` | ROSI ranking |
| GET | `/api/investment/summary` | totals |

### 15.9 ai-service (8092)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/ai/recommend` | control/remediation suggestions from live data |
| POST | `/api/ai/query` | intent → routed real endpoint → plain-English answer |
| POST | `/api/ai/explain/risk/{assetId}` | why is the asset risky? |
| POST | `/api/ai/summarize` | executive summary |
| POST | `/api/ai/summarize/for/{role}` | role-tuned summary (admin/ciso/analyst) |
| GET | `/api/ai/rag/status` | corpus counts + freshness |
| POST | `/api/ai/rag/refresh` | rebuild embeddings (idempotent) |
| POST | `/api/ai/rag/query` | `{ query, top_k?1, framework? }` → clause hits + answer |
| GET | `/health` | — |

### 15.10 Health
| Method | Path | Service |
|---|---|---|
| GET | `/health` | every service |
| GET | `/actuator/health` | api-gateway (compat) |

---

## 16. Frontend reference

React 18 + TS SPA served by nginx at **:3000**. 11 pages, 40+ components, 8 typed API clients.

### 16.1 Routes / pages

Real SPA routes (`frontend/src/App.tsx` + `frontend/src/config/roles.ts`). Role hierarchy `ADMIN > CISO > ANALYST > VIEWER`; `minRole` = most-privileged tier that can view. Server-side RBAC mirrors this at every API.

| Route | Page | Who sees it |
|---|---|---|
| `/login` | Login | everyone |
| `/` | **Executive dashboard** — risk score, EAL + VaR95, budget allocation, charts, live events, **AlertsFeed** | VIEWER+ |
| `/security` | **Security dashboard** — control/image posture, activity | ANALYST+ |
| `/assets` | Asset inventory, criticality, dependency graph | ANALYST+ |
| `/risk` | Risk analysis — register, per-asset drill-down, loss distribution, compliance mapping | VIEWER+ |
| `/vulnerabilities` | Vuln backlog, threat-intel enrichment (KEV/EPSS), prioritisation | ANALYST+ |
| `/simulator` | What-if scenario & delay-remediation simulator | ANALYST+ |
| `/investment` | Investment optimizer — CP-SAT budgets, curve, national allocation | CISO+ |
| `/national` | **SCRO National Observatory** — sectors, regions, exercises, TPRM, reports | CISO+ |
| `/ai` | AI assistant (RAG on compliance corpus) | ANALYST+ |
| `/settings` | Settings — WS connection state, env display | ADMIN |

### 16.2 Key components & hooks
- `useAuth` (JWT + refresh rotation client), `useWebSocket` (STOMP brokerURL derived from origin, zero heartbeats, reconnect, per-topic subscriptions on `/topic/risk/updated`, `/topic/ingestion/event`, `/topic/risk/alert`).
- Dashboard widgets: EAL gauge, band donut, 12-month trend, VaR95, AlertsFeed, AI insight card.
- National Observatory: national summary, sector/pie + bars, region heatmap (ECharts `world` map), agency breakdown, drill launcher (WORM/RANSOMWARE/SUPPLY_CHAIN/DDOS), budget allocator, regulator report panel with **audit-chain verify badge**.
- `api/*.ts` typed clients: `auth.ts, assets.ts, vulnerabilities.ts, controls.ts, ingestion.ts, risk.ts, investment.ts, ai.ts, notifications.ts` (+ `riskApi.ts` for forecasts/export/alerts).

### 16.3 Proxying

| Layer | Rule |
|---|---|
| Vite dev (`vite.config.ts`) | `/api` → `http://localhost:8080`, `/ws` → `http://localhost:8086` (ws:true) |
| nginx prod (`nginx.conf`) | `/api/` → `http://api-gateway:8080`, `/ws` → `http://notification-service:8086` (with `Upgrade`/`Connection` headers) |

---

## 17. Environment variables (what every setting does)

Copied from `.env.example` — defaults are safe for local `docker compose up`.

| Variable | Default | Meaning |
|---|---|---|
| `POSTGRES_DB` | `cyberrisk` | Postgres database name |
| `POSTGRES_USER` | `postgres` | Postgres user |
| `POSTGRES_PASSWORD` | `postgres` | Postgres password |
| `DATABASE_URL` | `postgresql://postgres:postgres@postgres:5432/cyberrisk` | SQLAlchemy URL (inside compose; the `migrate_and_seed.py`/local default is `postgresql://postgres:root123@localhost:5432/cyberrisk`) |
| `REDIS_URL` | `redis://redis:6379/0` | Redis server |
| `JWT_SECRET` | bundled example (change in prod!) | HS256 signing key |
| `JWT_EXPIRY` | `3600` | access-token TTL (seconds) |
| `JWT_REFRESH_EXPIRY` | `604800` | refresh-token TTL (7 days) |
| `USE_MOCK_LLM` | `true` | offline LLM (₹0) — set `false` + `OPENAI_API_KEY` for real answers |
| `OPENAI_API_KEY` | *(empty)* | only used when `USE_MOCK_LLM=false` |
| `EMBED_DIM` | `384` | RAG deterministic embedding size |
| `GATEWAY_ORIGIN_WHITELIST` | `*` | CORS allowed origins |

---

## 18. Setup & running

**Prerequisites:** Docker + Docker Compose (v2). No local Python/Node needed.

```bash
# 1. (optional) configure
copy .env.example .env

# 2. build & start the whole stack (13 services — `db-init` runs migrations + seeds once and exits)
docker compose up --build

# 3. migrate + seed (idempotent; can be re-run any time)
docker compose exec api-gateway python database/migrate_and_seed.py
#    or, on the host with a local Postgres:
#    python database/migrate_and_seed.py
```

Then:
- **Frontend:** http://localhost:3000 (login: see §19)
- **Gateway docs:** http://localhost:8080/docs
- **Per-service Swagger:** http://localhost:<port>/docs (ports in §7)
- **Live WebSocket:** `ws(s)://<host>/ws` (same-origin via nginx; direct broker at `ws://localhost:8086/ws`)

**Local (no Docker) alternative:** run Postgres + Redis, set `DATABASE_URL`/`REDIS_URL`, then `pip install -e services/common/cybercommon` and `uvicorn` each `services/*/app/main.py` on its port.

**Reclaiming Docker disk / RAM:** `make slim` (or `powershell -ExecutionPolicy Bypass -File scripts/slim_docker.ps1`) prunes the BuildKit build cache and dangling images only — no volumes or tagged images, and nothing that belongs to other projects. To lower Docker's memory reservation, edit `%USERPROFILE%\.wslconfig` (`memory=4GB` suits this stack; it runs in ~1 GB), then `wsl --shutdown` and reopen Docker Desktop. When not demoing, `docker compose stop` frees the RAM immediately.

---

## 19. Demo users

Only the three SCRO demo accounts are seeded and active — public registration is disabled (`AUTH_ALLOW_REGISTER=false`).

| Username | Password | Role | Notes |
|---|---|---|---|
| `scro_regulator` | `Scro@2026!` | CISO | Regulatory Oversight — national observatory, compliance, investment, exercises |
| `scro_banker` | `Scro@2026!` | ANALYST | Banking sector operations — assets, vulnerabilities, risk, simulator |
| `scro_auditor` | `Scro@2026!` | ANALYST | National audit & assurance — risk review and tamper-evident audit chain |

---

## 20. Smoke test

`powershell -ExecutionPolicy Bypass -File scripts/smoke_sacro.ps1` runs an end-to-end pass (requires the full stack up):

1. login the seeded regulator persona `scro_regulator` / `Scro@2026!` (CISO) — splash creds asserted;
2. national summary (EAL, sovereign risk index);
3. sector compliance mapping (BANKING → RBI IT Framework);
4. scenario drill run (RANSOMWARE × BANKING) asserting a surge;
5. national investment optimize (₹ budget → sector allocations, ROSI);
6. TPRM vendor cascade (+ direct asset count);
7. audit chain integrity verify;
8. WebSocket endpoint reachable;
9. asset + vulnerability + control surface (`/assets` `{data}`, `/vulnerabilities?page&size` `{data,total}`, `/controls`, `/controls/effectiveness`);
10. ingestion + alerts surface (events, rules, alert events, health-check supported metrics);
11. insights + simulations (loss-distribution, dependency graph, attack-path, snapshots, data-sources);
12. scenario simulate + AI recommend/summarize + investment ROSI.

Expected result: `PASSED: 12 FAILED: 0`. The full verify → recalc → live-update chain is additionally covered by the unit suites (risk-engine replay/recalc, alert rules, STOMP bridge, `useWebSocket` hook).

---

## 20a. Demo walkthrough (15-minute script)

Everything below runs against the seeded local stack (`docker compose up -d`), with the dashboard at `http://localhost:3000` and the API at `http://localhost:8080`. Two personas:

| Minute | Persona | Action | Live result (seeded data) |
|---|---|---|---|
| 0–2 | **Oversight (CISO)** | Log in as `scro_regulator` / `Scro@2026!`; open National Observatory; read the national EAL and Sovereign Risk Index. | National EAL ≈ **₹6,520 Cr**, SRI **0.70** |
| 2–4 | Oversight | Open Sector / Region tabs; verify the sector heatmap and regional rankings. | Sector × region EAL roll-ups (live APIs) |
| 4–6 | Oversight | Open **Cyber Exercises**; run a RANSOMWARE × BANKING national drill. | Baseline → simulated EAL surge **≈ +54%** (₹4,838 Cr → ₹7,430 Cr) |
| 6–9 | **Regulator (same persona)** | Open **Executive / Regulator report**: RBI IT Framework compliance gap for BANKING; TPRM vendor cascade for the largest vendor. | BANKING mapped to **6 RBI requirements**; vendor cascade exposure ≈ **₹15,863 Cr** over 4 direct assets |
| 9–11 | Oversight | Open **Investment Optimizer**; national budget ₹5 Cr, 3-year horizon. | Allocates **₹1.54 Cr** across **3 sectors** / **22 controls**; EAL **−67.5%** (₹65.2 Bn → ₹21.2 Bn residual) for **ROSI ≈ +285,000%** |
| 11–13 | Regulator | Open **Audit Chain**: verify tamper-proof audit trail. | `status=INTACT`, all entries verified |
| 13–15 | Oversight | Open **AI Assistant**; ask for a national posture summary (mock-LLM mode, ₹0 LLM cost). | Natural-language summary + RAG citation of the legal clause |

Every step is also enforced by `scripts/smoke_sacro.ps1` (12/12). The WebSocket feed updates the dashboard live when an ingestion event or drill recalculation lands.

---

## 21. CI / CD

`.github/workflows/ci.yml` on every push/PR:
1. **Frontend:** `npm ci` + `npm run build` (type-check + Vite production build).
2. **Backend:** Python 3.12 job with `pip install -e services/common/cybercommon` then `python -m compileall -q` over **every service** and `database/` (fails fast on syntax errors across the whole stack).

---

## 22. Budget — what it actually costs to build this today

This is the real-money answer to **"how much to build a national cyber-risk quantification + investment-optimisation platform like this in the current market?"** (2026, India-focused, honest ranges — not marketing numbers). The good news: because the whole stack (FastAPI, PostgreSQL, Redis, XGBoost, OR-Tools, React) is **open source**, the software cost is ~₹0; *people* and *production hardening* are the real expense.

### 22.1 Three ways to build it (₹ / USD, indicative)

| Approach | Team | Timeline | Total cost (₹) | Total cost (USD) | What you get |
|---|---|---|---|---|---|
| **A. Frugal solo / student build** | 1 full-stack dev | ~4–6 months | **₹6–14 lakh** | **$7k–$17k** | A working prototype on a laptop — exactly what this repo is. All features below run with mock LLM, sample data, cheap cloud (or none). |
| **B. Startup / government-POC MVP** | 5–6 people (2 backend, 2 frontend, 1 data/ML, 1 security/ops) | ~6–9 months | **₹35–60 lakh** | **$40k–$70k** | Production MVP: real-connector ingestion, SSO, hardened auth, proper EUC/DR, monitoring, load-tested for a pilot sector. |
| **C. National-scale enterprise rollout** | 20–30 across security/eng/data/PMO (multi-vendor, one SI) | 12–24 months + pilots | **₹1.5–4 crore** | **$180k–$500k** | A national twin for a CERT/Cabinet agency: multi-region HA, role-based inter-agency onboarding, full compliance certifications, 7×24 SOC integration, vendor SLAs. |

### 22.2 Where the money goes

| Line item | Frugal (A) | MVP (B) | National (C) |
|---|---|---|---|
| Salaries (indian talent, monthly gross) | ₹1.5–2.5 L/mo | ₹8–12 L/mo | ₹30–60 L/mo |
| Cloud (dev → staging → prod) | ~₹0 (local) to ₹15k/mo | ₹30k–75k/mo | ₹1.2–3 L/mo |
| Software & licences | **₹0** (all OSS) | **₹0–25k/mo** (monitoring/observability if not self-hosted) | ₹0–1 L/mo |
| LLM usage (if `USE_MOCK_LLM=false`) | ₹0 (mock) | ₹5–15k/mo | ₹30k–1.2 L/mo |
| One-off: penetration test + audit | — | ₹3–6 L | ₹15–50 L (2–3 tests/yr + certification) |
| One-off: cloud hardening, DR, runbooks | — | ₹2–5 L | ₹30–80 L |
| Compliance paperwork (ISO 27001 cert, DPDP readiness) | — | ₹2–4 L | ₹20–60 L |

### 22.3 Monthly running cost (steady-state)

| Environment | Monthly cost |
|---|---|
| Local / single dev box | **₹0** (this repo runs fully offline, mock LLM, Docker on one machine) |
| Small public cloud (stage + demo) | ₹2–6k/mo ($25–$75) |
| Production MVP (2 small VMs + managed Postgres + Redis, honest sizing) | ₹10–35k/mo ($120–$420) |
| National HA (multi-region, replication, geo-redundant Redis/DB, CDN, WAF, backups) | ₹60k–2 L/mo ($750–$2,500) |

### 22.4 Why this build is unusually cheap
- **₹0 software licences** — FastAPI, SQLAlchemy, PostgreSQL, Redis, XGBoost, OR-Tools, React, Hatch/PyPI are all free & open source.
- **₹0 LLM by default** — the `USE_MOCK_LLM=true` mock and the deterministic 384-dim RAG embedder run **without any API call**, so the demo + POC cost nothing in AI usage.
- **₹0 per-user licensing** — no per-seat SaaS (Splunk/QRadar/ServiceNow NFRs are optional and bypassed by our own connectors).
- **Small footprint** — pure CPU inference (XGBoost) means a ₹3–5k/mo VM can run all 10 services together.
- **Idempotent seeding + full docs + smoke tests** — onboarding a new engineer/agency takes hours, not weeks.

### 22.5 Cut-to-fit playbook (how to spend even less)
1. Start with **Option A** and `docker compose up` on one machine — today.
2. Keep **mock LLM** on until a pilot stakeholder specifically demands LLM answers; the API contract is identical (`/api/ai/*`), so the swap is a config change.
3. Use the **deterministic embedder** forever — RAG quality is fine for a 22-clause regulatory corpus and costs nothing.
4. Buy **one ₹15k/mo instance once** — run all 10 services + Postgres + Redis on a single 8 vCPU box for the first real users; scale out only when a load test proves you need it.
5. Add certs and pen-tests **only when contractually required** (that's the C-band line items).

---

## 23. Planned next steps (Phase 2/3)

| # | Item | Why |
|---|---|---|
| 1 | **Kafka/RabbitMQ** event backbone replacing direct Redis pub/sub | ordered, replayable, lossless at national scale |
| 2 | **Real connectors** (Nessus/Tenable, MS Defender, CrowdStrike, Splunk/ELK ingestion, on-prem XML/JSON drop-folders) faking the simulators | production value from day 1 |
| 3 | **Scheduler** (APScheduler/Celery) for periodic recalcs, daily snapshots, weekly report emails | keeps numbers continuously fresh |
| 4 | **SSO / OIDC + MFA** for government identity (email OTP, Aadhaar/eGazette as IdP options) | real-world auth posture |
| 5 | **Model currency**: re-train XGBoost on a longer snapshot history, add calendar/campaign features, auto-refresh on new data | better 12-month forecasts |
| 6 | **Federated multi-agency mode** with per-agency tenancy + central aggregation | genuine CERT-In scale |
| 7 | **More formal reports** (PDF export, dashboard embed links, scheduled regulator briefs) | usability for the ministry/regulator audience |
| 8 | **Threat-intel enrichment** (OSINT/CISA/IN-CERT feeds) merged into severity | more accurate probability inputs |

---

## 24. Maintenance & operations

- **Migrations:** `database/migrate_and_seed.py` applies any new `migrations/*.sql` in the right order and is fully **re-runnable** (seed rows upserted by name/UUID — safe for daily scheduling).
- **Seeding independence:** new seeds merge; nothing is wiped.
- **Health:** `GET /health` on every service + gateway aggregation (`/actuator/health`); Docker Compose `restart: unless-stopped` + healthchecks.
- **Logs:** `docker compose logs -f` per service; STDERR-style app logging; structured fatal logs.
- **Backup:** standard `pg_dump` of the `cyberrisk` database (schemas + `public` data_sources/events); restore = fresh migrate+seed is not required (seed is idempotent anyway).
- **Upgrading the LLM:** set `USE_MOCK_LLM=false` + `OPENAI_API_KEY`; no code change.

---

## 25. Appendix A — file-by-file service notes

### services/common/cybercommon
| File | Contents |
|---|---|
| `config.py` | `Settings` (pydantic-settings): `database_url`, `redis_url`, `jwt_secret/expiry/refresh_expiry`, `USE_MOCK_LLM`, `EMBED_DIM`, sandbox-safe defaults |
| `database.py` | SQLAlchemy `engine`, `SessionLocal`, `Base`, `get_db()` |
| `models.py` | ORM: `User`, `AuditLog`, `RefreshToken` (auth); `Asset`, `AssetDependency`, `Vulnerability`, `SecurityControl`, `AssetControl`, `SecurityEvent`, `DataSource` (big models); `Agency`, `ComplianceDocument` (gov) |
| `jwt.py` | `create_token`, `decode_token`, HS256, exp checks |
| `security.py` | bcrypt via passlib — `hash_password`, `verify_password` |
| `redis.py` | Redis singleton + channel constants (`INGESTION_EVENTS_CHANNELS`, `RISK_EVENTS_UPDATED_CHANNELS`) |
| `deps.py` | `get_current_user`, `require_roles` FastAPI deps |

### services/api-gateway
| File | Contents |
|---|---|
| `app/main.py` | FastAPI app: CORS, JWT filter middleware, rate limiter, circuit breaker, route proxy, `/health` + `/actuator/health` registered before catch-all |
| `app/core/proxy.py` | upstream routing table + forwarding (httpx.AsyncClient) |
| `app/core/rate_limiter.py` | Redis sliding-window counters (IP + user) |
| `app/core/circuit_breaker.py` | per-upstream open/closed/half-open state machine |

### services/auth-service
`app/main.py` + `app/routes/auth.py` (login/register/refresh/me), `app/routes/users.py` (admin users), `app/core/refresh_tokens.py` (rotation families), audit logging.

### services/asset-service
`app/main.py` + `app/routes/assets.py` (CRUD + stats + criticality), `app/routes/dependencies.py` (graph edges), `app/core/criticality.py` (0–100 scoring), `app/core/asset_types.py` (type presets + base values).

### services/vulnerability-service
`app/main.py` + `app/routes/vulnerabilities.py` (CRUD + filters), `app/routes/bulk.py`, `app/routes/findings.py`, `app/routes/status.py`, `app/core/cvss.py` (severity mapping + scoring).

### services/control-service
`app/main.py` + `app/routes/controls.py` (CRUD + effectiveness + coverage), `app/routes/asset_controls.py` (attach/status), `app/core/config.py` (control-type weights table).

### services/ingestion-service
`app/main.py` + `app/routes/ingestion.py` (events/batch/simulate/replay), `app/routes/simulators.py` (vuln/control/remediate generators), `app/routes/replay.py` + `app/routes/jobs.py` (background replay), `app/routes/connectors.py` (7 live simulators, toggle/trigger), `app/core/normalizer.py`, `app/core/publisher.py`, `app/core/sim_config.py`.

### services/notification-service
`app/main.py` (FastAPI + WebSocket + STOMP), `app/ws/core.py` (broker), `app/ws/dispatcher.py`, `app/stomp/bridge.py` (Redis → STOMP thread), `app/ws/report.py` (subscription info).

### services/risk-engine
`app/main.py`, `app/routes/score.py`, `app/routes/eal.py`, `app/routes/scenario.py`, `app/routes/trends.py`, `app/routes/forecast.py`, `app/routes/graph.py`, `app/routes/audit.py`, `app/routes/national.py`, `app/routes/exercises.py`, `app/routes/tprm.py`, `app/routes/compliance_risk.py`, `app/routes/data_sources.py`, `app/core/formulas.py` (see §9), `app/core/ml_forecast.py` (see §10), `app/core/forecast.py` (deterministic), `app/core/graph.py`, `app/core/audit.py` (SHA-256 chain), `app/core/severity_mappings.py`.

### services/investment-optimizer
`app/main.py`, `app/routes/investment.py`, `app/core/or_tools_optimizer.py` (knapsack solver with service/reward/quantity constraints), `app/core/national_allocator.py`, `app/core/rosi.py`, `app/core/plans.py`.

### services/ai-service
`app/main.py`, `app/routes/ai.py`, `app/routes/rag_routes.py`, `app/core/llm.py` (mock + OpenAI), `app/core/intent.py` (classification), `app/core/rag.py` (deterministic 384-dim embedder + cosine retrieval + corpus sync), `app/core/consolidate.py`, `app/core/prompts.py`.

### frontend
`src/main.tsx`, `src/App.tsx` (router + guards + layout), `src/context/AuthContext.tsx`, `src/hooks/useWebSocket.ts` (STOMP over raw WS, zero-heartbeat), `src/hooks/useDashboardData.ts`, `src/api/*` (8 typed clients), `src/pages/*` (11 pages from §16), `src/components/*` (40+ widgets incl. RiskGauge, EALDrilldown, DrillRunner, BudgetAllocator, RAGPanel, Heatmap, NotificationsBell), `nginx.conf`, `Dockerfile`, `vite.config.ts`.

---

*Each build phase is logged in `docs/CHANGELOG.md` (entries 1–94); the architecture notes live in `architecture.md`; the approved plan with checkboxes is `implementation.md`.*