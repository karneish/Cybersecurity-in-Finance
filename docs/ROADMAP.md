# Project roadmap

## Phase 1 — Core platform (current, ~complete)

- [x] 12-service Docker stack (10 FastAPI backends + React frontend + Redis)
- [x] Role-based dashboards (ADMIN / CISO / ANALYST / VIEWER)
- [x] Risk quantification: EAL, risk score, control reduction, dependency graph
- [x] National Observatory: sector/region/agency roll-ups, SRI, drills
- [x] WebSocket / STOMP live event pipeline (Redis bridge)
- [x] Investment optimizer (OR-Tools enterprise + national modes)
- [x] AI assistant (intent routing + mock LLM) + RAG compliance retrieval
- [x] Refresh-token rotation with reuse detection, audit chain, TPRM
- [x] CI (frontend build + backend compileall + pytest), security scan, Docker build

## Phase 2 — Hardening & scale

- [ ] TLS termination and secrets rotation for production
- [ ] Multi-region Postgres with failover
- [ ] Kerberos / SAML SSO integration
- [ ] Real connector adapters (SIEM/EDR IAM) instead of simulators
- [ ] Paginated bulk export / reporting (Excel / PDF)
- [ ] Load testing at 10x seeded dataset size
- [ ] Observability stack (Prometheus + Grafana + OTEL tracing)

## Phase 3 — National rollout

- [ ] Inter-agency onboarding with per-agency data isolation
- [ ] Federated exercises across agencies
- [ ] Real-time threat-intel feed ingestion (MISP / STIX)
- [ ] Sovereign risk LLM fine-tuning on national corpora
- [ ] SOC integration (7x24 shift dashboard)
- [ ] Compliance certification artifacts (ISO 27001, RBI, etc.)