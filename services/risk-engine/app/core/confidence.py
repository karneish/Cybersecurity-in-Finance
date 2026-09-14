"""Risk estimate confidence & data-quality engine.

Produces a FAIR-inspired confidence score for each calculated risk value so a
CISO can see HOW trustworthy the number is, not just what it is. Gaps are
reported explicitly (missing controls, stale vuln data, unverified
effectiveness) instead of being silently hidden by point estimates.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.asset import Asset, Vulnerability, AssetControl, SecurityControl
from app.core.risk_calculator import RiskCalculator


class DataQualityEngine:
    def __init__(self, db: Session):
        self.db = db

    def asset_quality(self, asset_id: str) -> dict:
        """Per-asset data quality and confidence assessment."""
        calc = RiskCalculator(self.db)
        asset = self.db.query(Asset).filter(Asset.id == asset_id).first()
        if asset is None:
            return {"error": f"Asset {asset_id} not found"}

        vulns = self.db.query(Vulnerability).filter(
            Vulnerability.affected_asset == asset.id
        ).all()
        controls = (
            self.db.query(AssetControl, SecurityControl)
            .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
            .filter(AssetControl.asset_id == asset.id)
            .all()
        )

        scores = {}
        gaps = []

        # 1. Asset metadata completeness
        asset_fields = {
            "business_value": asset.business_value_inr is not None,
            "replacement_cost": asset.replacement_cost_inr is not None,
            "criticality": asset.criticality_score is not None,
            "sensitivity": asset.data_sensitivity in ("RESTRICTED", "CONFIDENTIAL", "INTERNAL"),
            "owner": bool(asset.owner),
        }
        asset_present = sum(asset_fields.values())
        asset_completeness = asset_present / len(asset_fields)
        scores["asset_metadata"] = round(asset_completeness * 100, 1)
        if asset.business_value_inr is None:
            gaps.append("Business value not set — financial impact understated")

        # 2. Vulnerability coverage: what share of exposure is characterized?
        open_vulns = [v for v in vulns if v.status in ("OPEN", "IN_PROGRESS")]
        per_asset_vuln_rate = min(1.0, len(open_vulns) / 2)
        scores["vuln_exposure_coverage"] = round(per_asset_vuln_rate * 100, 1)
        if len(vulns) == 0:
            gaps.append("No vulnerability records — likelihood model may be underinformed")

        # 3. Vuln data freshness
        now = datetime.now(timezone.utc)
        discovered = [v.discovered_at for v in vulns if v.discovered_at]
        if discovered:
            most_recent = max(discovered)
            if most_recent.tzinfo is None:
                most_recent = most_recent.replace(tzinfo=timezone.utc)
            age_days = (now - most_recent).days
            freshness = max(0.0, 1.0 - age_days / 90.0)
            scores["vuln_freshness"] = round(freshness * 100, 1)
            if age_days > 45:
                gaps.append(f"Vulnerability data is {age_days} days old — recommend a fresh scan")
        else:
            scores["vuln_freshness"] = 0.0
            gaps.append("No vulnerability scan history on this asset")

        # 4. Control effectiveness verification
        if controls:
            verified = [ac for ac, _ in controls if ac.status in ("VERIFIED", "IMPLEMENTED")]
            scores["control_verification"] = round(len(verified) / len(controls) * 100, 1)
        else:
            scores["control_verification"] = 0.0
            gaps.append("No mapped controls — the reduction applied may be optimistic")

        # 5. Dependency coverage (is the asset part of the graph?)
        from app.models.asset import AssetDependency
        deps = self.db.query(AssetDependency).filter(
            (AssetDependency.asset_id == asset.id) | (AssetDependency.depends_on_id == asset.id)
        ).count()
        scores["dependency_coverage"] = 100.0 if deps > 0 else 0.0
        if deps == 0:
            gaps.append("Asset not in the dependency graph — blast radius unknown")

        risk = calc.calculate_asset_risk(asset_id)
        confidence = self._overall_confidence(scores)

        return {
            "asset_id": asset_id,
            "asset_name": asset.name,
            "confidence_percent": confidence,
            "scores": scores,
            "gaps": gaps,
            "risk_score": float(risk["risk_score"]) if risk else None,
            "expected_annual_loss": float(risk["expected_annual_loss"]) if risk else None,
            "recommendations": self._recommendations(scores, gaps),
        }

    def enterprise_quality(self) -> dict:
        """Roll up per-asset quality into an enterprise confidence index."""
        calc = RiskCalculator(self.db)
        assets = self.db.query(Asset).all()
        if not assets:
            return {"total_assets": 0, "confidence_percent": 0, "asset_breakdown": []}

        breakdown = []
        confidence_sum = 0.0
        for asset in assets:
            quality = self.asset_quality(str(asset.id))
            if "error" in quality:
                continue
            breakdown.append(quality)
            confidence_sum += quality["confidence_percent"]

        overall = confidence_sum / len(breakdown) if breakdown else 0

        return {
            "total_assets": len(assets),
            "confidence_percent": round(overall, 1),
            "gap_count": sum(len(q["gaps"]) for q in breakdown),
            "asset_breakdown": sorted(
                breakdown,
                key=lambda x: (x["confidence_percent"], float(x["expected_annual_loss"] or 0)),
            ),
        }

    def _overall_confidence(self, scores: dict) -> int:
        weights = {
            "asset_metadata": 0.20,
            "vuln_exposure_coverage": 0.25,
            "vuln_freshness": 0.20,
            "control_verification": 0.20,
            "dependency_coverage": 0.15,
        }
        total = sum(scores.get(key, 0) * w for key, w in weights.items())
        return int(round(total))

    def _recommendations(self, scores: dict, gaps: list) -> list:
        recs = []
        if scores.get("vuln_freshness", 100) < 40:
            recs.append("Run an authenticated vulnerability scan on this asset")
        if scores.get("control_verification", 100) < 50:
            recs.append("Verify control implementation status before trusting the reduction")
        if scores.get("asset_metadata", 100) < 60:
            recs.append("Complete asset valuation and sensitivity metadata")
        if scores.get("dependency_coverage", 0) < 50:
            recs.append("Map asset interconnections to enable blast-radius analysis")
        if not recs and not gaps:
            recs.append("Data quality is strong; maintain scan cadence")
        return recs[:4]