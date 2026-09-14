# CyberRisk Quantifier — Full Platform Architecture

> **Problem Statement 26105:** AI-Powered Continuous Cyber Risk Quantification and Investment Optimization Platform

---

## 1. Product Vision

A platform that continuously converts cybersecurity telemetry into quantified financial risk, identifies the biggest sources of expected loss, recommends prioritized remediation, allows executives to simulate security decisions, and optimizes limited cybersecurity budgets for maximum risk reduction.

**Core Hypothesis:**

> Can technical cybersecurity findings be transformed into quantified financial exposure and then used to optimize security investment decisions?

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY DATA SOURCES                             │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Vuln Scan │ │  SIEM    │ │  IAM     │ │  EDR     │ │  CSPM    │         │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │
│       │             │            │             │             │               │
│       └─────────────┴────────────┴──────┬──────┴─────────────┘               │
│                                         │                                    │
│                              REST / JSON / CSV                               │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INGESTION LAYER                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────┐                           │
│  │           ingestion-service (Java)            │                           │
│  │                                               │                           │
│  │  REST API ──► Normalizer ──► Event Dispatcher │                           │
│  └───────────────────────┬──────────────────────┘                           │
│                          │                                                   │
│                    ┌─────▼──────┐                                            │
│                    │   Redis     │ (Dev transport)                           │
│                    │  Pub/Sub    │ ──► Kafka (Production)                    │
│                    └─────┬──────┘                                            │
│                          │                                                   │
│              ┌───────────┼───────────┬──────────────┐                       │
│              ▼           ▼           ▼              ▼                       │
│  ┌──────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐              │
│  │ risk-engine  │ │  asset-   │ │  vuln-   │ │ notification-│              │
│  │  (Python)    │ │  service  │ │  service │ │   service    │              │
│  └──────┬───────┘ └───────────┘ └──────────┘ └──────┬───────┘              │
│         │                                             │                     │
└─────────┼─────────────────────────────────────────────┼─────────────────────┘
          │                                             │
          ▼                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROCESSING LAYER                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────┐                       │
│  │              risk-engine (Python/FastAPI)          │                       │
│  │                                                   │                       │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────┐│                       │
│  │  │ Probability  │  │  Financial   │  │  Risk    ││                       │
│  │  │  Engine      │  │  Impact     │  │Aggregator││                       │
│  │  └─────────────┘  └──────────────┘  └──────────┘│                       │
│  │                                                   │                       │
│  │  ┌──────────────┐  ┌──────────────┐              │                       │
│  │  │ EAL Calc     │  │  Scenario    │              │                       │
│  │  │              │  │  Simulator   │              │                       │
│  │  └──────────────┘  └──────────────┘              │                       │
│  └───────────────────────┬──────────────────────────┘                       │
│                          │                                                   │
│  ┌───────────────────────▼──────────────────────────┐                       │
│  │        investment-optimizer (Python/FastAPI)       │                       │
│  │                                                   │                       │
│  │  ┌──────────────┐  ┌──────────────┐              │                       │
│  │  │  OR-Tools     │  │  ROSI Calc   │              │                       │
│  │  │  Optimizer    │  │              │              │                       │
│  │  └──────────────┘  └──────────────┘              │                       │
│  └───────────────────────┬──────────────────────────┘                       │
│                          │                                                   │
│  ┌───────────────────────▼──────────────────────────┐                       │
│  │              ai-service (Python/FastAPI)           │                       │
│  │                                                   │                       │
│  │  ┌──────────────┐  ┌──────────────┐              │                       │
│  │  │  Intent      │  │  Risk        │              │                       │
│  │  │  Detector    │  │  Explainer   │              │                       │
│  │  └──────────────┘  └──────────────┘              │                       │
│  │  ┌──────────────┐  ┌──────────────┐              │                       │
│  │  │  NL Query    │  │  Recommender │              │                       │
│  │  │  Handler     │  │  Engine      │              │                       │
│  │  └──────────────┘  └──────────────┘              │                       │
│  └──────────────────────────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────┐                       │
│  │              api-gateway (Spring Cloud GW)         │                       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │                       │
│  │  │  Route    │  │  Rate    │  │  Auth    │       │                       │
│  │  │  Config   │  │  Limit   │  │  Filter  │       │                       │
│  │  └──────────┘  └──────────┘  └──────────┘       │                       │
│  └───────────────────────┬──────────────────────────┘                       │
│                          │                                                   │
│  ┌───────────────────────┼──────────────────────────┐                       │
│  │                        │                          │                       │
│  ▼                        ▼                          ▼                       │
│  ┌──────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  auth-   │  │  asset-service   │  │  vulnerability-  │                  │
│  │  service │  │  (Java)          │  │  service (Java)  │                  │
│  │ (Java)   │  │                  │  │                  │                  │
│  └──────────┘  └──────────────────┘  └──────────────────┘                  │
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │  control-service │                                                       │
│  │  (Java)          │                                                       │
│  └──────────────────┘                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────┐                       │
│  │                  NeonDB (PostgreSQL)               │                       │
│  │                                                   │                       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │                       │
│  │  │  auth    │ │  asset   │ │  vuln    │         │                       │
│  │  │  schema  │ │  schema  │ │  schema  │         │                       │
│  │  └──────────┘ └──────────┘ └──────────┘         │                       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │                       │
│  │  │ control  │ │  risk    │ │invest-   │         │                       │
│  │  │  schema  │ │  schema  │ │ment schm │         │                       │
│  │  └──────────┘ └──────────┘ └──────────┘         │                       │
│  └──────────────────────────────────────────────────┘                       │
│                                                                              │
│  ┌──────────────────────────────────────────────────┐                       │
│  │                     Redis                          │                       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │                       │
│  │  │  Cache    │  │  Session │  │  Pub/Sub │       │                       │
│  │  └──────────┘  └──────────┘  └──────────┘       │                       │
│  └──────────────────────────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                                        │
│                                                                              │
│  ┌──────────────────────────────────────────────────┐                       │
│  │           React + TypeScript + Tailwind            │                       │
│  │                                                   │                       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │                       │
│  │  │ Executive  │  │  Security  │  │   Risk     │ │                       │
│  │  │ Dashboard  │  │  Dashboard │  │  Analysis  │ │                       │
│  │  └────────────┘  └────────────┘  └────────────┘ │                       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │                       │
│  │  │ Scenario   │  │ Investment │  │     AI     │ │                       │
│  │  │ Simulator  │  │ Optimizer  │  │  Assistant │ │                       │
│  │  └────────────┘  └────────────┘  └────────────┘ │                       │
│  │  ┌────────────┐  ┌────────────┐                  │                       │
│  │  │  Asset Mgmt│  │ Vuln Mgmt  │                  │                       │
│  │  └────────────┘  └────────────┘                  │                       │
│  │                                                   │                       │
│  │  ┌──────────────────────────────────────────┐    │                       │
│  │  │  WebSocket Client ──► Live Risk Updates   │    │                       │
│  │  └──────────────────────────────────────────┘    │                       │
│  └──────────────────────────────────────────────────┘                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Event-Driven Risk Recalculation Flow

```
┌─────────────┐
│ Vulnerability│
│   Scanner    │
│  (or mock)   │
└──────┬──────┘
       │
       │ POST /api/ingestion/vulnerability
       ▼
┌──────────────────────────────────────────────┐
│            ingestion-service                  │
│                                               │
│  1. Receive raw event (JSON/CSV)              │
│  2. Normalize to SecurityEvent schema         │
│  3. Enrich with timestamp, source, severity   │
│  4. Persist to ingestion log                  │
│  5. Publish to Redis/Kafka channel            │
│     Channel: security.events.vulnerability    │
└──────────────────────┬───────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌───────────┐ ┌───────────┐ ┌───────────┐
    │ risk-     │ │ vuln-     │ │ notifi-   │
    │ engine    │ │ service   │ │ cation-   │
    │           │ │           │ │ service   │
    └─────┬─────┘ └───────────┘ └─────┬─────┘
          │                            │
          ▼                            │
┌──────────────────────┐               │
│  RISK RECALCULATION  │               │
│                      │               │
│  1. Find affected    │               │
│     asset            │               │
│  2. Get asset        │               │
│     criticality      │               │
│  3. Get controls     │               │
│     status           │               │
│  4. Calculate        │               │
│     probability      │               │
│  5. Calculate        │               │
│     financial impact │               │
│  6. Compute new EAL  │               │
│  7. Update risk      │               │
│     score            │               │
│  8. Persist to DB    │               │
│  9. Publish event    │               │
│     risk.events.     │               │
│     updated          │               │
└──────────┬───────────┘               │
           │                            │
           │  risk.events.updated       │
           │                            │
           ▼                            ▼
┌──────────────────────────────────────────────┐
│           notification-service                │
│                                               │
│  1. Receive risk.updated event                │
│  2. Build WebSocket payload:                  │
│     {                                         │
│       type: "RISK_UPDATED",                   │
│       assetId: "PAY-SRV-001",                 │
│       previousRisk: 72,                       │
│       currentRisk: 86,                        │
│       previousEAL: 8000000,                   │
│       currentEAL: 12500000,                   │
│       delta: +4500000,                        │
│       timestamp: "2026-08-25T10:02:00Z"       │
│     }                                         │
│  3. Broadcast to connected clients            │
└──────────────────────┬───────────────────────┘
                       │
                       │ WebSocket (STOMP over SockJS)
                       ▼
┌──────────────────────────────────────────────┐
│              React Dashboard                   │
│                                               │
│  1. useWebSocket hook receives event          │
│  2. Zustand store updates risk state          │
│  3. Dashboard re-renders:                     │
│     ┌──────────────────────────┐             │
│     │  EAL Card                 │             │
│     │  ₹8.5 Cr ──► ₹12.5 Cr   │             │
│     │  ⚠ +₹45 Lakh exposure    │             │
│     └──────────────────────────┘             │
│  4. Notification toast appears                │
│  5. Risk trend chart updates                  │
└──────────────────────────────────────────────┘
```

---

## 4. Microservice Decomposition

### 4.1 api-gateway

| Property | Value |
|----------|-------|
| **Language** | Java 21 / Kotlin |
| **Framework** | Spring Cloud Gateway |
| **Port** | 8080 |
| **Database** | None |
| **Responsibility** | Entry point, routing, rate limiting, auth token validation, CORS |
| **Routes** | `/api/auth/**` → auth-service, `/api/assets/**` → asset-service, etc. |

### 4.2 auth-service

| Property | Value |
|----------|-------|
| **Language** | Java 21 |
| **Framework** | Spring Boot 3 + Spring Security |
| **Port** | 8081 |
| **Database** | NeonDB (`auth` schema) |
| **Responsibility** | User CRUD, JWT issuance/validation, RBAC, audit logging |

**Endpoints:**
```
POST   /api/auth/login              → returns JWT
POST   /api/auth/register           → create user
POST   /api/auth/refresh            → refresh token
GET    /api/auth/me                 → current user profile
GET    /api/users                   → list users (admin)
PUT    /api/users/{id}/role         → update role (admin)
```

### 4.3 asset-service

| Property | Value |
|----------|-------|
| **Language** | Java 21 |
| **Framework** | Spring Boot 3 |
| **Port** | 8082 |
| **Database** | NeonDB (`asset` schema) |
| **Responsibility** | Asset inventory, criticality scoring, dependency mapping, business context |

**Endpoints:**
```
GET    /api/assets                  → list assets (with filters)
POST   /api/assets                  → create asset
GET    /api/assets/{id}             → get asset detail
PUT    /api/assets/{id}             → update asset
DELETE /api/assets/{id}             → delete asset
GET    /api/assets/{id}/dependencies → get dependencies
POST   /api/assets/{id}/dependencies → add dependency
GET    /api/assets/criticality/{id} → get criticality score
GET    /api/assets/stats            → aggregate statistics
```

### 4.4 vulnerability-service

| Property | Value |
|----------|-------|
| **Language** | Java 21 |
| **Framework** | Spring Boot 3 |
| **Port** | 8083 |
| **Database** | NeonDB (`vuln` schema) |
| **Responsibility** | Vulnerability tracking, CVE management, severity mapping, remediation status |

**Endpoints:**
```
GET    /api/vulnerabilities              → list vulnerabilities
POST   /api/vulnerabilities              → create/upload vulnerability
GET    /api/vulnerabilities/{id}         → get vulnerability detail
PUT    /api/vulnerabilities/{id}         → update (status, remediation)
GET    /api/vulnerabilities/asset/{assetId} → vulns for asset
GET    /api/vulnerabilities/stats        → severity breakdown
POST   /api/vulnerabilities/bulk         → bulk upload
```

### 4.5 control-service

| Property | Value |
|----------|-------|
| **Language** | Java 21 |
| **Framework** | Spring Boot 3 |
| **Port** | 8084 |
| **Database** | NeonDB (`control` schema) |
| **Responsibility** | Security control inventory, effectiveness scoring, coverage tracking |

**Control Types:**
- `MFA` — Multi-Factor Authentication
- `EDR` — Endpoint Detection & Response
- `PATCH` — Patch Management
- `BACKUP` — Backup & Recovery
- `SEGMENTATION` — Network Segmentation
- `FIREWALL` — Firewall / WAF
- `DLP` — Data Loss Prevention
- `SIEM` — Security Monitoring

**Endpoints:**
```
GET    /api/controls               → list all controls
POST   /api/controls               → create/update control
GET    /api/controls/asset/{id}    → controls for asset
GET    /api/controls/effectiveness → effectiveness scores
GET    /api/controls/coverage      → coverage summary
PUT    /api/controls/{id}/status   → update control status
```

### 4.6 risk-engine (Python — CORE)

| Property | Value |
|----------|-------|
| **Language** | Python 3.12 |
| **Framework** | FastAPI |
| **Port** | 8090 |
| **Database** | NeonDB (read/write via SQLAlchemy) |
| **Responsibility** | Risk quantification, EAL calculation, probability engine, scenario simulation |

**Endpoints:**
```
POST   /api/risk/calculate            → calculate risk for asset
POST   /api/risk/calculate-all        → recalculate all risks
GET    /api/risk/score                → enterprise risk score
GET    /api/risk/eal                  → expected annual loss
GET    /api/risk/drivers              → top risk drivers
GET    /api/risk/trends               → risk over time
POST   /api/risk/scenario/simulate    → what-if simulation
POST   /api/risk/event                → receive ingestion event
GET    /api/risk/asset/{id}           → risk for specific asset
```

**Core Algorithms:**

```
Expected Annual Loss (EAL):
  EAL = Σ (probability_of_incident × financial_impact)

Risk Score (0-100):
  riskScore = (probability × 0.4) + (impact × 0.35) + (exposure × 0.25)

Probability Calculation:
  baseProbability = f(cvssScore, exploitability, threatIntel)
  controlReduction = Σ (controlEffectiveness × controlWeight)
  adjustedProbability = baseProbability × (1 - controlReduction)

Financial Impact:
  financialImpact = assetValue × businessCriticality × downtimeFactor

Control Effectiveness:
  effectiveness = coverageScore × implementationQuality × operationalMaturity
```

### 4.7 investment-optimizer (Python — CORE)

| Property | Value |
|----------|-------|
| **Language** | Python 3.12 |
| **Framework** | FastAPI |
| **Port** | 8091 |
| **Database** | NeonDB (read-only for risk data, read/write for investment data) |
| **Responsibility** | Budget optimization (OR-Tools), ROSI calculation, investment recommendations |

**Endpoints:**
```
POST   /api/investment/optimize         → optimize budget allocation
GET    /api/investment/plans            → list investment plans
GET    /api/investment/plans/{id}       → investment plan detail
POST   /api/investment/plans            → create plan
GET    /api/investment/rosi             → return on security investment
POST   /api/investment/simulate         → simulate investment impact
GET    /api/investment/controls         → available security controls with costs
```

**Optimization Model:**

```
Maximize: Σ (riskReduction_i × priority_i)
Subject to:
  Σ cost_i ≤ totalBudget
  0 ≤ allocation_i ≤ maxPerControl_i
  Each allocation_i ∈ integer (lakh units)

Variables:
  allocation_i = amount invested in control i

Parameters:
  cost_i = cost of implementing control i
  riskReduction_i = expected risk reduction from control i
  priority_i = business priority weight of control i
```

### 4.8 ai-service (Python)

| Property | Value |
|----------|-------|
| **Language** | Python 3.12 |
| **Framework** | FastAPI |
| **Port** | 8092 |
| **Database** | None (queries other services) |
| **Responsibility** | LLM integration, natural language queries, risk explanations, recommendations |

**Anti-Hallucination Pattern:**
```
User Question
     ↓
Intent Detection (rules + LLM)
     ↓
Backend Data Query (REST to risk-engine / asset-service)
     ↓
Structured Data Result (JSON)
     ↓
LLM Explanation (data-grounded)
     ↓
Response with source attribution
```

**Endpoints:**
```
POST   /api/ai/recommend              → get recommendations
POST   /api/ai/query                  → natural language query
POST   /api/ai/explain/risk/{assetId} → explain risk for asset
POST   /api/ai/summarize              → executive summary
POST   /api/ai/analyze/investment     → analyze investment plan
```

### 4.9 ingestion-service

| Property | Value |
|----------|-------|
| **Language** | Java 21 |
| **Framework** | Spring Boot 3 |
| **Port** | 8085 |
| **Database** | NeonDB (ingestion log only) |
| **Responsibility** | Event ingestion, normalization, dispatching to event bus |

**Event Types:**
```
VULNERABILITY_DETECTED    → new vulnerability found
VULNERABILITY_UPDATED     → vulnerability status changed
VULNERABILITY Remediated  → vulnerability fixed
CONTROL_STATUS_CHANGED    → control enabled/disabled
ASSET_CREATED             → new asset discovered
ASSET_MODIFIED            → asset configuration changed
THREAT_INTEL_RECEIVED     → new threat intelligence
```

**Endpoints:**
```
POST   /api/ingestion/vulnerability    → ingest vulnerability event
POST   /api/ingestion/control          → ingest control event
POST   /api/ingestion/asset            → ingest asset event
POST   /api/ingestion/batch            → batch ingestion
GET    /api/ingestion/events           → ingestion log
GET    /api/ingestion/stats            → ingestion statistics
POST   /api/ingestion/simulate         → trigger simulation cycle
```

### 4.10 notification-service

| Property | Value |
|----------|-------|
| **Language** | Java 21 |
| **Framework** | Spring Boot 3 + WebSocket (STOMP) |
| **Port** | 8086 |
| **Database** | None |
| **Responsibility** | WebSocket broadcast, notification management |

**WebSocket Topics:**
```
/topic/risk/updated           → risk calculation updated
/topic/risk/alert             → critical risk alert
/topic/ingestion/event        → new event received
/topic/investment/optimized   → investment plan ready
/topic/ai/recommendation      → new AI recommendation
```

---

## 5. Database Schema (NeonDB — PostgreSQL)

### 5.1 auth schema

```sql
-- Users table
CREATE TABLE auth.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    role            VARCHAR(20) NOT NULL DEFAULT 'ANALYST',
                    -- ADMIN, CISO, ANALYST, VIEWER
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Audit logs
CREATE TABLE auth.audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id),
    action          VARCHAR(100) NOT NULL,
    resource_type   VARCHAR(50),
    resource_id     VARCHAR(50),
    details         JSONB,
    ip_address      INET,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### 5.2 asset schema

```sql
CREATE TABLE asset.assets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    asset_type          VARCHAR(50) NOT NULL,
                        -- SERVER, DATABASE, APPLICATION, NETWORK, CLOUD, ENDPOINT
    environment         VARCHAR(20) DEFAULT 'PRODUCTION',
                        -- PRODUCTION, STAGING, DEVELOPMENT
    owner               VARCHAR(255),
    department          VARCHAR(100),
    ip_address          INET,
    mac_address         VARCHAR(17),
    operating_system    VARCHAR(100),
    business_value_inr  DECIMAL(15,2) NOT NULL DEFAULT 0,
    replacement_cost_inr DECIMAL(15,2) DEFAULT 0,
    internet_exposed    BOOLEAN DEFAULT false,
    criticality_score   INTEGER DEFAULT 50,
                        -- 0-100 scale
    data_sensitivity    VARCHAR(20) DEFAULT 'INTERNAL',
                        -- PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
    annual_revenue_impact DECIMAL(15,2) DEFAULT 0,
    metadata            JSONB,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE asset.asset_dependencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id        UUID REFERENCES asset.assets(id) ON DELETE CASCADE,
    depends_on_id   UUID REFERENCES asset.assets(id) ON DELETE CASCADE,
    dependency_type VARCHAR(30) NOT NULL,
                    -- HARD, SOFT, DATA_FLOW, API_CALL
    criticality     INTEGER DEFAULT 50,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, depends_on_id)
);

CREATE INDEX idx_assets_criticality ON asset.assets(criticality_score DESC);
CREATE INDEX idx_assets_type ON asset.assets(asset_type);
CREATE INDEX idx_assets_exposed ON asset.assets(internet_exposed) WHERE internet_exposed = true;
```

### 5.3 vuln schema

```sql
CREATE TABLE vuln.vulnerabilities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cve_id          VARCHAR(20) UNIQUE,
    cwe_id          VARCHAR(20),
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    cvss_score      DECIMAL(3,1) NOT NULL,
    severity        VARCHAR(10) NOT NULL,
                    -- CRITICAL, HIGH, MEDIUM, LOW, INFO
    exploitability  DECIMAL(3,1) DEFAULT 0,
    affected_asset  UUID REFERENCES asset.assets(id),
    internet_exposed BOOLEAN DEFAULT false,
    status          VARCHAR(20) DEFAULT 'OPEN',
                    -- OPEN, IN_PROGRESS, REMEDIATED, ACCEPTED, FALSE_POSITIVE
    remediation     TEXT,
    discovered_at   TIMESTAMP DEFAULT NOW(),
    remediated_at   TIMESTAMP,
    source          VARCHAR(50),
                    -- SCANNER, MANUAL, THREAT_INTEL, PENTEST
    metadata        JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vuln_severity ON vuln.vulnerabilities(severity);
CREATE INDEX idx_vuln_status ON vuln.vulnerabilities(status);
CREATE INDEX idx_vuln_asset ON vuln.vulnerabilities(affected_asset);
CREATE INDEX idx_vuln_cvss ON vuln.vulnerabilities(cvss_score DESC);
```

### 5.4 control schema

```sql
CREATE TABLE control.security_controls (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    control_type        VARCHAR(30) NOT NULL,
                        -- MFA, EDR, PATCH, BACKUP, SEGMENTATION, FIREWALL, DLP, SIEM
    description         TEXT,
    implementation_cost_inr DECIMAL(12,2) NOT NULL DEFAULT 0,
    annual_maintenance_inr  DECIMAL(12,2) DEFAULT 0,
    max_risk_reduction  DECIMAL(5,4) DEFAULT 0,
                        -- 0.0000 to 1.0000 (0% to 100%)
    implementation_time_days INTEGER DEFAULT 30,
    maturity_levels     INTEGER DEFAULT 3,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE control.asset_controls (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            UUID REFERENCES asset.assets(id) ON DELETE CASCADE,
    control_id          UUID REFERENCES control.security_controls(id) ON DELETE CASCADE,
    status              VARCHAR(20) DEFAULT 'PLANNED',
                        -- PLANNED, IMPLEMENTING, ACTIVE, DISABLED
    coverage_score      DECIMAL(5,4) DEFAULT 0,
    effectiveness_score DECIMAL(5,4) DEFAULT 0,
    maturity_level      INTEGER DEFAULT 1,
    implemented_at      TIMESTAMP,
    last_verified_at    TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, control_id)
);

CREATE INDEX idx_controls_type ON control.security_controls(control_type);
CREATE INDEX idx_asset_controls_asset ON control.asset_controls(asset_id);
```

### 5.5 risk schema

```sql
CREATE TABLE risk.risk_calculations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id                UUID REFERENCES asset.assets(id),
    risk_score              DECIMAL(5,2) NOT NULL,
                            -- 0.00 to 100.00
    probability             DECIMAL(5,4) NOT NULL,
                            -- 0.0000 to 1.0000
    financial_impact_inr    DECIMAL(15,2) NOT NULL,
    expected_annual_loss    DECIMAL(15,2) NOT NULL,
    risk_category           VARCHAR(20) NOT NULL,
                            -- CRITICAL, HIGH, MEDIUM, LOW
    risk_factors            JSONB,
                            -- {cvssContribution, exposureContribution, ...}
    control_reduction       DECIMAL(5,4) DEFAULT 0,
    residual_risk           DECIMAL(15,2) DEFAULT 0,
    calculated_at           TIMESTAMP DEFAULT NOW(),
    version                 INTEGER DEFAULT 1
);

CREATE TABLE risk.risk_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id                UUID REFERENCES asset.assets(id),
    risk_score              DECIMAL(5,2),
    expected_annual_loss    DECIMAL(15,2),
    total_controls_active   INTEGER,
    total_vulns_open        INTEGER,
    snapshot_date           DATE NOT NULL,
    created_at              TIMESTAMP DEFAULT NOW()
);

CREATE TABLE risk.risk_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      VARCHAR(50) NOT NULL,
    source_asset    UUID REFERENCES asset.assets(id),
    details         JSONB,
    risk_before     DECIMAL(5,2),
    risk_after      DECIMAL(5,2),
    eal_before      DECIMAL(15,2),
    eal_after       DECIMAL(15,2),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_calc_asset ON risk.risk_calculations(asset_id);
CREATE INDEX idx_risk_calc_score ON risk.risk_calculations(risk_score DESC);
CREATE INDEX idx_risk_calc_category ON risk.risk_calculations(risk_category);
CREATE INDEX idx_risk_snapshots_date ON risk.risk_snapshots(snapshot_date);
CREATE INDEX idx_risk_events_date ON risk.risk_events(created_at DESC);
```

### 5.6 investment schema

```sql
CREATE TABLE investment.investment_plans (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        VARCHAR(255) NOT NULL,
    total_budget_inr            DECIMAL(15,2) NOT NULL,
    expected_risk_reduction     DECIMAL(5,4) DEFAULT 0,
    expected_eal_reduction_inr  DECIMAL(15,2) DEFAULT 0,
    rosi                        DECIMAL(8,4) DEFAULT 0,
                            -- Return on Security Investment
    status                      VARCHAR(20) DEFAULT 'DRAFT',
                            -- DRAFT, APPROVED, IMPLEMENTED, COMPLETED
    created_by                  UUID REFERENCES auth.users(id),
    created_at                  TIMESTAMP DEFAULT NOW(),
    updated_at                  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE investment.investment_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID REFERENCES investment.investment_plans(id) ON DELETE CASCADE,
    control_id          UUID REFERENCES control.security_controls(id),
    allocation_inr      DECIMAL(12,2) NOT NULL,
    risk_reduction      DECIMAL(5,4) DEFAULT 0,
    expected_rosi       DECIMAL(8,4) DEFAULT 0,
    priority            INTEGER DEFAULT 0,
    implementation_start DATE,
    implementation_end   DATE,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_investment_plan ON investment.investment_plans(id);
CREATE INDEX idx_investment_items_plan ON investment.investment_items(plan_id);
```

---

## 6. Inter-Service Communication

### 6.1 Synchronous (REST)

```
api-gateway ──► auth-service       (JWT validation)
api-gateway ──► asset-service      (asset CRUD)
api-gateway ──► vulnerability-service (vuln CRUD)
api-gateway ──► control-service    (control CRUD)
api-gateway ──► risk-engine        (risk queries)
api-gateway ──► investment-optimizer (investment ops)
api-gateway ──► ai-service         (AI queries)
api-gateway ──► ingestion-service  (event ingestion)

risk-engine ──► asset-service      (asset data)
risk-engine ──► vulnerability-service (vuln data)
risk-engine ──► control-service    (control data)

investment-optimizer ──► risk-engine   (risk data)
investment-optimizer ──► control-service (control costs)

ai-service ──► risk-engine         (risk data)
ai-service ──► asset-service       (asset data)
ai-service ──► investment-optimizer (investment data)
```

### 6.2 Asynchronous (Redis Pub/Sub → Kafka in Production)

```
Channel: security.events.vulnerability
  Publisher: ingestion-service
  Subscribers: risk-engine, vulnerability-service, notification-service

Channel: security.events.control
  Publisher: ingestion-service
  Subscribers: risk-engine, control-service, notification-service

Channel: security.events.asset
  Publisher: ingestion-service
  Subscribers: risk-engine, asset-service, notification-service

Channel: risk.events.updated
  Publisher: risk-engine
  Subscribers: notification-service, ai-service

Channel: investment.events.optimized
  Publisher: investment-optimizer
  Subscribers: notification-service
```

---

## 7. Real-Time Claim — Justified Architecture

The system provides **near-real-time continuous risk quantification**:

```
Event arrives → Ingestion normalizes → Risk engine recalculates → Dashboard updates

Latency budget (target < 5 seconds end-to-end):
  Ingestion + normalization:     ~200ms
  Event bus delivery:            ~100ms
  Risk engine recalculation:     ~1-3s (DB lookup + formula)
  Event bus notification:        ~100ms
  WebSocket delivery:            ~50ms
  React re-render:               ~100ms
  ─────────────────────────────────────
  Total:                         ~2-4 seconds
```

**This is NOT claimed because "React refreshes."**

It IS claimed because:
1. An event-driven pipeline processes new security telemetry automatically
2. The risk engine recalculates financial exposure deterministically
3. WebSocket pushes updates to the dashboard without polling
4. The architecture supports real SIEM/EDR/API integrations in production

---

## 8. Technology Stack

### 8.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | latest | Component library |
| Recharts | 2.x | Charts and visualizations |
| Zustand | 4.x | State management |
| Axios | 1.x | HTTP client |
| React Router | 6.x | Client-side routing |
| SockJS + STOMP.js | - | WebSocket client |

### 8.2 Backend (Java Services)

| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 21 | Runtime |
| Spring Boot | 3.2.x | Framework |
| Spring Cloud Gateway | 4.x | API Gateway |
| Spring Security | 6.x | Authentication |
| Spring Data JPA | 3.x | Database access |
| Hibernate | 6.x | ORM |
| JWT (jjwt) | 0.12.x | Token handling |
| PostgreSQL Driver | 42.x | JDBC driver |

### 8.3 Backend (Python Services)

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.12 | Runtime |
| FastAPI | 0.110+ | Web framework |
| SQLAlchemy | 2.x | ORM |
| Alembic | 1.x | Migrations |
| Pydantic | 2.x | Data validation |
| Pandas | 2.x | Data processing |
| NumPy | 1.x | Numerical operations |
| SciPy | 1.x | Statistical functions |
| OR-Tools | 9.x | Optimization |
| httpx | 0.x | Async HTTP client |

### 8.4 AI/LLM

| Technology | Purpose |
|------------|---------|
| OpenAI API (GPT-4o) | LLM (when API key provided) |
| Mock LLM | Stub responses for offline demo |
| Prompt templates | Structured data-grounded prompts |

### 8.5 Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Local orchestration |
| NeonDB | PostgreSQL (managed) |
| Redis | Caching + Pub/Sub (dev event bus) |
| GitHub Actions | CI/CD (Phase 2) |

---

## 9. Deployment Architecture

### 9.1 Docker Compose (Development)

```
┌─────────────────────────────────────────────┐
│              Docker Network                  │
│                                              │
│  ┌──────────┐  ┌──────────┐                │
│  │ frontend  │  │  redis   │                │
│  │ :3000    │  │  :6379   │                │
│  └──────────┘  └──────────┘                │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ gateway  │  │  auth    │  │  asset   │ │
│  │ :8080    │  │  :8081   │  │  :8082   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  vuln    │  │ control  │  │ingestion │ │
│  │  :8083   │  │  :8084   │  │  :8085   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  risk    │  │ invest-  │  │    ai    │ │
│  │ engine   │  │ optimizer│  │  service │ │
│  │  :8090   │  │  :8091   │  │  :8092   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                              │
│  ┌──────────┐                               │
│  │ notifi-  │                               │
│  │ cation   │                               │
│  │  :8086   │                               │
│  └──────────┘                               │
│                                              │
└─────────────────────────────────────────────┘
         │
         ▼
   NeonDB (external)
```

### 9.2 Production (Phase 2/3)

```
┌─────────────────────────────────────────────────┐
│                   Cloud (AWS/Azure)               │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │              Kubernetes Cluster            │   │
│  │                                           │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │   │
│  │  │ Gateway │  │ Gateway │  │ Gateway │ │   │
│  │  │ Pod ×2  │  │ Pod ×2  │  │ Pod ×2  │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘ │   │
│  │                                           │   │
│  │  Auto-scaling per service                 │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Kafka        │  │  NeonDB / RDS            │ │
│  │  Cluster      │  │  (managed PostgreSQL)    │ │
│  └──────────────┘  └──────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 10. Implementation Phases

### Phase 1 — MVP (Hackathon)

**Goal:** Prove the core hypothesis — transform technical findings into financial risk and optimize investment.

| Component | Status | Priority |
|-----------|--------|----------|
| Database schema (all 6 schemas) | Build | P0 |
| risk-engine | Build | P0 |
| investment-optimizer | Build | P0 |
| asset-service | Build | P0 |
| vulnerability-service | Build | P0 |
| control-service | Build | P0 |
| ingestion-service | Build | P0 |
| auth-service | Build | P0 |
| api-gateway | Build | P0 |
| ai-service (mock LLM) | Build | P0 |
| notification-service | Build | P0 |
| Frontend (all dashboards) | Build | P0 |
| Mock data + seeds | Build | P0 |
| Docker Compose | Build | P0 |
| WebSocket live updates | Build | P1 |

### Phase 2 — Enhanced Intelligence

| Component | Priority |
|-----------|----------|
| ML risk prediction (XGBoost) | P1 |
| RAG for compliance frameworks | P1 |
| NIST/ISO/CIS/RBI/SEBI mapping | P1 |
| Advanced threat intelligence | P1 |
| Time-series risk prediction | P1 |
| Cloud deployment (AWS/Azure) | P1 |
| CI/CD pipeline | P1 |
| Comprehensive audit trails | P1 |

### Phase 3 — Production Integration

| Component | Priority |
|-----------|----------|
| Real SIEM integration (Splunk/ELK) | P2 |
| Real EDR integration (CrowdStrike) | P2 |
| Real IAM integration (Okta/Azure AD) | P2 |
| Real CSPM integration (Wiz/Prisma) | P2 |
| Kafka event streaming | P2 |
| Kubernetes orchestration | P2 |
| Blockchain audit trail | P2 |
| Multi-tenant architecture | P2 |
| Performance optimization | P2 |

---

## 11. Risk Quantification Formulas

### 11.1 Base Probability

```
For a vulnerability v on asset a:

baseProbability(v, a) = cvssToProbability(v.cvssScore)

cvssToProbability mapping:
  10.0 → 0.95
   9.0 → 0.85
   8.0 → 0.70
   7.0 → 0.50
   6.0 → 0.30
   5.0 → 0.15
   4.0 → 0.08
   3.0 → 0.03
   2.0 → 0.01
   1.0 → 0.005

Adjustments:
  if internet_exposed: probability *= 1.5
  if exploit_in_wild:  probability *= 1.3
  probability = min(probability, 0.99)
```

### 11.2 Control Reduction Factor

```
For asset a with controls C:

controlReduction(a) = 1 - Π(1 - effectiveness(c)) for c in C where c.status == ACTIVE

effectiveness(c) = c.coverageScore × c.effectivenessScore × typeWeight(c.controlType)

typeWeight:
  MFA:           0.25
  PATCH:         0.30
  EDR:           0.20
  SEGMENTATION:  0.15
  FIREWALL:      0.10
  BACKUP:        0.08
  DLP:           0.05
  SIEM:          0.05
```

### 11.3 Adjusted Probability

```
adjustedProbability(v, a) = baseProbability(v, a) × (1 - controlReduction(a))
```

### 11.4 Financial Impact

```
financialImpact(a) = a.businessValueInr × criticalityMultiplier(a) × dataSensitivityMultiplier

criticalityMultiplier:
  CRITICAL (90-100): 1.0
  HIGH     (70-89):  0.75
  MEDIUM   (40-69):  0.50
  LOW      (0-39):   0.25

dataSensitivityMultiplier:
  RESTRICTED:  1.5
  CONFIDENTIAL: 1.2
  INTERNAL:    1.0
  PUBLIC:      0.5
```

### 11.5 Expected Annual Loss

```
For asset a:

EAL(a) = Σ (adjustedProbability(v, a) × financialImpact(a)) for all OPEN vulnerabilities on a

Enterprise EAL:
  totalEAL = Σ EAL(a) for all assets
```

### 11.6 Risk Score

```
riskScore(a) = (
    meanProbability(a) × 40 +
    normalizedImpact(a) × 35 +
    exposureScore(a) × 25
)

where:
  meanProbability(a) = mean of adjustedProbability for all vulns on asset
  normalizedImpact(a) = financialImpact(a) / maxFinancialImpact × 100
  exposureScore(a) = f(internetExposed, publicFacing, dataSensitivity)
```

---

## 12. Investment Optimization Algorithm

### 12.1 OR-Tools Model

```python
# Decision variables
# x[i] = amount invested in control i (in INR)
# Binary: y[i] = 1 if control i is selected

# Objective: Maximize total risk reduction
# maximize Σ (riskReduction[i] × y[i])

# Constraints:
# 1. Budget: Σ cost[i] × y[i] ≤ totalBudget
# 2. Per-control cap: cost[i] × y[i] ≤ maxAllocation[i]
# 3. Binary: y[i] ∈ {0, 1}

# riskReduction[i] = estimatedAnnualLossReduction(controlI)
# = Σ (probabilityReduction(v,a) × financialImpact(a))
#   for all assets a affected by control i
```

### 12.2 ROSI Calculation

```
ROSI = (RiskReduction - ControlCost) / ControlCost × 100%

Where:
  RiskReduction = preControlEAL - postControlEAL
  ControlCost = implementationCost + (annualMaintenance × timeHorizon)
  timeHorizon = typically 3 years
```

---

## 13. Demo Scenario (Hackathon)

### Setup

```
Organization: "FinSecure Corp"
Budget: ₹1 Crore
Assets: 15 critical assets
Vulnerabilities: 87 open (12 critical, 25 high, 30 medium, 20 low)
Controls: 40% average coverage
Current EAL: ₹8.5 Crore
```

### Demo Flow

1. **Login** → Executive Dashboard shows ₹8.5 Cr exposure
2. **Risk Analysis** → Top 5 risk drivers with financial breakdown
3. **Ingestion** → Simulate new CVSS 9.8 vulnerability on payment server
4. **Live Update** → Dashboard shows exposure increase to ₹9.2 Cr (WebSocket)
5. **AI Assistant** → "Why is payment infrastructure our biggest risk?" → Data-grounded explanation
6. **Scenario Simulator** → "What if we implement MFA on all servers?" → EAL drops to ₹6.8 Cr
7. **Investment Optimizer** → Optimal allocation for ₹1 Cr budget → EAL drops to ₹4.3 Cr
8. **ROSI** → 352% return on security investment over 3 years
9. **Executive Summary** → AI-generated board-ready summary

---

## 14. Security Considerations

| Aspect | Approach |
|--------|----------|
| Authentication | JWT with RS256, 15-min expiry, refresh tokens |
| Authorization | RBAC: ADMIN, CISO, ANALYST, VIEWER |
| API Security | Rate limiting, CORS, input validation |
| Data | AES-256 at rest, TLS 1.3 in transit |
| Secrets | Environment variables, never in code |
| Audit | All mutations logged with user + timestamp |
| LLM Safety | Data-grounded responses only, no raw data to LLM |

---

## 15. Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/cyberrisk
DB_SCHEMA=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=<generated-secret>
JWT_EXPIRY=900000
JWT_REFRESH_EXPIRY=604800000

# Services (internal)
AUTH_SERVICE_URL=http://auth-service:8081
ASSET_SERVICE_URL=http://asset-service:8082
VULN_SERVICE_URL=http://vulnerability-service:8083
CONTROL_SERVICE_URL=http://control-service:8084
RISK_ENGINE_URL=http://risk-engine:8090
INVESTMENT_URL=http://investment-optimizer:8091
AI_SERVICE_URL=http://ai-service:8092
INGESTION_URL=http://ingestion-service:8085
NOTIFICATION_URL=http://notification-service:8086

# LLM
OPENAI_API_KEY=
LLM_MODEL=gpt-4o
USE_MOCK_LLM=true

# Event Bus (production)
KAFKA_BROKERS=
KAFKA_TOPIC_PREFIX=cyberrisk
```

---

## 16. Mermaid Diagrams

GitHub renders the mermaid blocks below natively. They complement the ASCII
diagrams earlier in this document.

### 16.1 System Architecture

```mermaid
flowchart LR
    subgraph SOURCES["Security Data Sources"]
        A1["Vuln Scanner"]
        A2["SIEM"]
        A3["IAM"]
        A4["EDR"]
        A5["CSPM"]
    end

    subgraph EDGE["Ingestion Layer"]
        ING["ingestion-service"]
        BUS[("Redis Pub/Sub")]
    end

    subgraph CORE["Processing Layer"]
        RISK["risk-engine"]
        OPT["investment-optimizer"]
        AI["ai-service"]
    end

    subgraph APPS["Application Layer"]
        GW["api-gateway"]
        AUTH["auth-service"]
        ASSET["asset-service"]
        VULN["vulnerability-service"]
        CTRL["control-service"]
        NOTIF["notification-service"]
    end

    subgraph DATA["Data Layer"]
        PG[("PostgreSQL (NeonDB)")]
        RC[("Redis Cache")]
    end

    subgraph UI["Presentation Layer"]
        FE["React + TypeScript frontend (nginx :3000)"]
    end

    A1 & A2 & A3 & A4 & A5 -->|"REST / JSON / CSV"| ING
    ING -->|"security.events.*"| BUS
    BUS -->|"subscribe"| RISK
    BUS -->|"subscribe"| VULN
    BUS -->|"subscribe"| NOTIF

    RISK -->|"risk.events.updated"| BUS
    RISK -->|"recalc + persist"| PG
    GW -->|"forward /api/risk"| RISK
    GW -->|"forward /api/investment"| OPT
    GW -->|"forward /api/ai"| AI
    GW -->|"forward CRUD"| AUTH
    GW -->|"forward CRUD"| ASSET
    GW -->|"forward CRUD"| VULN
    GW -->|"forward CRUD"| CTRL
    GW -->|"forward events"| ING

    NOTIF -->|"WebSocket / STOMP"| FE
    FE -->|"HTTP /api (gateway)"| GW
    RISK --> PG
    OPT --> PG
    RC -.->|"cache hits (national endpoints)"| RISK
```

### 16.2 Event-Driven Risk Recalculation Flow

```mermaid
sequenceDiagram
    participant S as Vulnerability Scanner / Mock
    participant I as ingestion-service
    participant B as Redis Pub/Sub
    participant R as risk-engine
    participant N as notification-service
    participant D as React Dashboard

    S->>I: POST /api/ingestion/vulnerability
    I->>I: normalize + enrich event
    I->>B: publish security.events.vulnerability
    B->>R: deliver event payload

    activate R
    R->>R: find affected asset + controls
    R->>R: compute probability / impact / EAL
    R->>R: persist risk_calculations (versioned)
    R-->>B: publish risk.events.updated
    deactivate R

    B->>N: deliver RISK_UPDATED payload
    N-->>D: WebSocket push (STOMP)
    D->>D: store update → re-render EAL / trend / toast
```

### 16.3 Deployment (Development) Topology

```mermaid
flowchart TD
    subgraph Cluster["Docker Compose Network"]
        FE["frontend nginx :3000"]
        GW["api-gateway :8080"]
        ING["ingestion-service :8085"]
        AUTH["auth-service :8081"]
        ASSET["asset-service :8082"]
        VULN["vulnerability-service :8083"]
        CTRL["control-service :8084"]
        RISK["risk-engine :8090"]
        OPT["investment-optimizer :8091"]
        AI["ai-service :8092"]
        NOTIF["notification-service :8086"]
        REDIS[("redis :6379")]
        PG[("postgres :5432")]
    end

    FE -->|"/api"| GW
    FE -->|"/ws"| NOTIF
    GW --> AUTH
    GW --> ASSET
    GW --> VULN
    GW --> CTRL
    GW --> ING
    GW --> RISK
    GW --> OPT
    GW --> AI
    RISK --> REDIS
    RISK --> PG
    OPT --> PG
    ING --> REDIS
    NOTIF --> REDIS
```
