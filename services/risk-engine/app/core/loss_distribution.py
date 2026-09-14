"""Monte Carlo annual-loss distribution (FAIR-style).

Instead of a single point estimate, we simulate the distribution of annual loss
across the portfolio. Each asset draws a "loss event count" per year from its
compromise probability and a "loss severity" from a lognormal fitted to its
financial impact, using the seeded CVSS/controls as the probability driver.
Run count n=5000 by default for stable percentiles.
"""
import numpy as np

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.core.risk_calculator import RiskCalculator


class LossDistributionSimulator:
    def __init__(self, db: Session, seed: int = 42):
        self.db = db
        self.calc = RiskCalculator(db)
        self.rng = np.random.default_rng(seed)

    def simulate(self, simulations: int = 5000, days: int = 365) -> dict:
        assets = self.db.query(Asset).all()
        if not assets:
            return self._empty(days)

        asset_params = []
        for asset in assets:
            risk = self.calc.calculate_asset_risk(str(asset.id))
            if not risk:
                continue
            probability = float(risk["probability"])
            impact = float(risk["financial_impact_inr"]) + 1.0  # avoid log(0)
            eal = float(risk["expected_annual_loss"])
            log_mean = np.log(impact * 0.5)
            log_sigma = min(max(np.log(impact * 1.5) - log_mean, 0.1), 2.5)
            asset_params.append({
                "asset_id": str(asset.id),
                "asset_name": risk["asset_name"],
                "probability": max(min(probability, 0.995), 0.001),
                "log_mean": log_mean,
                "log_sigma": log_sigma,
                "eal": eal,
            })

        total_eal = sum(p["eal"] for p in asset_params)
        annual_losses = np.zeros(simulations)

        for p in asset_params:
            # Expected annual events: Poisson-ish around probability
            event_weights = self.rng.binomial(1, p["probability"] / 3.0, simulations)
            severities = np.exp(self.rng.normal(p["log_mean"], p["log_sigma"], simulations))
            annual_losses += event_weights * severities

        p5, p50, p95 = np.percentile(annual_losses, [5, 50, 95])
        tail = np.percentile(annual_losses, 99)
        mean = float(annual_losses.mean())

        histogram = self._histogram(annual_losses)

        return {
            "simulations": simulations,
            "horizon_days": days,
            "expected_annual_loss_inr": round(total_eal, 2),
            "mc_mean_inr": round(mean, 2),
            "p5_inr": round(float(p5), 2),
            "p50_inr": round(float(p50), 2),
            "p95_inr": round(float(p95), 2),
            "p99_inr": round(float(tail), 2),
            "var95_inr": round(float(p95), 2),
            "mean_exceedance_p95": round(max(mean - float(p95), 0.0), 2),
            "value_at_risk_band": {
                "conservative_best": round(float(p5), 2),
                "expected": round(float(p50), 2),
                "adverse": round(float(p95), 2),
                "severe": round(float(tail), 2),
            },
            "loss_distribution_added_value": (
                "Point estimate masks tail risk — use the p95/p99 band for "
                "capital and insurance decisions."
            ),
            "histogram": histogram,
            "per_asset": [
                {
                    "asset_id": p["asset_id"],
                    "asset_name": p["asset_name"],
                    "probability": round(p["probability"], 4),
                    "expected_annual_loss": round(p["eal"], 2),
                }
                for p in asset_params
            ],
        }

    def _histogram(self, losses: np.ndarray) -> list[dict]:
        if losses.sum() <= 0:
            return []
        max_val = float(losses.max())
        bins = 20
        counts, edges = np.histogram(losses, bins=bins)
        total = counts.sum()
        return [
            {
                "range_start": round(float(edges[i]) / 1_000_000, 2),
                "range_end": round(float(edges[i + 1]) / 1_000_000, 2),
                "count": int(counts[i]),
                "frequency": round(float(counts[i]) / total, 4),
            }
            for i in range(bins)
            if counts[i] > 0
        ]

    def _empty(self, days: int) -> dict:
        return {
            "simulations": 0,
            "horizon_days": days,
            "expected_annual_loss_inr": 0,
            "mc_mean_inr": 0,
            "p5_inr": 0,
            "p50_inr": 0,
            "p95_inr": 0,
            "p99_inr": 0,
            "var95_inr": 0,
            "mean_exceedance_p95": 0,
            "value_at_risk_band": {},
            "loss_distribution_added_value": "No assets available.",
            "histogram": [],
            "per_asset": [],
        }