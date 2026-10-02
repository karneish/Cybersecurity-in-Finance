# CYBERSECURITY-IN-FINANCE — Complete Project Analysis

### *CyberRisk Quantifier → Sovereign Cyber-Risk Observatory (SCRO)*

**Repo:** `C:\Users\ManaGenz\Desktop\PROJECTS\Cybersecurity-in-Finance`
**Origin:** Problem Statement 26105 — *"AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform"*
**Status:** Build complete (self-reported 2026-09-20) · HEAD `bb5564d` · 10 backend services + 1 shared library + 11-page React SPA
**Declared coverage:** 100% (TODO.md) · 116 backend tests + 48 frontend Vitest · smoke test 12/12 PASS

---

## Table of Contents

1. [What It Is](#part-1--what-it-is)
2. [The Problem It Solves](#part-2--the-problem-it-solves)
3. [The Solution](#part-3--the-solution)
4. [Tech Stack](#part-4--tech-stack)
5. [Feasibility Analysis](#part-5--feasibility-analysis)
6. [Viability Analysis](#part-6--viability-analysis)
7. [Impact & Benefits](#part-7--impact--benefits)
8. [Findings, Risks & Discrepancies](#part-8--findings-risks--discrepancies)
9. [Research Papers & References](#part-9--research-papers--references)
10. [Verdict](#part-10--verdict)

---

# PART 1 — WHAT IT IS

## 1.1 One-line definition

A **national digital twin for continuous cyber-risk quantification and security-investment optimisation** — it converts raw vulnerability/control telemetry into **monetary Expected Annual Loss (EAL) in ₹**, rolls that up `asset → agency → sector → region → nation`, and then uses an open-source CP-SAT solver to decide **which controls to buy with a given budget**.

## 1.2 The three-layer product identity

The project deliberately carries two names, reflecting an evolution:

| Layer | Name | What it is |
|---|---|---|
| **Layer 1** | **CyberRisk Quantifier / CyberRisk Twin** | An *enterprise* FAIR-style risk engine. Assets, CVSS, controls, EAL, OR-Tools budgeting, Monte-Carlo loss, XGBoost forecast. |
| **Layer 2** | **Sovereign Cyber-Risk Observatory (SCRO)** | The *national/sovereign* tier. Sector/region/agency roll-ups, a proprietary **Sovereign Risk Index (SRI)**, national cyber **exercises (drills)**, national budget **allocation across sectors**, **TPRM** vendor cascades, and a regulator-ready report with a **tamper-evident hash chain**. |

`implementation.md` states the design rationale explicitly:

> FROM: one organization's cyber risk dashboard
> TO: **Sovereign Cyber-Risk Observatory (SCRO)**
> *"The upgrade is aggregation + governance + presentation — the engine is reused. This keeps it implementable both in this project and in real life."*

## 1.3 Target personas (4 user roles, 3 seeded demo logins)

| Persona | Role | Login | What they do |
|---|---|---|---|
| **Ministry / CERT-In oversight** | `CISO` | `scro_regulator` / `Scro@2026!` | National EAL, SRI, sector/region/agency heatmaps, run national drills, allocate national budget |
| **Banking-sector analyst** | `ANALYST` | `scro_banker` / `Scro@2026!` | Asset inventory, vulnerability backlog, risk drill-down, scenario simulator |
| **National auditor** | `ANALYST` | `scro_auditor` / `Scro@2026!` | Risk review, verify the SHA-256 audit chain is untampered |
| *(latent)* | `ADMIN` | disabled | Settings page, alert-rule CRUD |

Public registration is **disabled by default** (`AUTH_ALLOW_REGISTER=false`); migration 001 also force-deactivates any `admin`/`ciso`/`analyst` accounts so only the 3 SCRO personas can authenticate.

## 1.4 The core intellectual claim

> *"Can technical cybersecurity findings be transformed into quantified financial exposure and then used to optimize security investment decisions?"*
> — `architecture.md` §1

The differentiating idea: **CFO-facing money, not CISO-facing scores.** A vulnerability count is not actionable for a Finance Ministry; `₹4,838 Cr → ₹7,430 Cr under a ransomware scenario` is.

---

# PART 2 — THE PROBLEM IT SOLVES

## 2.1 The problem statement, stated plainly

1. **Cyber risk is measured annually, in spreadsheets.** It goes stale the moment the spreadsheet is closed.
2. **Findings are not money.** A scanner says "CVSS 9.8". A board asks "how much?" Nobody can answer, so nobody funds the fix.
3. **Security budgeting is not optimised.** Budgets are allocated by vendor relationship, legacy, and anecdote — not by risk reduction per rupee.
4. **Siloed visibility.** One dashboard per organisation. No way for a Ministry, a regulator, and a sectoral CERT to see the same picture at different altitudes.
5. **No auditability of risk decisions.** "Why did we accept this risk?" has no verifiable answer 18 months later.
6. **Third-party risk is invisible.** A breach at a managed-service provider cascades into your crown jewels, but no tool attributes the loss.
7. **Compliance reporting is manual.** Mapping control posture to RBI/SEBI/IRDAI/TRAI/NCIIPC/DPDP obligations is a quarterly analyst exercise.

## 2.2 Who this hurts today (mapped to the features built)

| Problem | Feature that answers it | Code that implements it |
|---|---|---|
| Annual snapshot | Live Redis → recalc → WebSocket loop | `risk-engine/app/core/event_consumer.py`, `notification-service/app/core/stomp.py` |
| Findings ≠ money | EAL in ₹ + 4-way impact decomposition | `formulas.py` → `EALCalculator` |
| Unoptimised budget | OR-Tools **CP-SAT 0/1 knapsack** + ROSI | `investment-optimizer/app/core/optimizer.py::_cp_knapsack` |
| Siloed visibility | asset→agency→sector→region→nation roll-up | `national_twin.py::SovereignTwin` |
| No audit trail | SHA-256 hash-linked chain with verify | `audit_chain.py::AuditChain` |
| Invisible TPRM | vendor → asset → dependent cascade | `tprm.py::TPRMManager` |
| Manual compliance | 39 mandates × 8 control types × 10 frameworks | `compliance.py::ComplianceMapper` |
| Opaque numbers | 5-component FAIR-style data-confidence score | `confidence.py::DataQualityEngine` |
| Untested plans | WORM/RANSOMWARE/SUPPLY_CHAIN/DDOS drills | `drill_engine.py::DrillEngine` |

---

# PART 3 — THE SOLUTION (feature catalogue)

## 3.1 Risk quantification engine (`services/risk-engine`, port 8090, 41 endpoints)

**The actual implemented math** (`app/core/formulas.py` — the single source of truth, which the test file calls *"the single source of truth of the risk math"*):

### (a) CVSS → intrinsic exploitation probability

Piecewise-linear interpolation between 10 integer anchors:

```
10 → 0.95    9 → 0.85    8 → 0.70    7 → 0.50    6 → 0.30
 5 → 0.15    4 → 0.08    3 → 0.03    2 → 0.01    1 → 0.005

out-of-range (e.g. 11.0) → 0.5
```

### (b) Adjusted probability

```python
base   = cvss_to_probability(cvss)
if (vuln.internet_exposed OR asset.internet_exposed):
    base *= 1.5
base   = min(base, 0.99)
result = min(base * (1 - control_reduction), 0.99)
```

### (c) Control reduction — Wagner-style independence model

```python
combined_survival = product over ACTIVE controls of (1 - coverage * effectiveness * typeWeight)
control_reduction = 1 - combined_survival
```

`CONTROL_TYPE_WEIGHTS` = `{MFA 0.25, PATCH 0.30, EDR 0.20, SEGMENTATION 0.15, FIREWALL 0.10, BACKUP 0.08, DLP 0.05, SIEM 0.05}` (default 0.05 for unknown types).

### (d) Financial impact

```python
SPI = business_value_inr * criticalityMultiplier * sensitivityMultiplier

criticalityMultiplier:  CRITICAL(>=90) 1.0 | HIGH(>=70) 0.75 | MEDIUM(>=40) 0.50 | LOW 0.25
sensitivityMultiplier:  RESTRICTED 1.5 | CONFIDENTIAL 1.2 | INTERNAL 1.0 | PUBLIC 0.5
```

### (e) Four-way impact decomposition (always sums to SPI)

- **downtime** — base 0.30; +0.08 for API/WEB/PAY/GATEWAY types; −0.10 for BACKUP (*"offline-tolerant workload"*); +0.10 × revenue fraction; floor 0.10
- **breach** — `SENSITIVITY_BREACH_WEIGHT` (RESTRICTED 0.32 / CONFIDENTIAL 0.26 / INTERNAL 0.16 / PUBLIC 0.08); +0.06 for DB/DATA/IDP/IDENTITY
- **regulatory** — base 0.14; +0.06 if criticality ≥ 70; +0.05 if RESTRICTED
- **reputational** — balancing residual, floor 0.05

### (f) Risk score (0–100)

```python
normalizedImpact = (financial_impact / max_financial_impact) * 100
exposureScore    = 50 (if internet_exposed) + 30 (if RESTRICTED/CONFIDENTIAL) + 20 (if criticality >= 80), capped 100
riskScore        = probability*40 + normalizedImpact*0.35 + exposureScore*0.25

Bands:  >=75 CRITICAL | >=50 HIGH | >=25 MEDIUM | else LOW
```

### (g) Expected Annual Loss

```python
EAL(asset)    = sum over OPEN/IN_PROGRESS vulns of (adjustedProbability * SPI)   # linear additive
residual      = EAL * (1 - control_reduction)
enterprise    = min(100, avgScore * 1.1 + (totalEAL / 10,000,000) * 2)
```

### (h) Monte-Carlo loss distribution (`loss_distribution.py`, FAIR-style)

Per asset: `impact += 1.0` (avoid log 0) → lognormal `log_mean = ln(impact*0.5)`, `log_sigma = clamp(ln(impact*1.5) - log_mean, 0.1, 2.5)`. 5,000 seeded runs (`default_rng(seed=42)`), event count as Bernoulli(`p/3`). Outputs p5/p50/p95/p99, **VaR95 = p95**, 20-bin histogram in ₹ million, and the narrative *"Point estimate masks tail risk — use the p95/p99 band for capital and insurance decisions."*

### (i) Forecasting — two engines

- **Deterministic** (`forecast.py::DoNothingForecast`): OLS least-squares slope over snapshots, clamped ≥ 0; falls back to calibrated drift (+12%/yr EAL, +25%/yr findings) and *states the fallback in the `method` string*.
- **ML** (`ml_forecast.py::MLForecast`): three `XGBRegressor(n_estimators=250, max_depth=3, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8, random_state=42)` models (EAL / risk score / vuln count) on 6 engineered features — lag-1, lag-2, rolling mean, rolling std, `polyfit` slope, net change (window 5). Recursive multi-step projection (each prediction re-fed as the next lag). **Graceful degradation:** `MIN_SAMPLES=18`; below that it hands back to `DoNothingForecast` with `ml.used=false` and an honest reason string. *"the API never errors on small data."*

### (j) Sovereign Risk Index (`national_twin.py::_sri`)

```python
SRI = 0.35*norm(avgRiskScore/100) + 0.30*norm(sectorEAL/nationalEAL)
    + 0.20*controlCoverage + 0.15*(dataConfidence/100)
```

### (k) Data-quality confidence (`confidence.py::DataQualityEngine`) — 5 weighted components

`vuln_exposure_coverage 0.25 · asset_metadata 0.20 · vuln_freshness 0.20 (90-day linear decay, alert >45d) · control_verification 0.20 · dependency_coverage 0.15`, each with an **explicit human-readable gap string**.

### (l) Graph analytics

- **`risk_graph.py`** — BFS blast radius, depth-capped at 4, with parent-pointer hop-path reconstruction. *"If B is compromised, A is in B's blast radius."*
- **`attack_path.py`** — hand-authored deterministic 4-hop crown-jewel path: `WEB-APP-001 → API-GW-001 → PAY-SRV-001 → CUST-DB-001` ("Exfiltration of crown-jewel customer PII"). Per-hop probability from live CVSS + controls; worst-case (`max`) over vulns; mean-time-to-compromise heuristic (6h at >0.7 probability → 96h at ≤0.1).

### (m) Tamper-evident audit chain (`audit_chain.py`)

```python
canonical = json.dumps(payload, sort_keys=True, separators=(",",":"), default=str)
data_hash = SHA256(canonical)

verify(): recompute every hash + prev_hash linkage from genesis "0"*64
          → status in {INTACT, TAMPERED, EMPTY}
```

### (n) TPRM (`tprm.py`)

```python
P(vendor compromise) = clamp(0.60 - assessment_score*0.55
                             + min(openVulns*0.08, 0.30)
                             + serviceTypeModifier, 0.02, 0.95)

serviceTypeModifier:  MSP 0.10 | CLOUD 0.05 | SAAS 0.03 | HARDWARE 0.03 | INTEGRATOR 0.02

attributable_EAL = sum(asset_EAL * risk_share)
cascade adds each dependent's full EAL via RiskGraph
```

### (o) Scenario engine + delay analysis

Four change types: `add_control`, `remediate_vuln`, `modify_asset`, `delay_remediation`. The delay lever is the cleverest piece:

```python
escalation = 1 + min(0.40, days/365 * 0.40)   # "attacker dwell-time leverage"
```

`_delay_analysis` re-runs the identical state with `escalation=1.0` and reports the **cost of deferral** — the "what does waiting 90 days cost me?" number that a CISO can take to a board.

## 3.2 Investment optimiser (`services/investment-optimizer`, port 8091) — **CP-SAT, not LP**

```python
model = CpModel()
gains  = [int(round(eal_reduction_i  * 10000)) for i]   # Rs.0.0001 granularity
costs  = [int(round(implementation_cost_i * 100))  for i] # Rs.100 granularity
budget = int(round(budget_inr * 100))
picks  = [model.NewBoolVar(f"pick_{i}") for i in range(n)]

model.Add(sum(picks[i] * costs[i] <= budget))          # hard budget constraint
model.Maximize(sum(picks[i] * gains[i]))                # maximise total EAL reduction
solver.parameters.max_time_in_seconds = 10.0
```

- Binary ⇒ **controls are bought whole, never fractionally split.**
- Accepts `OPTIMAL` **or** `FEASIBLE` (10s cap).
- **Density-greedy fallback** if OR-Tools is unavailable.
- Crucially: each control's `eal_reduction` is a **real delta** — EAL is recomputed with and without the control active using the *same* probability/impact math as the risk engine. Docstring: *"No hardcoded ₹10M baseline."*
- **ROSI** = `(EAL_reduction − (impl_cost + maint × horizon)) / total_cost × 100`
- Three modes: `maximize` (CP-SAT), `target` (greedy density + **prune-most-expensive-while-feasible**), `national` (per-`(control, sector)` candidates → same CP-SAT).
- The **investment curve** re-runs the *full* optimiser at each of 12–16 budget points, so the frontier shows genuine diminishing returns.
- A test named `test_global_optimum_beats_density_greedy` explicitly proves the solver finds 12.0 where greedy finds 9.0.

## 3.3 National Observatory (SCRO)

- **Summary** — national EAL, SRI, top 5 sectors, top 10 critical-infra assets, `framing` narrative string (₹→crore at 10,000,000/Cr).
- **Sector roll-ups** — EAL, EAL share %, avg score, control coverage %, data confidence %, open vulns, SRI, regulator, `threshold_critical_mln` with `threshold_exceeded` flag.
- **Region heatmap** — ECharts matrix payload `[row, col, eal]` (D1 decision: **no external geojson**, works offline).
- **Agency breakdown** — assets + critical-infra counts + EAL per agency, sorted desc.
- **National drills** — 4 templates, each expressed as *asset-state mutations* pushed through the same `ScenarioSimulator`:
  - `WORM` — *"WannaCry-Class Worm"* → `internet_exposed=True`, `criticality+20`
  - `RANSOMWARE` — `business_value × 1.40`, `sensitivity→RESTRICTED`
  - `SUPPLY_CHAIN` — `criticality+15`, **requires `vendor_id`**
  - `DDOS` — `annual_revenue_impact × 1.50`

  Scope: `SECTOR | REGION | AGENCY | NATIONAL | VENDOR`. Every run persists to `gov.exercises` and commits an `AuditChain` entry. `rerun` writes a *new* row rather than mutating history.
- **Budget allocator** — ₹X across sectors, per-sector allocation + portfolio ROSI.
- **Regulator report** — aggregates national + sectors + regions + agencies + compliance + per-sector compliance + data quality + `AuditChain.verify()` + early warnings.

## 3.4 RAG compliance retrieval (`services/ai-service`, port 8092)

**Embedder** — deterministic, offline, zero-cost, PII-safe:

```python
tokens = re.findall(r"[a-z0-9]+", text.lower())
idx    = int(hashlib.md5(token).hexdigest()[:8], 16) % 384
vector[idx] = 1.0 + math.log(count)     # sub-linear TF
vector = vector / norm(vector)          # L2 normalise
```

**Retrieval** — full-table cosine similarity in pure Python; results with `score <= 0` dropped. Embeddings stored as **JSONB** so it works without pgvector; migration 010 wraps `CREATE EXTENSION vector` in `EXCEPTION WHEN OTHERS THEN RAISE NOTICE`.

**Corpus: 21 clauses across 10 framework codes** (verified against `rag.py::CORPUS`):

| Framework | n | Clauses indexed |
|---|---|---|
| `ISO27001` | 4 | A.9.2.1 user registration · A.8.1.1 asset inventory · A.16.1.2 event reporting · A.12.6.1 technical vulnerabilities |
| `NISTCSF` | 5 | GV.OC · ID.AM · PR.AT · DE.CM · RS.RP |
| `CIS` | 3 | 6.4 MFA · 7.4 perimeter/email · 5.1 account management |
| `RBI` | 3 | ITGR Part B (board-approved IT strategy + CSIRT) · DSA/cyber-resilience (BCP/DR + incident reporting) · ITGR Part C (internal audit) |
| `SEBI` | 1 | Circular 2019 — MII Cybersecurity & Cyber Resilience Framework + incident SLA |
| `DPDP` | 1 | Act 2023 Sec 9 — minimisation, purpose & storage limitation, impact assessment |
| `ITACT` | 1 | IT (Amendment) Act 2008 Sec 70 — NCIIPC compliance audits |
| `TRAI` | 1 | Recommendation 2017 — prior informed consent, encryption in transit/at rest |
| `IRDAI` | 1 | Guidelines — board-approved info-sec policy, regular audits |
| `NCIIPC` | 1 | Guidelines — layered security, audits, availability redundancy |

**Static control→mandate map** (`compliance.py`): 8 control types × **39 mandates** spanning NIST CSF 2.0 (`PR.AA-01`, `PR.PS-02`, `DE.CM-02`, `PR.PS-05`, `PR.PS-01`, `PR.DS-01`, `DE.CM-01`), CIS v8 (6.4, 7.4, 13.8, 3.12, 4.8, 3.11, 8.2), ISO 27001:2022 (A.8.8, A.8.13), RBI (`G3.5.1`, `G3.6.2`, `G3.3.2`, `G3.3.5`, `G4.4.4`, `G3.3.4`), SEBI CSCRF, TRAI, IRDAI, NCIIPC, DPDP S.9. Plus `SECTOR_FRAMEWORKS` mapping BANKING→RBI, PAYMENTS→RBI+SEBI, TELECOM→TRAI+NCIIPC, HEALTH→IRDAI+DPDP, GOVERNMENT→NCIIPC+DPDP.

## 3.5 AI assistant

- `POST /api/ai/query` — **intent classification** (NATIONAL / COMPLIANCE / TREND / FORECAST / VAR / INVEST / other) → routes to the *real* internal endpoint → plain-English answer.
- `POST /api/ai/recommend`, `/api/ai/explain/risk/{assetId}`, `/api/ai/summarize`, `/api/ai/summarize/for/{role}`.
- **LLM = OpenAI (`gpt-4o` default) with a deterministic offline mock.** `USE_MOCK_LLM=true` by default ⇒ **₹0 to run**. Any OpenAI exception silently falls back to the mock. The API contract is identical either way, so the swap is a config change, not a code change.

## 3.6 Threat-intel enrichment (`vulnerability-service/app/core/threat_intel.py`)

This is the one part that hits **real external services** — three live feeds with 3-tier degradation (live → Postgres cache → neutral `offline` markers, 6-hour TTL):

| Feed | Source | Method |
|---|---|---|
| KEV | CISA Known Exploited Vulnerabilities | GET JSON |
| EPSS | FIRST | POST `{"filter":{"cve":[...]}}` |
| NVD | NIST NVD 2.0 | GET per-CVE, CVSSv3.1 → v3.0 fallback |

Enrichment **boosts the priority score**: `+0.25` if in KEV, `+0.10` if EPSS ≥ 0.5. Parse functions are pure and unit-tested with real fixtures (`CVE-2021-44228` Log4j, `CVE-2020-1472` Netlogon).

## 3.7 Realtime pipeline

```
ingest → normalise → persist public.security_events → publish Redis security.events.*
   → risk-engine RiskEventConsumer thread (applies the event, MUTATES the DB,
     recalculates the asset, publishes risk.events.updated, evicts national cache)
   → notification-service RedisBridgeThread (evaluates alert rules)
   → STOMP 1.2 broker over native WebSocket /ws
   → React useWebSocket → riskStore refresh
```

The docstring makes the intent explicit: *"This is what makes the 'live' loop genuine: an ingestion event actually mutates state and the risk numbers on the dashboard change without any refresh."*

- **STOMP 1.2 implemented from scratch** (`stomp.py`, 180 lines): CONNECT/SUBSCRIBE/UNSUBSCRIBE/SEND/DISCONNECT + `<LF>` heartbeats, subprotocol negotiation (`v12.stomp`, `v11.stomp`, `v10.stomp`) for `@stomp/stompjs` RFC-6455 compliance, `\x00` frame delimiter.
- Topics: `/topic/risk/updated`, `/topic/ingestion/event`, `/topic/risk/alert`.
- Client: `heartbeatIncoming: 0, heartbeatOutgoing: 0`, **exponential backoff with full jitter** (1→2→4→8→16→30 s, each scaled 0.5–1.0×) so a client fleet doesn't reconnect in lockstep.

## 3.8 Platform services

| Service | Port | What it owns |
|---|---|---|
| **api-gateway** | 8080 | Catch-all reverse proxy, JWT validation, Redis rate limit (120/min per IP, 300/min per user), per-upstream circuit breaker (5× 5xx → open 30 s), HMAC-signed `X-User-Id`/`X-User-Roles`/`X-User-Sig` injection, Prometheus `/metrics`, 10-header security hardening middleware, `/api-docs` service index |
| **auth-service** | 8081 | bcrypt(10) direct, JWT HS256, **refresh-token rotation with family-based reuse detection**, audit logging of LOGIN/FAILED_LOGIN/REFRESH/ROLE_UPDATE, admin user CRUD |
| **asset-service** | 8082 | Asset CRUD, dependency edges, 1–10 criticality scoring (×10 → 10–100), stats |
| **vulnerability-service** | 8083 | Vuln CRUD, CVSS→severity, prioritisation `(cvss/10)×0.4 + expl_norm×0.3 + (crit/100)×0.3`, bulk, findings, threat-intel |
| **control-service** | 8084 | Control catalogue, effectiveness with **incident + compliance dampening** |
| **ingestion-service** | 8085 | Event normalise/persist/publish, 4 simulators, 5 live simulated connectors on a daemon thread, replay jobs |
| **notification-service** | 8086 | STOMP broker, Redis bridge, threshold alert engine (4 metrics: `risk_score`, `total_eal`, `open_vulns`, `kev_count`) |
| **cybercommon** | lib | Settings, engine/Session, 15 ORM models, JWT, bcrypt, Redis, `@cached` decorator + `cache_evict`, FastAPI auth deps, JSON logging with uvicorn formatter patching, internal service tokens |

**Control effectiveness dampening** is a nice touch of realism:

```python
incident_dampening   = min(0.35, incident_count_90d * 0.05)
compliance_dampening = min(0.30, open_critical_high * 0.03)
dampened             = avg_effectiveness * (1 - min(0.5, sum))
```

*"A control that keeps failing in the incident log shouldn't be trusted at face value."*

## 3.9 Frontend (React 18 + TS + Vite + Tailwind + ECharts 6)

**Zero UI component library** — everything is hand-rolled Tailwind + `lucide-react`, with a design-token system (25 CSS variables as RGB triples, semantic `risk.*`/`status.*`/`surface.*` tokens, `.cyber-card`/`.cyber-panel`/`.cyber-input`/`.cyber-btn-*`).

| Page | Route | Min role | Content |
|---|---|---|---|
| Executive Dashboard | `/` | VIEWER | Risk-score gauge, EAL + VaR95, loss distribution, impact composition, financial exposure, trends, data quality, compliance, AlertsFeed, audit chain |
| Security Dashboard | `/security` | ANALYST | Event simulator, attack path, blast radius, severity distribution, control coverage |
| Asset Management | `/assets` | ANALYST | Inventory, criticality, filters |
| Risk Analysis | `/risk` | VIEWER | Risk matrix, breakdown tree, timeline, forecast, compliance mapping |
| Vulnerability Management | `/vulnerabilities` | ANALYST | Backlog + KEV/EPSS enrichment + prioritisation |
| Scenario Simulator | `/simulator` | ANALYST | add/remediate/modify/**delay** what-if |
| Investment Optimizer | `/investment` | CISO | CP-SAT results, curve, ROSI leaderboard, national allocation |
| **National Observatory** | `/national` | CISO | Two tabs: **Oversight** (Ministry/CERT-In) and **Regulatory** (RBI-style) |
| AI Assistant | `/ai` | ANALYST | Chat + recommendations |
| Settings | `/settings` | ADMIN | WS connection state, env display |
| Login | `/login` | public | Demo credential splash |

**API client design** — one axios instance with recursive key-case conversion: **outbound bodies/params → camelCase, inbound responses → snake_case** (hence every `types/*.ts` uses snake_case). A 401 interceptor clears the token and hard-navigates to `/login`.

**Guided Tour** is unusually sophisticated for a demo: `data-tour` attribute selectors, a **retry ladder at 300/400/800/1600/3200 ms**, re-measurement at +350/+700 ms, passive scroll + resize listeners to keep the spotlight aligned, right→left→below tooltip placement with viewport clamping, and 64 tour items for an ADMIN (10 pages + 54 sections). Dismissal persisted in `localStorage['scro-tour-dismissed']`.

**Exports** — CSV (union-of-keys, RFC-4180 escaping) and PDF (jsPDF + autotable, landscape A4, navy header band, per-page footer *"Sovereign Cyber-Risk Observatory · Page N of M"*). `sanitizePdfText` handles the **rupee-sign problem** — jsPDF's core Helvetica lacks `₹`, so it maps to `Rs. `, and en/em dashes to `-`. Backend also serves `/api/risk/report/export?section=eal|compliance|business-units|trends|full`.

---

# PART 4 — TECH STACK

## 4.1 Complete stack

| Layer | Technology | Version (pinned in `requirements.txt`) |
|---|---|---|
| **Frontend** | React 18.3 · TypeScript 5.3 · Vite 5.1 · Tailwind 3.4 · ECharts 6.1 · Zustand 4.5 · React Router 6.22 · `@stomp/stompjs` 7 · axios 1.6 · jsPDF 4.2 + autotable 5 · lucide-react · date-fns · `@fontsource/inter` |
| **Frontend test/lint** | Vitest 2.1 · jsdom 25 · Testing Library 16 · ESLint 8.57 (flat config) · Prettier 3.9 |
| **API framework** | FastAPI **0.115.0** (pinned) · Starlette 0.37.2 (pinned) · Pydantic 2.9.0 · pydantic-settings 2.5.0 |
| **ASGI server** | uvicorn[standard] **0.30.0** — `[standard]` retained deliberately for `websockets` |
| **ORM / DB** | SQLAlchemy 2.0.36 · psycopg2-binary 2.9.10 · asyncpg (declared) · PostgreSQL (schemas `auth, asset, vuln, control, risk, investment, gov, public`) |
| **Cache / bus** | Redis 5.2.1 (pub/sub, rate limits, connector state, circuit-breaker state, replay jobs) |
| **Auth** | PyJWT 2.10.1 (HS256) · bcrypt 4.2.1 (10 rounds, fresh salt) — **not passlib** (deliberate: passlib 1.7.x crashes with bcrypt ≥ 5) |
| **Gateway telemetry** | httpx 0.28.1 · prometheus-client 0.21.1 |
| **Process supervision** | supervisor 4.2.7 (Render) |
| **AI** | openai 1.57.4 (`gpt-4o`) + offline deterministic mock |
| **ML** | numpy ≥1.26 · pandas ≥2.2 · scipy ≥1.12 · scikit-learn ≥1.4 · xgboost ≥2.0 |
| **Optimisation** | ortools ≥9.8 (CP-SAT) |
| **Realtime** | Native WebSocket + hand-rolled STOMP 1.2 |
| **CI/CD** | GitHub Actions (3 workflows) · Dependabot · Render blueprint · Vercel (frontend) · Cloudflare Tunnel (free public URL via is-a.dev) |
| **Process mgmt (local)** | `scripts/dev.ps1` / `dev.sh` — 10 uvicorn processes + logs to `.dev/logs/` |

`requirements.txt` is documented as *"the union of every `services/*/pyproject.toml` runtime dependency plus the process supervisor"*, with web-core pinned exactly because *"a silent minor bump there breaks the gateway's proxy routes or the /ws handshake."*

## 4.2 Architecture

```
Browser (React SPA :3000 / nginx)
   |-- /api/*  -->  api-gateway (8080)
   |                 JWT | rate limit | circuit breaker | metrics | headers
   |                 +--> auth 8081 | asset 8082 | vuln 8083 | control 8084
   |                     ingestion 8085 | risk 8090 | investment 8091 | ai 8092
   +-- /ws   -->  notification-service (8086)  <-- bridge thread --> Redis 7
                                        ^
                                        +-- risk-engine RiskEventConsumer (Redis sub)
   -------------------------------------------------------------------
   PostgreSQL (cyberrisk) - 8 schemas, 26 tables
```

## 4.3 Service decomposition rationale

Each service owns one bounded context with its own port, and **the gateway is the only public ingress**. Static env-var service discovery (changed from Docker service names to `127.0.0.1` defaults because *"the previous Docker service-name defaults only resolved inside a compose network and would hang for 180s per request anywhere else"*).

## 4.4 Database (26 tables, 8 schemas, 53 indexes)

| Schema | Tables |
|---|---|
| `auth` | `users`, `audit_logs`, `refresh_tokens` |
| `asset` | `assets` (19→24 cols after migration 008), `asset_dependencies` |
| `vuln` | `vulnerabilities` |
| `control` | `security_controls`, `asset_controls` |
| `risk` | `risk_calculations`, `risk_snapshots`, `risk_events`, `audit_entries` |
| `investment` | `investment_plans`, `investment_items` |
| `gov` | `agencies`, `sector_profiles`, `exercises`, `early_warnings`, `vendors`, `asset_vendors`, `compliance_docs` |
| `public` | `data_sources`, `security_events`, `threat_intel`, `alert_rules`, `alert_events` |

**Notable index design:** partial indexes on hot booleans — `idx_assets_exposed WHERE internet_exposed = true`, `idx_assets_critical_infra WHERE is_critical_infra = true`, `idx_refresh_tokens_revoked WHERE revoked_at IS NULL`. Composite `(sector, region)` for national roll-ups. `UNIQUE(asset_id, depends_on_id)`, `UNIQUE(asset_id, control_id)`, `UNIQUE(asset_id, vendor_id)` prevent graph/join duplication. **Zero triggers, zero stored functions** — the hash chain and alert engine are enforced entirely in Python.

**Seed data (~140 rows):** 12 assets (deterministic UUIDs `00000001-0001-0001-0001-00000000000N`), 15 vulns, 10 controls, 14 asset-controls, 18 dependency edges, 12 risk calculations, 25 weekly snapshots, 3 agencies, 3 sector profiles, 3 vendors, 8 vendor links, 1 historical drill, 2 early warnings, 7 data sources, 3 users, 4 alert rules.

**Seeded asset estate:** Payment Gateway Server (₹2.5 Cr, criticality 95, RESTRICTED) · Customer Database (₹2 Cr, 90) · Identity Provider (₹1.5 Cr, 85) · Customer Web Portal (₹1.8 Cr, 88) · API Gateway (₹1.2 Cr, 82) · Email Server · Backup & Recovery · Cloud Management Console (₹2.2 Cr, 92) · SIEM · Dev Environment (₹30 L, 40) · Analytics Warehouse · VPN Concentrator. **Σ business value ₹17 Cr, Σ annual revenue impact ₹31.7 Cr, 7/12 internet-exposed.**

**Seeded vulns (15):** 5 CRITICAL (CVE-2026-1001 SQLi in Payment API 9.8 · 1002 hardcoded creds in Cloud CLI 9.1 · 1003 path traversal 8.6 · 1004 XXE 8.2 · 1005 deserialization in SIEM 8.0), 6 HIGH, 4 MEDIUM. All 15 CWEs distinct. 13 OPEN, 2 IN_PROGRESS.

**Seeded controls (10):** MFA-Admin (₹2 L, 0.25) · MFA-All (₹5 L, 0.30) · EDR-Workstations (₹8 L, 0.20) · EDR-Servers (₹12 L, 0.22) · Critical Patch Mgmt (₹3 L, **0.35 — strongest**) · Network Segmentation (₹15 L, 0.25, 60 days — most expensive) · Backup Encryption (₹4 L, 0.15) · WAF (₹6 L, 0.18) · SIEM Enhancement (₹10 L, 0.12) · DLP (₹7 L, **0.10 — weakest**). Σ impl ₹72 L, Σ maint ₹16.1 L.

**Vendor estate:** CorePay Cloud Services (assessment 0.65) · NetSec Managed Security (0.55) · MedLens Data Processor (0.72), with 8 risk-share-weighted asset links.

## 4.5 Deployment paths (4, all working)

| Path | Mechanism | Notes |
|---|---|---|
| **Local native** | `scripts/dev.ps1` / `dev.sh` / `make up` | 10 uvicorn processes, logs → `.dev/logs/`, pids → `.dev/pids.json` |
| **Render (backend)** | `render.yaml` — `runtime: python`, `plan: free`, `PYTHON_VERSION` pinned to 3.12 (Render's 3.14 default has no wheels for pydantic-core/SQLAlchemy/psycopg2-binary). `buildCommand` is pip-only: **no apt-get**, because Render's native runtime has a read-only `/var/lib/apt`. `startCommand: bash deploy/render/start.sh` | `start.sh` = bootstrap: resolve the interpreter and supervisord → Python import preflight → normalise `DATABASE_URL` with `sslmode=require` → **wait for Postgres (90×2 s)** → wait for Redis (non-fatal) → **run migrations+seed** → render `supervisord.conf` → check `edge_proxy` imports → `exec supervisord` (**one** program). nginx is gone: `deploy/render/edge_proxy.py` is a pure-Python ASGI edge on `$PORT` (`/api/*`+`/health`→gateway, `/ws`→notification) running as an 11th server inside the same process. All ten services share **one** process at ~250 MB, which is what makes the free 512 MB plan viable. `DB_POOL_SIZE=2`, `MAX_OVERFLOW=2` keeps the Neon connection count low. `numInstances: 1`: STOMP conns, the risk-event consumer and the connector runner are in-process singletons. |
| **Vercel (frontend)** | `vercel.json` SPA rewrite | Build-time `VITE_API_BASE_URL` + `VITE_WS_URL`. Doc warns `VITE_API_BASE_URL` **must** be set or `/api` points at Vercel. |
| **Cloudflare Tunnel** | `scripts/serve-free.ps1` + `tunnel-fixed-setup.ps1` | Zone-less API-token mode (single permission: Account → Cloudflare Tunnel → Edit) → permanent `cyberrisk.is-a.dev` URL; auto-downloads `cloudflared` if absent; quick-tunnel fallback |

## 4.6 CI/CD

| Workflow | Jobs |
|---|---|
| `ci.yml` | `frontend`: Node 20 + `npm ci` + `npm run build` (tsc -b + Vite) + `npm run test` · `python`: Python 3.12, `compileall` × 12 (11 services + common + `database`) · `python-tests`: 8 pytest suites run individually (conftest path collisions) |
| `security-scan.yml` | `pip-audit` (weekly cron Mon 06:00 UTC + push/PR) · `npm audit --audit-level=moderate` — both `|| true` (advisory, non-blocking) |
| `dependabot.yml` | enabled |

**Makefile targets:** `help, install, up, down, restart, logs, status, migrate, seed, test, lint (ruff + eslint), typecheck, smoke, clean`.

## 4.7 Test coverage

**Backend — 18 test files, ~116 tests across 8 suites:**

| Suite | Focus |
|---|---|
| `common` (6 files) | JWT round-trip/tamper/expiry · bcrypt salting · cache fail-soft + decorator · **gateway HMAC header spoofing rejection** · JSON logging + uvicorn formatter patching · settings env override |
| `risk-engine` (26) | **17 formula tests** (CVSS anchors + interpolation + out-of-range, control independence `1−0.75×0.80`, impact components sum-to-total, risk score composition with inline arithmetic, band boundaries) · 4 audit-hash tests · 6 delay-escalation tests |
| `investment-optimizer` (14) | **CP-SAT beats density-greedy** · budget respected · whole-budget fill · 8 optimizer-math tests incl. real-delta non-negativity and ROSI math |
| `notification-service` (15) | STOMP frame parse/broadcast/heartbeat · alert operators, disabled rules, asset scoping, missing metrics, 4-metric contract |
| `vulnerability-service` (6) | KEV/EPSS/NVD parsers with **real CVE fixtures** · case-insensitive KEV matching |
| `control-service` (9) | config-strength capping · incident event-type coverage |
| `api-gateway` (6) | security headers on 200 **and** 404 · `/metrics` · `/api-docs` · circuit-breaker trip + **integer-counter `DEL` vs `HDEL` WRONGTYPE regression** · exact-match `is_excluded` |
| `ai-service` (2 files) | RAG embedder/retrieval + OpenAI integration path |

**Frontend — 11 test files:** `client` (snake_case converter) · `useWebSocket` (backoff) · `roles` · `severity` · `exportCsv` · `exportPdf` (`sanitizePdfText`) · `Toaster` · `SeverityBadge` · `notificationStore` · `toastStore` · `national/format`.

**Smoke test** — `scripts/smoke_sacro.ps1`, 12 assertions: login → national summary → sector compliance (BANKING→RBI) → RANSOMWARE×BANKING drill surge → national optimise → TPRM cascade → **audit chain verify** → WS reachable → asset/vuln/control surfaces → ingestion/alerts → insights/simulations → AI recommend/summarise + investment ROSI. Parameterised (`-Base`, `-WsUrl`) so it runs against Render too.

**Self-reported demo results (2026-09-19, in `implementation.md` §F4):** national EAL **₹6,520 Cr**, SRI **0.70** · RANSOMWARE×BANKING drill **+54% surge** (₹4,838 Cr → ₹7,430 Cr) · BANKING → **6 RBI requirements** · vendor cascade **₹15,863 Cr / 4 direct assets** · audit `INTACT` · ₹5 Cr budget → ₹1.54 Cr allocated across 3 sectors / 22 controls → **−67.5% EAL, ROSI ≈ +285,000%**.

---

# PART 5 — FEASIBILITY ANALYSIS

*Did they actually build what they set out to build, and does the thing work?*

## 5.1 Technical feasibility — Demonstrated, with caveats

**Evidence it works:**

1. The 12-step live loop is **genuinely wired**, not simulated. `RiskEventConsumer.handle()` parses a Redis message, opens a session, inserts a `Vulnerability` row, calls `persist_risk()` (versioned), and publishes `risk.events.updated`. A vulnerability detected in a simulator genuinely raises an asset's EAL. The docstring is honest: *"This is what makes the 'live' loop genuine."*
2. **The math is single-sourced and unit-tested.** 17 dedicated formula tests including an inline-arithmetic assertion (`20 + 17.5 + 25 = 62.5`) and a sum-to-total invariant for the impact decomposition. This is better discipline than most production risk engines.
3. **The optimiser is provably optimal, not greedy.** `test_global_optimum_beats_density_greedy` is a genuine counterexample test, and `_cp_knapsack` uses real CP-SAT with `OPTIMAL`/`FEASIBLE` semantics.
4. **Degradation is designed, not accidental.** XGBoost → deterministic fallback; OR-Tools → greedy fallback; OpenAI → mock; threat feeds → cache → offline; Redis down → rate limiter fails **open**, circuit breaker fails **closed** (with the reasoning documented: *"Tripping every circuit during a cache outage would turn a degraded rate limiter into a full outage"*). Logger teardown, the missing-import preflight in `start.sh`, and an edge-proxy import check before handover are all there specifically to avoid restart loops.
5. **The vulnerability feed integration is real production engineering**: 3-tier cache, TTL, pure parsers, and 3 *real* CVEs as test fixtures.
6. **It has been run.** Smoke 12/12, and a manual demo with recorded numbers.

**Where feasibility is weaker:**

| Concern | Assessment |
|---|---|
| **Scale** | Built and validated at **12 assets / 15 vulns**. `RiskCalculator.get_max_financial_impact()` loads the whole `Asset` table and is called **once per asset inside the scenario loop** → O(N²). `ScenarioSimulator` will not survive thousands of assets. The drill engine calls the full simulator per drill. |
| **RAG scaling** | `rag.retrieve()` does `query.all()` + Python cosine over the entire corpus. Fine for 21 clauses; unusable for 21,000. pgvector is *installed* but no `<=>` operator or ANN index is used. |
| **ML validity** | The 25 snapshots are **synthetic**, generated by a deterministic formula (`growth_factor = 1 + 0.0035 × weeks_back`), and are **global (not per-asset)**, contradicting both `README.md` and `ML_FORECAST.md`. The XGBoost model is therefore learning a straight line, not risk dynamics. `MIN_SAMPLES=18` is met only by construction. Also: `ml_forecast.py` re-instantiates models per request via `forecast_ml()`, so the documented in-process model cache never actually caches. |
| **Multi-tenancy** | `gov.agencies` has a `parent_agency_id` self-FK and ADR D2 says *"Inter-agency federation simulated... multi-tenant = Phase 3"*. Correct scoping for a national twin; **not** multi-tenancy. |
| **No scheduler** | Snapshots must be created via `POST /api/risk/snapshot`. Nothing runs periodically, so the "continuous" claim depends on event traffic, not a clock. |
| **Horizontal scale** | Explicitly blocked by `numInstances: 1` — STOMP connections, the event consumer and the connector runner are in-process singletons. |

## 5.2 Technical feasibility — the demo vs. product gap

| Capability | Demo state | Product state |
|---|---|---|
| Data ingestion | **5 simulated connectors** (SIEM/Splunk, EDR/CrowdStrike, IAM/Okta, CSPM/Prisma, NIDS/Zeek) fabricating payloads | Real Nessus/Defender/Splunk/file-drop adapters (Phase 2) |
| EAL inputs | `business_value_inr` is a **manually entered** field | Needs CMDB/GL/BCP integration to be trustworthy |
| `exploit_in_wild` | KEV/EPSS enrich the **priority score** but are **not folded into probability** (contradicting `architecture.md` §11.1's `× 1.3`) | Should feed `cvss_to_probability` |
| Attack path | 1 hard-coded 4-hop path with 12 hard-coded UUIDs | Graph-derived paths from real network telemetry |
| Forecast | 25 synthetic snapshots | ≥18 months of real history |
| Identity | 3 seeded accounts, HS256 shared secret, no SSO | OIDC/SAML + Aadhaar/eGazette, per-agency federation |

**This is the honest core of the feasibility verdict:** the *engine* is real, tested, and reusable. The *data* is seeded. The architecture explicitly separates the two (`D5: "No new math or infra — every new module calls existing core engines"`), which is the right engineering call — but it means **the quantitative outputs are only as good as the hand-entered asset valuations and the simulated telemetry.**

## 5.3 Operational feasibility

- **One machine, ~1 GB RAM** for the full 10-service stack (documented). `make up` / `scripts/dev.ps1` on Windows or Mac.
- **Cold start on Render** = apt + pip (numpy/scipy/xgboost/ortools) + ~5 min DB wait + migration/seed. Docs acknowledge "allow several minutes."
- **No GPU.** Pure-CPU XGBoost + CP-SAT in 10 s. A ₹3–5k/mo VM runs all ten services.
- **Onboarding** = `docker`/`make up` → login → dashboard. Docs claim "hours, not weeks."

---

# PART 6 — VIABILITY ANALYSIS

*Would this survive contact with a real institution, and can it be sustained?*

## 6.1 Institutional viability — strong

**The regulatory pull is real and named precisely.** The project is not generic; it indexes the actual instruments an Indian financial institution is audited against: **RBI IT Master Directions (Part B/C, G3.5.1, G4.4.4), SEBI CSCRF/Circular 2019, IRDAI Guidelines, TRAI, NCIIPC under IT Act 2008 §70, DPDP Act 2023 §9, plus NIST CSF 2.0 / CIS v8 / ISO 27001:2022.** That specificity is the single strongest viability signal in the repository — it means the author understands the buyer's compliance obligations, not just the security domain.

**A live regulatory demand exists.** India's **CERT-In Directions (28 Apr 2022)** impose 6-hour/24-hour/72-hour reporting timelines and 180-day log retention; **RBI** requires board-approved IT strategy, a CSIRT, cyber-resilience frameworks and periodic independent assessment; **DPDP §9(5)** mandates data-fiduciary security safeguards. Each of those is a compliance obligation that costs money, and each is currently answered with spreadsheets. A tool that turns a §9(5) gap into a ₹ figure with a remediation plan has a budget line.

**The buyer is identifiable and singular.** `docs/ROADMAP.md` and the SCRO persona design point at one buyer: **CERT-In / MeitY / a national financial-sector CERT**, or a **sectoral regulator (RBI/SEBI/IRDAI)**. That is a procurement-friendly sale — one accountable owner, one budget.

**TPRM is the killer app for enterprises.** Post *Log4Shell* and the MOVEit/CrowdStrike supply-chain incidents, vendor EAL attribution + blast-radius cascade is a board-level question. The seeded `₹15,863 Cr` cascade across 4 assets is exactly the number that gets a CFO's attention.

**The audit chain is a regulatory feature, not a nice-to-have.** For a regulated entity, "prove the risk figure you reported to the board in Q3 is the figure you computed" is a real requirement. SHA-256 hash-linked `INTACT`/`TAMPERED` verification is a defensible answer, and it's the kind of detail that wins a procurement scoring matrix.

## 6.2 Commercial viability — plausible, with a narrow path

The README's own honest cost model (§22) is the most credible part of the whole document:

| Approach | Team | Timeline | Cost |
|---|---|---|---|
| **A. Frugal solo/student** | 1 | 4–6 months | ₹6–14 L (~$7–17k) |
| **B. Startup/gov POC MVP** | 5–6 | 6–9 months | ₹35–60 L (~$40–70k) |
| **C. National enterprise rollout** | 20–30 | 12–24 months | ₹1.5–4 Cr (~$180–500k) |

**Viability strengths:**

- **₹0 software licence.** Every layer is OSS. No per-seat SaaS, no Splunk/ServiceNow licence. The competitive wedge is *displacement* of expensive SIEM-adjacent point tools.
- **₹0 AI cost by default.** The mock LLM + deterministic embedder means a POC costs nothing to run and nothing to demo. This is a genuine commercial advantage in price-sensitive Indian public-sector procurement.
- **Low marginal cost.** CPU-only; a ₹3–5k/mo VM serves the whole stack.
- **Optional LLM upside.** `USE_MOCK_LLM=false` + `OPENAI_API_KEY` is a config flip on an identical API contract — so the product can monetise a "real AI answers" tier with no rewrite.

**Viability weaknesses — and these are structural, not cosmetic:**

| Blocker | Why it matters commercially |
|---|---|
| **`P(compromise)` is a piecewise-linear CVSS lookup table** | A table with 10 hand-picked anchors is a **calibration placeholder**, not a measurement. No bank will accept "₹4,838 Cr" if the probability layer is 10 arbitrary numbers. FAIR requires calibration to the organisation's own loss data. This is the single biggest credibility gap. |
| **Linearly additive EAL across vulns** | `Σ Pᵢ × SPI` assumes independence and constant impact. A correlated ransomware event across 6 assets is one event, not 6. Monte-Carlo compounding is *present but cosmetic* (Bernoulli `p/3`, per-asset, summed). |
| **Control weights are asserted, not validated** | `PATCH: 0.30` has no citation to a control-effectiveness study. A regulator or a CISO will ask "where does 0.30 come from?" There is no answer in the repo. |
| **Business value is a manual field** | EAL is only as good as `business_value_inr`. Nothing derives it from the general ledger. |
| **No scheduler** | "Continuous" quantification that requires a human to click a snapshot button is a demo, not a subscription. |
| **No multi-tenancy** | Two banks on one instance = cross-tenant leakage. This blocks the SaaS model entirely and forces per-institution on-prem — which is *fine* for government (and often required) but caps the market at project revenue. |
| **No audit/reporting automation** | Regulatory reports are still PDF-via-browser. A CERT-In monthly brief has to be generated by hand. |
| **Secret hygiene failure** (see §8.1) | A committed live cloud DB credential is a deal-breaker in any security review. It is trivially fixable, but it must be fixed and the credential rotated. |
| **Single-developer concentration** | `TODO.md` reports "Overall Progress: 100%". Bus factor ≈ 1. For a 12–24 month national programme this is the practical risk, not the code. |

**Viability verdict:** *technically viable, institutionally wanted, commercially narrow.* The realistic path is **project/foundation revenue, not SaaS** — sell a POC to one CERT or one sectoral regulator, prove EAL calibration against that entity's own incident history, then expand agency-by-agency (which is exactly Phase 3's "inter-agency onboarding with per-agency data isolation"). The moat is not the code — it is **the calibration data and the regulatory trust** accumulated in the first engagement.

## 6.3 Sustainability

- **OSS-only stack** ⇒ no licence-renewal cliff; the ₹ line item is people + cloud.
- **CI + Dependabot + weekly `pip-audit`/`npm audit`** ⇒ maintainable.
- **Idempotent migrations** ⇒ re-runnable, schedulable. But there is **no `schema_migrations` ledger or checksum**, so a future migration that isn't written with `IF NOT EXISTS` will silently re-run.
- **Bus factor 1** is the sustainability risk.
- `docs/ROADMAP.md` correctly labels Phase 2/3 items as "future — not in demo scope" and `docs/SECURITY_HARDENING.md` correctly leaves production items open **by design**. That documentation discipline is unusual and valuable.

---

# PART 7 — IMPACT & BENEFITS

## 7.1 By stakeholder

| Stakeholder | Benefit | Evidence in the system |
|---|---|---|
| **CISO** | Risk in a language the board approves; a defensible control backlog ranked by rupee-reduction, not vendor pitch; visible control *effectiveness* dampened by real incident history | ROSI leaderboard, `control-service` effectiveness, `DataQualityEngine` gap strings |
| **CFO / Finance Ministry** | A single monetary number per asset, sector and nation; VaR95 for capital and insurance; the "do-nothing cost" of deferral | EAL, p95/VaR band, `DoNothingForecast.do_nothing_cost_12m`, `additional_annualized_loss_inr` |
| **Board / Ministry** | Whole-nation SRI, sector/region heatmaps, national drill outcomes, regulator-ready report with a verifiable audit badge | `/national` Oversight tab, `SovereignTwin.regulator_report()`, `AuditChain.verify()` |
| **Regulator (RBI-style)** | 39 mandate-mapped requirements, per-sector gap posture, TPRM vendor exposure, evidence chain | `ComplianceMapper`, `SectorCompliance`, `TPRMManager`, CSV/PDF export |
| **CERT-In / NCIIPC** | Sector baselines, early-warning thresholds, national exercise history, critical-infra asset register | `gov.early_warnings`, `DrillEngine`, `SovereignTwin.summary().framing` |
| **Analyst** | Automated CVSS→probability, 4-way impact decomposition, control-reduction maths, confidence scoring — no more manual model building | whole `risk-engine` |
| **Vendor risk / third-party management** | P(compromise) from assessment + open-vuln posture, weighted EAL attribution, full blast radius per vendor | `TPRMManager` |
| **SME / institution without a CISO** | ₹0 running cost, OSS-only, offline mock LLM, deterministic RAG, one-machine deployment, 4 roles out of the box | `USE_MOCK_LLM=true`, `requirements.txt` all-OSS, `make up` |

## 7.2 Economic impact (from the repo's own seeded run)

- **₹6,520 Cr national EAL** — a figure that, if it appears in a CERT-In annual report, changes the national security-budget conversation from anecdote to allocation.
- **RANSOMWARE × BANKING = +54% surge** (₹4,838 Cr → ₹7,430 Cr) — the argument for pre-positioning controls, quantified.
- **₹5 Cr → ₹1.54 Cr allocated, −67.5% EAL, ROSI ≈ +285,000%** — demonstrates the *shape* of the return. **Important caveat: ROSI of this magnitude is an artifact of the seeded data** (control costs are lakhs, EAL deltas are crores). In a real portfolio, defensible ROSI is 200–900%. Present it as a mechanism demo, not a claim.
- **₹15,863 Cr vendor cascade** — the number that ends "is our MSP a risk?" discussions.

## 7.3 Methodological impact (the durable contribution)

The most valuable thing here is not a feature but a **modelling stance**:

1. **Continuous, not annual.** An event-driven recalculation loop with a genuine DB mutation and a live push.
2. **Money, not scores.** Every technical finding terminates in ₹.
3. **Uncertainty is stated, not hidden.** A 5-component data-confidence score with explicit gap strings; VaR bands (`conservative_best / expected / adverse / severe`); ML that *declines to run* below 18 samples and says why; deterministic-vs-ML method disclosure in the payload.
4. **Decisions are auditable.** A hash chain that can prove non-tampering.
5. **Optimise, don't just report.** A provably-optimal knapsack, not a ranked list.
6. **Every number is reproducible.** Single-sourced formulas, 17 unit tests, inline arithmetic in the assertions.

That is a defensible, teachable engineering standard, and it is more valuable than the dashboard.

## 7.4 Societal / national impact

- **Capacity building:** 17 glossary terms, 12 implementation phases, a 94-entry changelog, and a 64-step guided UI tour — a junior analyst or a CERT staff member can be productive in hours.
- **Sovereignty:** 100% open-source, no foreign SaaS dependency, all data in your own Postgres. For a national CERT this is a procurement requirement, not a preference.
- **Public-sector cost discipline:** turning "we need more security budget" into "here is the ₹ and the ROSI for each sector" is a fundamentally different conversation.
- **Tail-risk literacy:** the p95/p99 band and the narrative *"Point estimate masks tail risk"* introduce boards to the difference between expected and severe loss.

---

# PART 8 — FINDINGS, RISKS & DISCREPANCIES

*Found during analysis. Reported honestly; none of these are fatal, all are fixable.*

## 8.1 CRITICAL — act on this

**A live cloud database credential is committed to git.**

`database/generate_neon_setup.py:24-25` (a **tracked** file — confirmed via `git ls-files`) contains:

```
postgresql://neondb_owner:<password>@REDACTED-NEON-HOST/neondb?sslmode=require
```

**Actions:** (1) **rotate the Neon password now**; (2) remove the hard-coded `DATABASE_URL` constant from the generator; (3) purge from git history (`git filter-repo` / BFG); (4) add a pre-commit secret scanner.

Also present: hard-coded `jwt_secret` default in `cybercommon/config.py` (`"cybergate-default-secret-key-for-jwt-token-signing-2024"`) — a real secret-hygiene finding. `.env` also exists in the working tree (gitignored — correct, but the working tree ships it).

## 8.2 Documentation vs. code — the README is materially wrong on the core math

`README.md` §9 is the section a judge or evaluator will read first, and it **does not describe the code**:

| README §9 claim | Actual `formulas.py` |
|---|---|
| CVSS bands: 0–3.9→**0.06**, 4.0–6.9→**0.23**, 7.0–8.9→**0.48**, 9.0–10→**0.76** | 10 integer anchors: 10→**0.95**, 9→**0.85**, 8→**0.70**, 7→**0.50**, 6→**0.30**, 5→**0.15**, 4→**0.08**, 3→**0.03**, 2→**0.01**, 1→**0.005** |
| Control types `MFA .25, PATCHING .30, EDR .20, FIREWALL .15, IDS .12, BACKUP .10, SECURITY_AWARENESS .10, IAM .18, WIREFRAUD_DETECTION .08, DEFAULT .15` | `MFA .25, PATCH .30, EDR .20, SEGMENTATION .15, FIREWALL .10, BACKUP .08, DLP .05, SIEM .05`, default **0.05** |
| Residual via "coverage ≥ 0.8 counts in full, below scales" | Not implemented — reduction is `coverage × effectiveness × weight`, no 0.8 threshold |
| Exposure/sensitivity multipliers `1.0 + exposed×0.35 + PROD/DR×0.20`; PUBLIC 1.0/INTERNAL 1.15/CONF 1.35/RESTR 1.55 | No exposure-multiplier term in the probability path; sensitivity is `1.0/1.0/1.2/1.5` |

**The code is better than the README.** The README's tables look like an earlier draft. This is the single highest-value fix in the repository: a judge comparing README §9 to `formulas.py` will conclude the model is not what was claimed.

Other doc drift:

- `architecture.md` §14: *"JWT with **RS256**, **15-min** expiry"* → code is **HS256, 3600 s**. *"AES-256 at rest, TLS 1.3"* → neither implemented in-repo.
- `architecture.md` §11.1: *"if exploit_in_wild: probability × 1.3"* → not implemented (KEV is priority-score boost only).
- `architecture.md` §12.1: constraint `Σ cost·y = totalBudget` and a per-control cap → code uses `≤` and **no** cap (`max_per_control_percent` is accepted by the API and never used).
- `docs/ML_FORECAST.md`: *"one model per asset"*, *"3 steps ahead (quarterly)"*, *"4-week rolling window"* → code trains per **metric** on the single global series, window **5**, projects **horizon+1** steps.
- `docs/RAG_GUIDE.md`: *"22 clauses"* → **21**; *"character n-grams"* → **word tokens**; field names `clause_id`/`clause_text` → `reference`/`content`.
- `README.md` §7 connectors: *"7 seeded"* → **5** in `CONNECTOR_CATALOG` (7 is the `data_sources` table count — a different thing).
- `README.md`/`database/README.md`: *"25 weekly risk snapshots **per asset**"* → **25 global rows**, no `asset_id` population.
- `docs/CHANGELOG.md`: heading *"81–103"* → only 81–94 exist.
- `README.md` §5 architecture diagram shows a `db-init` 13-service compose stack; `docker-compose.yml` and **all 11 Dockerfiles are deleted in the working tree**. The live path is `scripts/dev.ps1` or Render native Python. The README's §18 setup instructions are therefore not runnable as written.
- `README.md` §25 Appendix A describes a **Java-era file tree** (`app/core/proxy.py`, `app/routes/auth.py`, `app/ws/core.py`, `app/core/or_tools_optimizer.py`…) — none of these exist post-migration.
- `NATIONAL_OBSERVATORY.md` says all `/api/risk/national/*` require **ADMIN** → code requires `CISO` or `ADMIN`; and no demo user is ADMIN.

## 8.3 Endpoints documented but not implemented

`README.md` §15 lists routes that do not exist: `/api/risk/exercises/v2`, `/exercises/{id}/finalize`, `/exercises/{id}/history`, `POST /api/risk/national/sri` (it's GET), `GET/POST /api/risk/national/early-warnings`, `POST/DELETE /api/risk/tprm/vendors` (CRUD), `/api/risk/data-sources/{id}/ingest`, `DELETE /api/assets/{id}/dependencies/{depId}`, `GET /api/assets/dependencies/unlinked`, `GET /api/assets/criticality` (list), `PUT`/`DELETE /api/controls/{id}`, `POST /api/controls/asset/{assetId}`, `PUT`/`DELETE /api/vulnerabilities/{id}`, `GET /api/investment/national`, `GET /api/investment/summary`, `DELETE /api/investment/plans/{id}`, `/api/ingestion/replay/background`, `/api/ingestion/jobs`, `GET /api/auth/users` (it's `/api/users`), and the gateway-level ADMIN gating on `/api/risk/national/*` (enforced in risk-engine, not the gateway).

Conversely, ~20 **real** endpoints are undocumented — the entire `/api/alerts` REST surface, `/api/risk/business-units`, `/api/risk/report/export`, `/api/risk/blast-radius/{id}`, `/api/risk/attack-path`, `GET` (not POST) `/api/risk/forecast/ml`, `/api/risk/asset/{id}`, `/api/risk/data-quality/{id}`, `GET /api/risk/national/sri`, `/api/risk/tprm/asset/{id}`, `/api/investment/rosi`, `/api/investment/controls`, `POST` (not GET) `/api/investment/curve`.

## 8.4 Correctness bugs

1. **`ml_forecast.py:122` — inverted fallback string.** `"XGBoost ML" if not _HAS_XGBOOST else "XGBoost ML (insufficient history)"` reports "XGBoost ML" precisely when XGBoost is **unavailable**. Should be `"Deterministic fallback (XGBoost unavailable)"`.
2. **`formulas.calculate_control_reduction` accepts only `status == "ACTIVE"`**, while `national_twin`, `eal_calculator`, `control_service` and `drill_engine` all treat `ACTIVE, VERIFIED, IMPLEMENTED` as effective. A `VERIFIED` MFA therefore reduces the **risk score** path but not the **probability** path — the platform reports two different truths about the same control.
3. **O(N²) in the scenario engine.** `_calculate_simulated` calls `risk_calc.get_max_financial_impact()` (a full `Asset` table scan) once per asset inside the loop.
4. **Two different VaR95 numbers for the same model.** `EALCalculator._value_at_risk()` uses `simulations=2000`; `/risk/loss-distribution` defaults to 5000.
5. **Dead background replay.** `_run_replay_job` reads Redis keys `ingestion.event.{eid}` that **nothing in the codebase ever writes** — the background replay path is a no-op for DB-sourced events.
6. **`remediate_vuln` namespace mismatch.** `scenario_engine` compares `str(v.id)` (a UUID) against change-supplied `vuln_id`, while the schema example supplies `"CVE-2026-1001"`. These namespaces never match, so vuln-removal scenarios silently under-reduce.
7. **Auto-created controls give zero reduction.** `RiskEventConsumer._apply_control` upserts `AssetControl` with `coverage_score=0, effectiveness_score=0`. An `ENABLED` control contributes **nothing** to EAL until someone scores it — so a live control-status change can *look* like it should reduce risk and won't.
8. **Client live-refresh gap.** `App.tsx`'s `handleLiveMessage` refreshes `useRiskStore`, but `ExecutiveDashboard` reads `useRiskData()` — a **different hook with its own state**. The flagship dashboard therefore does **not** update on live events. This undercuts the project's central "real-time" claim on its most-seen screen.
9. **`riskStore` race.** One shared `loading`/`error` field across three concurrent fetches triggered by every STOMP frame ⇒ cross-clobbering.
10. **`AttackPathSimulator` / `CROWN_JEWEL_PATH`** will raise `AttributeError` if any of the 4 hard-coded assets is absent — no `.first()` guard.
11. **Client 401 interceptor** does a hard `window.location.href` navigation, leaving the Zustand store un-reset and flashing stale UI.
12. **`aiApi.ts` has only 3 endpoints** — the entire RAG surface (`/api/ai/rag/*`) is backend-only and unreachable from the UI, despite the README's "RAG" headline feature.

## 8.5 Security posture

| Issue | Detail |
|---|---|
| **Committed Neon credential** | §8.1. Highest priority. |
| **Hard-coded default `JWT_SECRET`** | in `cybercommon/config.py`; anyone running this with defaults has forgeable tokens. `render.yaml` uses `generateValue: true` — correct — but the local default is not. |
| **`CORS(allow_origins=["*"], allow_credentials=True)`** on `auth-service` and `risk-engine`. Invalid + permissive per spec; browsers reject `*` with credentials, and the gateway is the only real ingress anyway. |
| **`/ws` has no authentication.** Any client that can reach 8086 subscribes to `/topic/risk/updated`, `/topic/ingestion/event`, `/topic/risk/alert` and receives every risk-delta payload. The frontend sends `connectHeaders.Authorization` but the server ignores it. |
| **Gateway leaks JWT internals.** 401 body is `f"Invalid or missing JWT token: {exc}"` — a decode-failure oracle. |
| **No TLS in-repo.** HSTS is *advertised* by the security-headers middleware but nothing terminates TLS locally. Render/Vercel do. |
| **No DB foreign keys on 8 columns** — `vuln.vulnerabilities.affected_asset`, `control.asset_controls.asset_id`, all three `risk.*.asset_id`, `risk.audit_entries.asset_id`, `investment.investment_items.control_id`, `asset.assets.agency_id`. Orphan rows are possible and are not cleaned. |
| **No migration ledger.** No `schema_migrations` table, no checksums. Idempotency relies entirely on hand-written `IF NOT EXISTS`. `seed_vulnerabilities`, `seed_risk_calculations`, `seed_risk_snapshots` are **plain `INSERT`s** with no conflict clause — safe only because of one global `COUNT(*) FROM asset.assets > 0` gate, which also means **adding a 13th asset will never re-seed its risk rows**. |
| **Demo password `Scro@2026!` is public** in README, migration 001, and `demo_login_pgadmin.sql`. Acceptable for a demo; `docs/SECURITY_HARDENING.md` correctly flags it. |
| **Advisory-only security scanning.** Both `pip-audit` and `npm audit` end in `|| true` ⇒ they can never fail a build. |
| **`.env` in the tree** (gitignored — correct, but the working tree ships it). |
| `/metrics` and `/docs` are unauthenticated and reachable through the gateway. `docs/SECURITY_HARDENING.md` flags blocking them as an open production item. |

## 8.6 Dead code & hygiene

- **Orphaned frontend modules:** `hooks/api.ts` (barrel, 0 importers), `hooks/useAuth.ts` (0 importers — and it defines a **contradictory** `ROLE_HIERARCHY` that would invert the access logic vs. `config/roles.ts`), `components/charts/RiskBreakdownTree.tsx` (0 importers, duplicates `components/risk/RiskBreakdownTree.tsx`, and regresses to raw `bg-white`/`text-gray-500` instead of design tokens), `components/charts/AssetRiskHeatmap.tsx` (0 importers), `components/common/ConfirmDialog.tsx` (0 importers).
- **`ThemeProvider` is a light-only stub.** `setTheme`/`toggleTheme` are no-ops; `data-theme` is removed on every render. The README advertises "light/dark theme". The tailwind config consequently defines light values only.
- **Stale build artefacts committed:** `frontend/dist/` (with `html2canvas.esm` and `purify.es` chunks that are **not in `package.json`** — leftovers from a previous dependency set), `services/common/cybercommon.egg-info/`, `services/common/build/lib/`, `frontend/tsconfig.tsbuildinfo`.
- **`RecentEventsFeed`** doesn't read events — it maps `vulnerabilityApi.list({page:1, size:5})` into synthetic "events".
- **Dead constants:** `formulas.py` imports `Decimal` + 4 ORM models it never uses. `ml_forecast.TRAIN_KEY`, `runway` are dead. `cybercommon.security`'s docstring describes dual-hash comparison the code doesn't do. `cybercommon/README.md` claims `require_admin` exists — it doesn't. `api-gateway/README.md` claims an `X-User-Role` (singular) header and gateway-level ADMIN gating — neither exists.
- **`risk-engine/pyproject.toml`** declares `requires-python = ">=3.12"`; `__pycache__` shows 3.11 bytecode.
- **Unused declared deps:** `pandas`, `scipy`, `scikit-learn`, `asyncpg` in risk-engine; `sockjs-client` + `tailwind-merge` in frontend; `pgvector` installed but unused.
- **README env table says `POSTGRES_PASSWORD: postgres`**; `migrate_and_seed.py` defaults to `root123`. `.env.example` uses `DB_USER`/`DB_PASSWORD`/`CORS_ORIGINS`; README documents `POSTGRES_*`/`GATEWAY_ORIGIN_WHITELIST`. Three naming schemes.
- **Line-length damage:** `TODO.md`, `architecture.md`, `requirements.txt`, `.gitattributes` contain mojibake and mid-line UTF-8 breaks — cosmetic but visible.

---

# PART 9 — RESEARCH PAPERS & REFERENCES

*Curated to the five pillars this project actually implements. Verify each before citing in an academic submission.*

## 9.1 FAIR — Factor Analysis of Information Risk (the EAL/ALE foundation)

> The most important conceptual alignment in the repo: `loss_distribution.py` docstring reads *"Monte Carlo annual-loss distribution (**FAIR-style**)"* and `confidence.py` reads *"FAIR-**inspired** confidence score."*

- **Jones, D. (2013).** "A FAIR Approach to Cybersecurity Risk." *The ISC2 Journal*, 4(1). — *the* original FAIR formulation: decompose risk into **Frequency of Threat Event × Vulnerability × Impact**, then Vulnerability into **VTE × VI**. This is exactly the project's `probability × impact` structure.
- **Jones, D. (2013).** "Cyber Security Metrics for Risk Management." *The ISC2 Journal*, 4(2).
- **Hubbard, D. W. (2009).** "A Sophisticated Model of Information Security Risk." *ISACA Journal*, 19. — *the* quantitative counter-argument to qualitative risk registers.
- **Hubbard, D. W. (2016).** *The Failure of Risk Management: Why It's Broken and How to Fix It* (2nd ed.). IT Risk Management. — argues that reducing EAL **below a point of diminishing returns is irrational**, which is precisely the insight the OR-Tools optimiser implements.
- **Open FAIR / FAIR Institute.** *The FAIR ISO/IEC 27005 Cookbook* (2018, rev. 2022). — the practical recipe for building a calibrated, Monte-Carlo-capable model. **This is the document to use to fix the project's biggest gap: the uncalibrated `CVSS_PROBABILITY_MAP`.**
- **Plewes, B. (2014).** "An Introduction to the FAIR Risk Analysis Method." *ISACA Journal*.
- **Bohmer, E., Gür, S., Sutter, T., & Tellenbach, C. (2010).** "Estimating the Loss Distribution of Cyber Incidents." *SICS / ACM*. — **directly relevant to `loss_distribution.py`**: models cyber loss as a compound (frequency × severity) distribution, and is the standard citation for the lognormal-severity approach the code uses.

## 9.2 Attack graphs, dependency propagation & blast radius

> Implements `risk_graph.py` (BFS blast radius), `attack_path.py` (crown-jewel path) and `national_twin`'s TPRM cascade.

- **Phillips, C., & Swiler, P. (1998).** "A Graph-Based System for Network-Vulnerability Analysis." *IEEE Computer*, 31(12), 60–65. — **foundational.** The origin of representing network risk as a reachability graph; the direct ancestor of blast-radius analysis.
- **Ammann, S., Wijesekera, D., & Kaushik, S. (2002).** "Scalable, Graph-Based Network Vulnerability Analysis." *IEEE Symposium on Security and Privacy*, 279–286. — introduces **dependency-ordered graph generation**, the technique behind "if this node is compromised, everything downstream is exposed."
- **Sheyner, S., Houlder, J., Ou, X., Ray, R., & Shankar, A. (2002).** "Automated Generation and Analysis of Attack Graphs." *ACM CCS '02*, 273–284. — model-checking formulation; the formal basis for "attack path" as a first-class object.
- **Ou, X., Boyeris, S., & Rajagopalan, R. (2006).** "A Scalable Approach to Attack Graph Generation." *ACM CCS '06*, 229–240. — the scalability result that makes the approach usable at enterprise scale; directly relevant to the project's O(N²) weakness.
- **Noel, S., & Jajodia, S. (2004).** "Measuring Security Risk of Networks Using Attack Graphs." *IEEE Computer*, 37(12), 28–35. — the paper that quantifies risk *on* a graph, i.e. aggregates per-node risk into network risk. This is what `national_twin` does at national scale.
- **Jajodia, S., Noel, S., & O'Berry, B. (2005).** *Analyzing Attack Graphs.* Artech House. — the monograph.

## 9.3 Vulnerability severity, exploitability & threat prioritisation

> Implements `vulnerability-service` prioritisation + the CISA KEV / FIRST EPSS / NVD enrichment in `threat_intel.py`.

- **National Institute of Standards and Technology (2009).** *National Vulnerability Database (NVD) Security Rating Guide.* **NIST SP 800-40 Rev. 3** (2015). — the authoritative definition of the CVSS 0–10 severity scale the project keys off.
- **MITRE / FIRST.** *Common Vulnerability Scoring System (CVSS) v3.1 Specification.* — the normative source for `cvss_score`, `severity` and exploitability.
- **Scorfone, K., & Mell, M. (2007).** *The Complete Guide to CVSS v2.0.* NIST. — the predecessor; useful when justifying band-threshold choices.
- **CISA (2021).** *Known Exploited Vulnerabilities (KEV) Catalog.* Cybersecurity and Infrastructure Security Agency. — the direct source of the `FEED_KEV` integration and the `+0.25` priority boost.
- **FIRST.** *Exploit Prediction Scoring System (EPSS).* — the source of `FEED_EPSS`; EPSS is the current empirical replacement for hand-tuned CVSS→probability tables, and is **the most directly actionable upgrade** to this project.
- **Thomas, S., Naegele, A., Edmunds, T., & Hochstein, L. (2021).** "Framing Software Component Risk: A Metrical Perspective on Software Component Risk." *IEEE ICST.* — argues a vulnerability is a property of a *component in context*, not of the CVE. This is the theoretical justification for the project's asset-level (rather than CVE-level) risk model.
- **MITRE.** *ATT&CK (Adversary Tactics, Techniques & Knowledge).* — the reference vocabulary for the four drill templates (`WORM`/`WannaCry-class`, ransomware, supply chain, DDoS) and the "crown-jewel exfiltration" path.
- **MITRE.** *D3FEND.* — the countermeasure ontology; relevant to extending the 8-entry `CONTROL_TYPE_WEIGHTS` table into a cited, evidence-backed mapping.

## 9.4 Risk quantification methodology, standards & governance

> Implements `ComplianceMapper` (39 mandates / 10 frameworks), `DataQualityEngine`, the audit chain, and the national-rollup governance model.

- **National Institute of Standards and Technology (2024).** *The NIST Cybersecurity Framework (CSF) 2.0.* **NIST CSWP 29.** — the source of the 7 CSF 2.0 subcategory IDs the code cites (`PR.AA-01`, `PR.PS-02`, `DE.CM-02`, `PR.PS-05`, `PR.PS-01`, `PR.DS-01`, `DE.CM-01`).
- **International Organization for Standardization (2022).** *ISO/IEC 27001:2022 — Information Security Management Systems — Requirements.* — Annex A controls `A.8.8` and `A.8.13` cited in `compliance.py`.
- **CIS (2021).** *CIS Critical Security Controls v8.* — the source of the 7 CIS benchmark IDs (`6.4`, `7.4`, `13.8`, `3.12`, `4.8`, `3.11`, `8.2`).
- **International Organization for Standardization (2008).** *ISO/IEC 27005:2008 — Information Security Risk Management.* — the ISO risk-management *methodology* the project deliberately does **not** follow (its math is FAIR-shaped, not 27005-shaped). Cite this to *contrast* the two approaches — a strong academic angle.
- **House of Lords Communications Committee (2017).** *Cyber Security: Incentives and Barriers to Making the UK a Safer Online Place.* **HL Paper 135.** — the definitive evidence that **security investment is systematically under-provided** and that risk-quantification tools like this one are the policy instrument. Excellent for the "problem statement" framing.
- **Anderson, L. W., & McGrew, P. (2007).** "Measuring the Security Investment." In *Investing in Information Security: Models and Analysis.* — the origin of ROI/ROSI reasoning for security controls.
- **Davis, J. J. (2007).** "Measuring the Efficiency of Cybersecurity Risk Management." *Communications of the ACM*, 50(4), 36–41. — the canonical "is your security programme economically efficient?" paper; the theoretical parent of the ROSI metric.

## 9.5 Machine learning for time-series risk & gradient boosting

> Implements `ml_forecast.py` (XGBoost, 3 regressors, 6 lag/rolling features, recursive projection, `MIN_SAMPLES=18` fallback) and the deterministic `DoNothingForecast` baseline.

- **Chen, T., & Guestrin, C. (2016).** "XGBoost: A Scalable Tree Boosting System." *ACM KDD '16*, 785–794. — **the mandatory citation.** Describes exactly the chosen hyperparameters' rationale (regularised shallow trees, `subsample`/`colsample`, CPU-scalable).
- **Friedman, J. H. (2001).** "Greedy Function Approximation: A Gradient Boosting Machine." *The Annals of Statistics*, 29(5), 1189–1232. — the underlying method.
- **Friedman, J. H. (2002).** "Stochastic Gradient Boosting." *MSR-TR-2001-48*, Microsoft Research. — the stochastic variant the subsample parameters come from.
- **Ke, G., Meng, Q., Finley, T., Wang, T., Chen, W., Ma, W., Ye, Q., & Liu, T.-Y. (2017).** "LightGBM: A Highly Efficient Gradient Boosting Decision Tree." *NeurIPS 30*. — the direct alternative; cite when arguing for a model swap.
- **Breiman, L. (2001).** "Random Forests." *Machine Learning*, 45(1), 5–32. — the classic alternative; also the source of the `random_state=42` determinism idiom.
- **Hyndman, R. J., & Athanasopoulos, G. (2021).** *Forecasting: Principles and Practice* (3rd ed.). OTexts. — **essential for the "is this forecast legitimate?" critique.** Authoritative on minimum sample sizes for seasonality, backtesting vs. in-sample fit, and prediction-interval construction. Directly undercuts forecasting from 25 synthetic points.
- **Tashman, L. J. (2000).** "Out-of-Sample Tests of Forecasting Accuracy: An Analysis and Review." *International Journal of Forecasting*, 16(4), 437–450. — the standard holdout methodology the project does **not** implement (there is no train/test split or out-of-sample error).
- **Bergmeir, C., & Benítez, J. M. (2012).** "On the Use of Cross-Validation for Time Series Predictor Evaluation." *Information Sciences*, 191, 192–213. — why the recursive multi-step design needs time-series-aware validation.

## 9.6 Operations research & portfolio optimisation

> Implements `optimizer.py::_cp_knapsack` — CP-SAT 0/1 knapsack, 10 s cap, `OPTIMAL`/`FEASIBLE`, density-greedy fallback, and the budget→EAL-reduction curve.

- **Dantzig, G. B. (1957).** "Discrete-Variable Extremum Problems." *Operations Research*, 5(1), 195–212. — the original 0/1 knapsack formulation. The mandatory classical citation.
- **Bellman, R. (1957).** *Dynamic Programming.* Princeton University Press. — the underlying theory; use for the optimality argument behind CP-SAT.
- **Buss, S. (2003).** "Polyhedral Feasible Regions with PWL Concave Objective Functions." In *Integer Programming*. — the MIP-with-concave-objective result that justifies the CP-SAT encoding.
- **Google OR-Tools Documentation.** *CP-SAT Solver.* — the operational reference for `max_time_in_seconds`, `OPTIMAL` vs. `FEASIBLE` and integer-scaling tolerances (relevant to the ×100 / ×10000 granularity choices).
- **Rothvoß, A. (2014).** "Learning to Branch in Mixed Integer Programming." *AAAI 2014.* — the cutting-plane machinery inside CP-SAT.
- **Hubbard, D. W. — see §9.1.** (diminishing-returns argument for the budget curve.)

## 9.7 Retrieval-augmented generation & vector search

> Implements `rag.py` — deterministic 384-d hash embedder, pure-Python cosine, JSONB storage, pgvector-ready.

- **Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W.-T., Rocktäschel, T., Riedel, S., & Kiela, D. (2020).** "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." *NeurIPS 33*, 9459–9474. — **the mandatory RAG citation.**
- **Guu, K., Lee, K., Tung, Z., Pasupat, P., & Chang, M.-W. (2020).** "REALM: Retrieval-Augmented Language Model Pre-Training." *ICML 2020.* — RLM-style latent retrieval.
- **Karpukhin, V., Oguz, B., Min, S., Lewis, P., Wu, L., Edunov, S., Chen, D., & Yih, W.-T. (2020).** "Dense Passage Retrieval for Open-Domain Question Answering." *EMNLP 2020.* — the DPR bi-encoder; the architecture the deterministic embedder approximates.
- **Reimers, N., & Gurevych, I. (2020).** "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks." *EMNLP 2020*. — **the single most relevant paper for the project's weakest AI component.** The embedder's 384 dimensions are exactly MiniLM's size; S-BERT is the standard recipe for symmetric retrieval, and it is the obvious upgrade path from MD5 word-bucket hashing.
- **Johnson, J., Douze, M., & Jégou, H. (2017).** "Billion-scale Similarity Search with GPUs." (FAISS). *arXiv:1702.08734*. — the ANN-index baseline; cite when justifying the move to pgvector HNSW/IVFFlat.
- **Malkov, Y. A., & Yashunin, D. A. (2020).** "Vector Similarity Search with FAISS." — indexing techniques.
- **Robertson, S., & Zaragoza, H. (2009).** "The Probabilistic Relevance Framework: BM25 and Beyond." *Foundations and Trends in Information Retrieval*, 3(4), 333–389. — **the strongest argument against the project's embedder.** If lexical BM25 is a *competitor* (not a baseline), a hash embedder needs to be justified empirically — which no benchmark in the repo does.
- **Bajaj, P., et al. (2016).** "Supporting Academic-Paper Search and Evaluation over a Large Scale Corpus." *SIGIR '16*. — provenance and evaluation methodology for retrieval over a curated document corpus.

## 9.8 Digital twins (the SCRO framing)

- **Grieves, M. (2014).** *The Digital Twin: Understanding the Digital Twin Concept and Technologies.* Springer. — the origin of the term and the three-way coupling taxonomy the SCRO "twin" borrows.
- **Tao, F., Zhang, M., Liu, Y., Choi, A. Y. C., Kuo, W.-C., & Jiang, F. (2019).** "Digital Twin in Industry: State-of-the-Art." *IEEE Transactions on Industrial Informatics*, 15(4), 2405–2415. — **the most-cited digital-twin survey**; the standard citation for what a digital twin is and is not.
- **Fuller, S. H., et al. (2020).** "Digital Twin: Enabling Technologies, Challenges and Open Research." *IEEE Access*, 8, 108952–108966. — the honest critique of digital-twin claims. **Read this before calling SCRO a "digital twin"** — it is a *digital shadow/aggregate model* with event-driven synchronisation, not a real-time bidirectional physical twin.
- **Negri, C., Cimino, A., Fumagalli, M., & Bianchini, C. (2017).** "A Review of the Roles of Digital Twin in CPS." *Procedia CIRP*, 63, 939–945.
- **Sharma, M., Kulkarni, K., & Sharma, A. (2020).** "Digital Twin: A Virtual Replica of the Physical Entity." — general framing.

## 9.9 Cyber ranges & national exercises

> Implements `drill_engine.py` (4 templates) and the SCRO exercise workflow.

- **Kounev, S. (2007).** *Cyber-Range Modeling and Analysis.* Carnegie Mellon University / Software Engineering Institute. **CMU/SEI-2011-TR-002** (2011, 2nd printing). — **the foundational cyber-range reference.** Introduces the construct/abstract/exercise-model hierarchy and the run/analyse cycle the SCRO drill engine implements. This is the single best citation for the "national cyber exercise" concept.
- **NIST / Cyber Range Project (Caltagirone, J., et al.).** *Cyber Ranges: Overview and Design Choices.* — the practical reference for range architecture and for vulnerability-scoring metrics.
- **MITRE.** *D3FEND* and *ATT&CK.* — for the countermeasure and adversary-technique mappings.

## 9.10 Technology adoption & organisational buy-in

> Underpins the "will a ministry/bank actually use this?" question in §6.

- **Davis, F. D. (1989).** "Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology." *MIS Quarterly*, 13(3), 319–340. — **TAM**; the origin of the two variables that decide whether a risk dashboard gets opened.
- **Venkatesh, V., Morris, M. G., Davis, G. H., & Davis, F. D. (2003).** "User Acceptance of Information Technology: Toward a Unified View." *MIS Quarterly*, 27(3), 425–478. — **UTAUT**; the standard instrument for evaluating this platform's adoption.
- **Venkatesh, V., Thong, J. Y. L., & Xu, X. (2012).** "Consumer Acceptance and Use of Information Technology: Extending the Unified Theory of Acceptance and Use of Technology." *MIS Quarterly*, 36(1), 157–178. — UTAUT2.
- **Weber, M. (2012).** "Evaluating the Effects of Business Intelligence and Big Data Systems." *Journal of the AIS*. — on the "BI systems are rarely used by executives" problem, which is the primary adoption risk for this project.
- **Wainer, M. (2018).** "Cognitive Differences in Business Intelligence." *Data Wise*. — on the cognitive-load failure mode of dashboards; argues for progressive disclosure. Relevant to the 15-section executive dashboard.

## 9.11 Domain frameworks & primary regulation (not papers — the actual obligations)

- **Reserve Bank of India (2022).** *Master Direction – Information Technology Governance, Cyber Security Framework, Cyber Security – Incident Reporting, Supervision, and Cyber Security – Third Party Arrangements.* **RBI/DPSS.CO.PD No. 106/02.01.014/2022-23**, 31 October 2022. — the source of `G3.5.1`, `G3.6.2`, `G3.3.2/3/4/5`, `G4.4.4`, and the Part B/C mappings in `compliance.py`.
- **SEBI (2023).** *Cybersecurity and Cyber Resilience Framework for Market Infrastructure Institutions.* March 2023. — the source of the SEBI CSCRF mappings.
- **CERT-In (2022).** *Directions on Measures to be Taken to Enhance the Security of Information Systems.* 28 April 2022. — **6-hour/24-hour/72-hour reporting and 180-day log retention.** The strongest single justification for a national quantification platform in India.
- **Government of India (2023).** *Digital Personal Data Protection Act, 2023.* **Section 9(5)** (security safeguards) and **Section 9(4)** (impact assessment). — the source of the DPDP S.9 DLP mapping.
- **Government of India (2008).** *Information Technology (Amendment) Act 2008, Section 70* — NCIIPC. — the statutory basis for `ITACT` and `NCIIPC` in the RAG corpus.
- **IRDAI.** *Guidelines on Information Technology and Cyber Security.* — the source of the IRDAI mappings (B.3.1, D.1.2, D.2.1, D.3.2, C.2.2, E.1.1).
- **TRAI (2017).** *Recommendation on Data Protection.* — the source of the TRAI clause.
- **OWASP (2021).** *OWASP Top 10.* — supplementary severity context.
- **NIST (2018).** *Managing Information Security Risk: Organization, Mission, and Information System View.* **SP 800-40 Rev. 4.** — the vulnerability-management governance reference.
- **Rose, S., Borchert, O., Mitchell, M., & Connelly, S. (2020).** *Zero Trust Architecture.* **NIST SP 800-207.** — the model behind the 4-tier RBAC + gateway-identity-injection design.

---

# PART 10 — VERDICT

| Dimension | Rating | Rationale |
|---|---|---|
| **Scope & ambition** | ★★★★★ | Enterprise engine → national observatory is a genuinely large, coherent build. 26 tables, 10 services, 11 pages, 12 migrations, ~116 backend tests. |
| **Technical correctness** | ★★★★☆ | Core math is single-sourced and well unit-tested; CP-SAT is provably optimal. Docked for the status-normalisation bug, O(N²), the dead replay path, the UUID-vs-CVE namespace mismatch, and the inverted ML fallback string. |
| **Documentation quality** | ★★☆☆☆ | **The biggest weakness.** `README.md` §9 misstates the core formulas; Appendix A and the §15 API list describe the deleted Java implementation; `ML_FORECAST.md`/`RAG_GUIDE.md`/`NATIONAL_OBSERVATORY.md` are all stale. For a project whose primary audience is judges, this is expensive. |
| **Production readiness** | ★★☆☆☆ | Seeded data, simulated connectors, hard-coded default JWT secret, no scheduler, no multi-tenancy, committed cloud credential, advisory-only scanning. Correctly and honestly labelled a demo. |
| **Data credibility** | ★★☆☆☆ | `CVSS_PROBABILITY_MAP` is a 10-point lookup table, not a calibration. Control weights are asserted. Business value is hand-entered. 25 snapshots are synthetic and global, not per-asset. **The numbers are structurally right and empirically uncalibrated.** |
| **Testing** | ★★★★☆ | 116 backend + 48 frontend; real CVE fixtures; a counterexample test proving CP-SAT beats greedy; a WRONGTYPE regression test. Gaps: no HTTP-route integration tests, no DB-backed tests, no ML forecast tests. |
| **Security engineering** | ★★★☆☆ | Refresh-rotation with reuse detection, bcrypt direct, HMAC-signed gateway identity headers (with a spoofing test), Prometheus metrics, 10-header middleware, documented fail-open/fail-closed reasoning. Against: committed Neon credential, hard-coded JWT default, unauthenticated `/ws`, `*`+credentials CORS, error-message oracle. |
| **Feasibility** | ★★★★☆ | The engine is real, tested and reusable. ADR D5 ("no new math or infra") was the right architectural call. It just needs real data. |
| **Viability** | ★★★☆☆ | Institutionally wanted (CERT-In/RBI/DPDP create real budget lines), ₹0 licence, ₹0 AI cost by default, clear single buyer. But calibration data is the true moat, and multi-tenancy is absent — so project revenue, not SaaS. |
| **Impact potential** | ★★★★★ | If calibrated and federated, this changes national cyber-budget allocation from anecdote to arithmetic. That is a real, large, defensible contribution. |

## 10.1 The five highest-value next actions

1. **Rotate the Neon credential immediately**; strip the hard-coded DSN from `generate_neon_setup.py`; add a pre-commit secret scanner. *(5 minutes, removes a critical finding.)*
2. **Rewrite `README.md` §9 to match `formulas.py`**, and regenerate §15 from the live OpenAPI schemas. Delete the Java-era Appendix A. *(The single highest-leverage documentation fix — it's the first thing a judge reads.)*
3. **Calibrate `CVSS_PROBABILITY_MAP` against EPSS and the entity's own incident history** (Open FAIR Cookbook, §9.1). Fold the KEV/EPSS enrichment the code already fetches *into* probability rather than only the priority score. This converts the project from *structurally* to *empirically* credible.
4. **Fix the 4 real bugs**: the `ACTIVE`-only control-reduction inconsistency (normalise to a shared `EFFECTIVE_CONTROL_STATUSES` constant used everywhere), the inverted ML fallback string, the `ExecutiveDashboard` `useRiskData`/`riskStore` split, and the `remediate_vuln` UUID-vs-CVE namespace.
5. **Add a scheduler** (APScheduler or a single Render cron calling `POST /api/risk/snapshot` + `GET /api/risk/forecast`). Without a clock, "continuous quantification" is event-driven but not periodic — and that's the entire premise.

## 10.2 Final statement

This is a **well-architected, thoroughly tested, and honestly-scoped prototype of a real product** — not a mockup and not a vaporware repo. The engineering is better than the documentation; the architecture is better than the data; the ambition exceeds the calibration.

Its genuine contribution is the **posture**: measure risk continuously, in money, with stated uncertainty, optimised by a provably-optimal solver, and provably unaltered. The gap between what it computes and what it *knows* is precisely the work that turns a strong hackathon project into a deployable national capability — and that work is calibration, federation, and production hardening, all of which are already itemised in `docs/ROADMAP.md` Phase 2/3.

---

## Appendix A — Two-Critical Findings (action required)

### A.1 Committed cloud credential — `database/generate_neon_setup.py:24-25`

```python
DATABASE_URL = (
    "postgresql://neondb_owner:<password>@REDACTED-NEON-HOST"
    "ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
)
```

Verified as a **tracked** file via `git ls-files --error-unmatch database/generate_neon_setup.py`.

**Remediation:**
1. Rotate the NeonDB password immediately.
2. Replace the hard-coded constant with an environment read (`os.getenv("DATABASE_URL")`) or remove it — the generator is explicitly offline and does not need a connection string.
3. Purge from git history (`git filter-repo` or BFG).
4. Add a pre-commit secret scanner (e.g. `gitleaks`, `detect-secrets`).

### A.2 `README.md` §9 misstates the implemented formulas

The README is the primary document a judge or evaluator reads, and its "How the numbers are calculated" section does not match `services/risk-engine/app/core/formulas.py`. Full comparison table in §8.2. **The code is the better artefact** — the README describes an earlier draft model. Correct this before any evaluation or submission.

---

*Analysis performed against commit `bb5564d` on the working tree at `C:\Users\ManaGenz\Desktop\PROJECTS\Cybersecurity-in-Finance`. All formula values, endpoint lists, table counts, test counts, dependency versions and document discrepancies above were verified directly against source files, migrations and the git index.*