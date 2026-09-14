"""Deterministic "do-nothing" forecast.

Projects enterprise risk forward if no action is taken. Fit is a simple
least-squares linear trend over the persisted risk_snapshots; when history is
sparse it falls back to calibrated drift assumptions and states them
explicitly. No ML, fully explainable.
"""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.asset import RiskSnapshot
from app.core.risk_calculator import RiskCalculator
from app.core.formulas import get_risk_category

MONTHS = 12
DEFAULT_ANNUAL_EAL_GROWTH = 0.12   # +12%/yr exposure drift when no action
DEFAULT_ANNUAL_VULN_GROWTH = 0.25  # +2%/mo findings drift


def _least_squares_slope(points: list[tuple[float, float]]) -> float:
    if len(points) < 2:
        return 0.0
    n = len(points)
    sum_x = sum(p[0] for p in points)
    sum_y = sum(p[1] for p in points)
    sum_xy = sum(p[0] * p[1] for p in points)
    sum_xx = sum(p[0] * p[0] for p in points)
    denom = n * sum_xx - sum_x * sum_x
    if abs(denom) < 1e-9:
        return 0.0
    return (n * sum_xy - sum_x * sum_y) / denom


class DoNothingForecast:
    def __init__(self, db: Session):
        self.db = db
        self.calc = RiskCalculator(db)

    def forecast(self, horizon_months: int = MONTHS) -> dict:
        snapshots = (
            self.db.query(RiskSnapshot)
            .order_by(RiskSnapshot.snapshot_date.asc())
            .all()
        )

        current = self.calc.get_enterprise_risk()
        current_eal = float(current["total_eal"])
        current_score = float(current["enterprise_risk_score"])
        current_vulns = int(current["total_vulnerabilities"])

        using_history = len(snapshots) >= 2
        base_date = datetime.utcnow().date()

        eal_pts = []
        vuln_pts = []
        score_pts = []
        first = snapshots[0].snapshot_date if snapshots else base_date
        for snap in snapshots:
            t = (snap.snapshot_date - first).days / 30.0
            eal_pts.append((t, float(snap.expected_annual_loss or 0)))
            vuln_pts.append((t, float(snap.total_vulns_open or 0)))
            score_pts.append((t, float(snap.risk_score or 0)))

        if using_history:
            eal_slope = max(_least_squares_slope(eal_pts), 0)
            vuln_slope = max(_least_squares_slope(vuln_pts), 0)
            score_slope = max(_least_squares_slope(score_pts), 0)
        else:
            eal_slope = current_eal * DEFAULT_ANNUAL_EAL_GROWTH / 12
            vuln_slope = current_vulns * DEFAULT_ANNUAL_VULN_GROWTH / 12
            score_slope = 0.4

        series = []
        projected_eal = current_eal
        projected_vulns = current_vulns
        projected_score = current_score
        for m in range(0, horizon_months + 1):
            projected_eal = current_eal + eal_slope * m
            projected_vulns = max(0, int(current_vulns + vuln_slope * m))
            projected_score = min(100.0, max(0.0, current_score + score_slope * m))
            series.append({
                "month": m,
                "date": (base_date + timedelta(days=30 * m)).isoformat(),
                "eal_inr": round(projected_eal, 2),
                "risk_score": round(projected_score, 2),
                "open_vulns": projected_vulns,
            })

        final = series[-1]
        projected_cost = max(final["eal_inr"] - current_eal, 0)
        six_month = series[6]["eal_inr"] if len(series) > 6 else current_eal
        final_score = final["risk_score"]

        eal_mult_6m = (six_month / current_eal) if current_eal else 0.0
        eal_mult_12m = (final["eal_inr"] / current_eal) if current_eal else 0.0
        band_12m = get_risk_category(final_score)
        threshold_messages = []
        if final_score >= 75:
            threshold_messages.append(
                "Projected risk score crosses the CRITICAL band (≥75) within the horizon."
            )
        elif final_score >= 50:
            threshold_messages.append(
                "Projected risk score enters the HIGH band (≥50) within the horizon."
            )
        if eal_mult_12m >= 1.5:
            threshold_messages.append(
                f"EAL inflates to {eal_mult_12m:.1f}x today's level — breach of the 1.5x alert threshold."
            )
        if not threshold_messages:
            threshold_messages.append(
                "No threshold crossings projected under current controls."
            )

        return {
            "horizon_months": horizon_months,
            "baseline": {
                "current_eal_inr": round(current_eal, 2),
                "current_risk_score": round(current_score, 2),
                "current_open_vulns": current_vulns,
            },
            "method": (
                "Linear trend fit over historical risk snapshots"
                if using_history else
                f"Calibrated drift ({int(DEFAULT_ANNUAL_EAL_GROWTH * 100)}%/yr EAL, "
                f"{int(DEFAULT_ANNUAL_VULN_GROWTH * 100)}%/yr findings) because <2 snapshots exist"
            ),
            "using_history": using_history,
            "series": series,
            "do_nothing_cost_12m": round(projected_cost, 2),
            "eal_at_6_months": round(six_month, 2),
            "eal_at_12_months": round(final["eal_inr"], 2),
            "insights": {
                "eal_multiple_6m": round(eal_mult_6m, 2),
                "eal_multiple_12m": round(eal_mult_12m, 2),
                "risk_score_band_12m": band_12m,
                "threshold_crossings": threshold_messages,
            },
            "explanation": (
                "No-control forecast: EAL increases by ₹"
                f"{projected_cost:,.0f} over {horizon_months} months if investments are deferred."
            ),
        }