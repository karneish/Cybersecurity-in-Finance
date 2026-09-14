"""ML forecast — XGBoost gradient-boosted regression over enterprise risk history.

Trains per-metric regressors (EAL, risk score, open vuln count) on lag/rolling
features derived from the persisted `risk_snapshots` ledger. When history is too
sparse for supervised learning it transparently hands back to the explainable
deterministic `DoNothingForecast`. The trained models are cached in-process and
retrained automatically when new snapshots arrive.
"""

import threading
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy.orm import Session

from app.models.asset import RiskSnapshot
from app.core.forecast import DoNothingForecast

try:
    from xgboost import XGBRegressor

    _HAS_XGBOOST = True
except Exception:
    _HAS_XGBOOST = False

MIN_SAMPLES = 18
MIN_FEATURES = 6
TRAIN_KEY = "ml_forecast.state"


def _lagged_features(values: list[float]) -> tuple[np.ndarray, np.ndarray]:
    """Build sliding-window lag/rolling features for the next-step prediction."""
    features, targets = [], []
    window = 5
    for i in range(window, len(values)):
        past = values[i - window : i]
        targets.append(values[i])
        features.append(
            [
                past[-1],                    # lag-1
                past[-2],                    # lag-2
                float(np.mean(past)),        # rolling mean
                float(np.std(past)),         # rolling std
                float(np.polyfit(range(window), past, 1)[0]),  # recent slope
                past[-1] - past[0],          # net change over window
            ]
        )
    if not features:
        return np.zeros((0, MIN_FEATURES)), np.zeros((0,))
    return np.asarray(features, dtype=float), np.asarray(targets, dtype=float)


class MLForecast:
    def __init__(self, db: Session):
        self.db = db
        self._lock = threading.Lock()
        self._models: dict[str, XGBRegressor] | None = None
        self._trained_on: tuple[int, datetime] | None = None

    # ── history ─────────────────────────────────────────────────
    def _history(self) -> list[RiskSnapshot]:
        return (
            self.db.query(RiskSnapshot)
            .order_by(RiskSnapshot.snapshot_date.asc())
            .all()
        )

    # ── training ────────────────────────────────────────────────
    def _needs_retrain(self) -> bool:
        snapshots = self._history()
        if len(snapshots) < MIN_SAMPLES:
            return False
        last_date = snapshots[-1].snapshot_date if snapshots else datetime.utcnow().date()
        if self._models is None or self._trained_on is None:
            return True
        _, trained_last = self._trained_on
        return trained_last != last_date

    def _train(self) -> dict[str, XGBRegressor] | None:
        if not _HAS_XGBOOST:
            return None
        with self._lock:
            if not self._needs_retrain():
                return self._models
            snapshots = self._history()
            if len(snapshots) < MIN_SAMPLES:
                self._models = None
                return None

            eal = [float(s.expected_annual_loss or 0) for s in snapshots]
            score = [float(s.risk_score or 0) for s in snapshots]
            vulns = [float(s.total_vulns_open or 0) for s in snapshots]

            models = {}
            for name, series in (("eal", eal), ("score", score), ("vulns", vulns)):
                X, y = _lagged_features(series)
                if len(X) < MIN_FEATURES:
                    models[name] = None
                    continue
                model = XGBRegressor(
                    n_estimators=250,
                    max_depth=3,
                    learning_rate=0.05,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    n_jobs=1,
                    random_state=42,
                )
                model.fit(X, y)
                models[name] = model
            self._models = models
            self._trained_on = (len(snapshots), snapshots[-1].snapshot_date)
            return models

    # ── forecast ────────────────────────────────────────────────
    def forecast(self, horizon_months: int = 12) -> dict:
        models = self._train()
        if models is None:
            # Not enough history (or xgboost unavailable) → explainable fallback.
            dn = DoNothingForecast(self.db)
            base = dn.forecast(horizon_months)
            base["method"] = "XGBoost ML" if not _HAS_XGBOOST else "XGBoost ML (insufficient history)"
            base["ml"] = {"used": False, "reason": "insufficient history for supervised training"}
            return base

        snapshots = self._history()
        n = len(snapshots)
        runway = 12  # evolve predictions past history by re-feeding predictions

        def project(key: str, initial_tail: list[float]) -> list[float]:
            tail = initial_tail[-6:]
            out = []
            model = models.get(key)
            for _ in range(horizon_months + 1):
                if model is None:
                    # No ML model for this series → hold last value.
                    out.append(round(tail[-1], 2))
                    continue
                if len(tail) >= 5:
                    past = tail[-5:]
                    feat = np.asarray([
                        [past[-1], past[-2], float(np.mean(past)), float(np.std(past)),
                         float(np.polyfit(range(5), past, 1)[0]), past[-1] - past[0]]
                    ])
                    step = max(0.0, float(model.predict(feat)[0]))
                else:
                    step = tail[-1]
                out.append(round(step, 2))
                tail.append(step)
            return out

        eal_series = [float(s.expected_annual_loss or 0) for s in snapshots]
        score_series = [float(s.risk_score or 0) for s in snapshots]
        vulns_series = [float(s.total_vulns_open or 0) for s in snapshots]

        base_date = datetime.utcnow().date()
        projected_eal = project("eal", eal_series)
        projected_score = project("score", score_series)
        projected_vulns = project("vulns", vulns_series)

        series = [
            {
                "month": m,
                "date": (base_date + timedelta(days=30 * m)).isoformat(),
                "eal_inr": projected_eal[m],
                "risk_score": min(100.0, projected_score[m]),
                "open_vulns": int(projected_vulns[m]),
            }
            for m in range(horizon_months + 1)
        ]

        current_eal = float(eal_series[-1] or 0)
        current_score = float(score_series[-1] or 0)
        current_vulns = int(vulns_series[-1] or 0)
        final = series[-1]
        final_score = final["risk_score"]
        threshold_messages = []
        if final_score >= 75:
            threshold_messages.append("Projected risk score crosses the CRITICAL band (≥75).")
        elif final_score >= 50:
            threshold_messages.append("Projected risk score enters the HIGH band (≥50).")
        if current_eal and (final["eal_inr"] / current_eal) >= 1.5:
            threshold_messages.append("EAL inflates to 1.5x today's level — breach of the alert threshold.")
        if not threshold_messages:
            threshold_messages.append("No threshold crossings projected under current controls.")

        return {
            "horizon_months": horizon_months,
            "baseline": {
                "current_eal_inr": round(current_eal, 2),
                "current_risk_score": round(current_score, 2),
                "current_open_vulns": current_vulns,
            },
            "method": "XGBoost gradient-boosted regression on lag/rolling features",
            "using_history": True,
            "ml": {
                "used": True,
                "model": "XGBRegressor",
                "trained_on_last_snapshot": snapshots[-1].snapshot_date.isoformat(),
                "reason": None,
            },
            "series": series,
            "do_nothing_cost_12m": round(max(final["eal_inr"] - current_eal, 0), 2),
            "eal_at_6_months": projected_eal[min(6, len(projected_eal) - 1)],
            "eal_at_12_months": final["eal_inr"],
            "insights": {
                "eal_multiple_6m": round(projected_eal[min(6, len(projected_eal) - 1)] / current_eal, 2) if current_eal else 0,
                "eal_multiple_12m": round(final["eal_inr"] / current_eal, 2) if current_eal else 0,
                "risk_score_band_12m": (
                    "CRITICAL" if final_score >= 75 else "HIGH" if final_score >= 50 else "MEDIUM" if final_score >= 25 else "LOW"
                ),
                "threshold_crossings": threshold_messages,
            },
            "explanation": (
                "ML forecast from XGBoost: each series (EAL, risk score, open vulns) is projected "
                f"with lag/rolling features over {n} historical snapshots; baseline EAL ₹{current_eal:,.0f}."
            ),
        }


def forecast_ml(db: Session, horizon_months: int = 12) -> dict:
    return MLForecast(db).forecast(horizon_months)