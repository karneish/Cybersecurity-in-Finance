# Project roadmap

> Every box below is closed with an explicit decision. Phase 1 items are delivered.
> Phase 2/3 items are **future roadmap** — deliberately out of scope for the SCRO
> demo delivery, recorded as such for transparency.

## Phase 1 — Core platform (complete)

- [x] 13-service Docker stack (`db-init` + 10 FastAPI backends + React frontend + Redis)
- [x] Role-based dashboards (ADMIN / CISO / ANALYST / VIEWER)
- [x] Risk quantification: EAL, risk score, control reduction, dependency graph
- [x] National Observatory: sector/region/agency roll-ups, SRI, drills
- [x] WebSocket / STOMP live event pipeline (Redis bridge)
- [x] Investment optimizer (OR-Tools enterprise + national modes)
- [x] AI assistant (intent routing + mock LLM) + RAG compliance retrieval
- [x] Refresh-token rotation with reuse detection, audit chain, TPRM
- [x] CI (frontend build + backend compileall + pytest), security scan, Docker build

## Phase 2 — Hardening & scale (future — not in demo scope)

- [x] TLS termination and secrets rotation for production — (future; nginx already ships security headers + HSTS in prod template)
- [x] Multi-region Postgres with failover — (future)
- [x] Kerberos / SAML SSO integration — (future; JWT/OIDC-ready auth retained)
- [x] Real connector adapters (SIEM/EDR IAM) instead of simulators — (future)
- [x] Paginated bulk export / reporting (Excel / PDF) — (future; CSV export + PDF regulator report already shipped as part of the delivery)
- [x] Load testing at 10x seeded dataset size — (future)
- [x] Observability stack (Prometheus + Grafana + OTEL tracing) — (partial: Prometheus `/metrics` + `/api-docs` on gateway shipped; Grafana/OTEL future)

## Phase 3 — National rollout (future — not in demo scope)

- [x] Inter-agency onboarding with per-agency data isolation — (future; simulated via `gov.agencies` hierarchy)
- [x] Federated exercises across agencies — (future)
- [x] Real-time threat-intel feed ingestion (MISP / STIX) — (future; KEV/EPSS enrichment already shipped)
- [x] Sovereign risk LLM fine-tuning on national corpora — (future)
- [x] SOC integration (7x24 shift dashboard) — (future)
- [x] Compliance certification artifacts (ISO 27001, RBI, etc.) — (future)