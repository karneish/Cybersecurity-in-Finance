# Machine-Learning Forecast Guide

The risk-engine provides two forecast modes for 12-month projections:

## Deterministic forecast (`GET /api/risk/forecast`)

No training data needed. Uses rolling means and trend extrapolation:
- Takes the last N weekly snapshots per asset
- Computes rolling mean, rolling standard deviation, and linear slope
- Extrapolates forward month-by-month
- Returns EAL, risk score, and open vulnerability projections

Good for: quick baseline, small datasets, immediate insights.

## XGBoost ML forecast (`POST /api/risk/forecast/ml`)

Endpoint: `services/risk-engine/app/core/ml_forecast.py`

### Training data
- 25 weekly `risk_snapshots` per asset (created by seed script)
- Minimum 18 snapshots required (`MIN_SAMPLES`); below that, falls back to deterministic

### Features engineered per asset
| Feature | Source |
|---|---|
| `lag_1`, `lag_2` | Previous 1–2 week values |
| `rolling_mean_4`, `rolling_std_4` | 4-week rolling window |
| `slope` | Linear trend over available window |
| `net_change` | Difference between latest and earliest |

### Model
- `XGBRegressor` (gradient-boosted trees, CPU-only, no GPU)
- One model per asset
- Forecasts 3 steps ahead (quarterly) with runway re-feeding (each prediction feeds back as lag for next step)
- Confidence bands from residual standard deviation

### Graceful fallback
If fewer than 18 snapshots exist, returns `ml.used: false` with a deterministic fallback — the API never errors on small data.

### Running locally

```bash
# With the Docker stack running:
curl -X POST http://localhost:8080/api/risk/forecast/ml \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"months": 12}'
```