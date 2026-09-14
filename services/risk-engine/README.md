# risk-engine

Core cyber-risk quantification — EAL, scenarios, dependency graph, national
observatory, TPRM, audit chain, and ML forecast.

**Port:** 8090  
**Stack:** FastAPI + SQLAlchemy + XGBoost + NumPy + SciPy

## Key features

- **Per-asset risk calculation:** probability, financial impact, risk score (0–100), EAL (₹), control reduction, residual risk
- **Dependency graph:** risk cascades through asset dependencies (blast radius, attack paths)
- **Scenario simulation:** what-if events (ransomware, supply chain, DDoS)
- **Loss distribution:** Monte-Carlo → mean, p50, p95, VaR, worst case
- **National observatory:** summary, sector/region/agency roll-ups, SRI, drills, early warnings
- **TPRM:** vendor catalogue, asset-vendor cascade, exposure map
- **Audit chain:** hash-linked, SHA-256, tamper-evident evidence log
- **Forecasts:** deterministic + XGBoost ML 12-month projections

## API highlights

| Endpoint | Purpose |
|---|---|
| `GET /api/risk/score` | Per-asset risk scores |
| `GET /api/risk/eal` | Expected Annual Loss breakdown |
| `POST /api/risk/scenario/simulate` | What-if simulation |
| `GET /api/risk/graph` | Asset dependency graph |
| `POST /api/risk/forecast/ml` | XGBoost 12-month forecast |
| `GET /api/risk/national/summary` | National EAL / SRI |
| `POST /api/risk/exercises` | Run national drill |
| `POST /api/risk/audit/verify` | Verify audit chain hashes |
| `GET /api/risk/tprm/vendors` | Vendor risk catalogue |

## Risk formulas

All formulas live in `app/core/formulas.py`. Key calculations:
- **EAL = probability × single_point_impact**
- **Residual EAL = EAL × ∏(1 − effective_weight_t)** for enforced controls
- **Risk score = probability × 40 + impact_norm × 35 + exposure × 25**
- Bands: ≥75 CRITICAL, ≥50 HIGH, ≥25 MEDIUM, else LOW

## ML forecast

See `docs/ML_FORECAST.md` for details on the XGBoost regression model.