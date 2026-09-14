from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.asset import (
    Asset, Vulnerability, SecurityControl, AssetControl,
    RiskCalculation, RiskSnapshot, RiskEvent,
)
from app.core.formulas import (
    calculate_probability,
    calculate_financial_impact,
    calculate_control_reduction,
    calculate_risk_score,
    calculate_impact_components,
    get_risk_category,
)


class RiskCalculator:
    """Core risk quantification engine."""

    def __init__(self, db: Session):
        self.db = db

    def get_asset(self, asset_id: str) -> dict | None:
        asset = self.db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            return None
        return {
            "id": str(asset.id),
            "name": asset.name,
            "asset_type": asset.asset_type,
            "environment": asset.environment,
            "department": asset.department,
            "business_value_inr": float(asset.business_value_inr),
            "replacement_cost_inr": float(asset.replacement_cost_inr or 0),
            "internet_exposed": asset.internet_exposed,
            "criticality_score": asset.criticality_score,
            "data_sensitivity": asset.data_sensitivity,
            "annual_revenue_impact": float(asset.annual_revenue_impact or 0),
        }

    def get_asset_vulnerabilities(self, asset_id: str) -> list[dict]:
        vulns = self.db.query(Vulnerability).filter(
            Vulnerability.affected_asset == asset_id,
            Vulnerability.status.in_(["OPEN", "IN_PROGRESS"]),
        ).all()
        return [
            {
                "id": str(v.id),
                "cve_id": v.cve_id,
                "cvss_score": float(v.cvss_score),
                "severity": v.severity,
                "exploitability": float(v.exploitability or 0),
                "internet_exposed": v.internet_exposed,
                "status": v.status,
            }
            for v in vulns
        ]

    def get_asset_controls(self, asset_id: str) -> list[dict]:
        controls = (
            self.db.query(AssetControl, SecurityControl)
            .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
            .filter(AssetControl.asset_id == asset_id)
            .all()
        )
        return [
            {
                "id": str(ac.id),
                "control_type": sc.control_type,
                "status": ac.status,
                "coverage_score": float(ac.coverage_score),
                "effectiveness_score": float(ac.effectiveness_score),
                "maturity_level": ac.maturity_level,
            }
            for ac, sc in controls
        ]

    def get_max_financial_impact(self) -> float:
        result = self.db.query(Asset).all()
        if not result:
            return 1.0
        impacts = [calculate_financial_impact({
            "business_value_inr": float(a.business_value_inr),
            "criticality_score": a.criticality_score,
            "data_sensitivity": a.data_sensitivity,
        }) for a in result]
        return max(impacts) if impacts else 1.0

    def calculate_asset_risk(self, asset_id: str) -> dict | None:
        asset = self.get_asset(asset_id)
        if not asset:
            return None

        vulns = self.get_asset_vulnerabilities(asset_id)
        controls = self.get_asset_controls(asset_id)
        control_reduction = calculate_control_reduction(controls)

        total_max_impact = self.get_max_financial_impact()
        financial_impact = calculate_financial_impact(asset)

        if not vulns:
            return {
                "asset_id": asset_id,
                "asset_name": asset["name"],
                "risk_score": 0.0,
                "probability": 0.0,
                "financial_impact_inr": financial_impact,
                "expected_annual_loss": 0.0,
                "risk_category": "LOW",
                "risk_factors": {"open_vulns": 0, "control_reduction": control_reduction},
                "control_reduction": control_reduction,
                "residual_risk": 0.0,
                "impact_components": calculate_impact_components(asset),
            }

        probabilities = []
        eal = 0.0
        for v in vulns:
            prob = calculate_probability(v, asset, control_reduction)
            probabilities.append(prob)
            eal += prob * financial_impact

        mean_probability = sum(probabilities) / len(probabilities) if probabilities else 0
        risk_score = calculate_risk_score(mean_probability, financial_impact, asset, total_max_impact)

        return {
            "asset_id": asset_id,
            "asset_name": asset["name"],
            "risk_score": risk_score,
            "probability": round(mean_probability, 4),
            "financial_impact_inr": financial_impact,
            "expected_annual_loss": round(eal, 2),
            "risk_category": get_risk_category(risk_score),
            "risk_factors": {
                "open_vulns": len(vulns),
                "critical_vulns": len([v for v in vulns if v["severity"] == "CRITICAL"]),
                "high_vulns": len([v for v in vulns if v["severity"] == "HIGH"]),
                "control_reduction": control_reduction,
                "internet_exposed": asset["internet_exposed"],
                "criticality_score": asset["criticality_score"],
            },
            "control_reduction": control_reduction,
            "residual_risk": round(eal * (1 - control_reduction), 2),
            "impact_components": calculate_impact_components(asset),
        }

    def persist_risk(self, asset_id: str, risk_data: dict) -> RiskCalculation:
        existing = (
            self.db.query(RiskCalculation)
            .filter(RiskCalculation.asset_id == asset_id)
            .order_by(RiskCalculation.version.desc())
            .first()
        )
        version = (existing.version + 1) if existing else 1

        risk_before = float(existing.risk_score) if existing else 0.0
        eal_before = float(existing.expected_annual_loss) if existing else 0.0

        calc = RiskCalculation(
            asset_id=asset_id,
            risk_score=risk_data["risk_score"],
            probability=risk_data["probability"],
            financial_impact_inr=risk_data["financial_impact_inr"],
            expected_annual_loss=risk_data["expected_annual_loss"],
            risk_category=risk_data["risk_category"],
            risk_factors=risk_data["risk_factors"],
            control_reduction=risk_data["control_reduction"],
            residual_risk=risk_data["residual_risk"],
            version=version,
        )
        self.db.add(calc)

        event = RiskEvent(
            event_type="RISK_RECALCULATED",
            source_asset=asset_id,
            details=risk_data["risk_factors"],
            risk_before=risk_before,
            risk_after=risk_data["risk_score"],
            eal_before=eal_before,
            eal_after=risk_data["expected_annual_loss"],
        )
        self.db.add(event)

        self.db.commit()
        self.db.refresh(calc)
        return calc

    def persist_snapshot(self, snapshot_date=None) -> RiskSnapshot:
        """Persist an enterprise-wide risk snapshot for trend/forecast analysis."""
        assets = self.db.query(Asset).all()
        if not assets:
            return None

        total_eal = 0.0
        total_score = 0.0
        controls_active = 0
        vulns_open = 0
        results = []

        for asset in assets:
            risk = self.calculate_asset_risk(str(asset.id))
            if not risk:
                continue
            results.append(risk)
            total_eal += risk["expected_annual_loss"]
            total_score += risk["risk_score"]
            controls = (self.db.query(AssetControl)
                        .filter(AssetControl.asset_id == asset.id,
                                AssetControl.status.in_(["ACTIVE", "VERIFIED", "IMPLEMENTED"]))
                        .count())
            controls_active += controls
            vulns_open += risk["risk_factors"].get("open_vulns", 0)

        snapshot = RiskSnapshot(
            risk_score=round(total_score / len(results), 2) if results else 0,
            expected_annual_loss=round(total_eal, 2),
            total_controls_active=controls_active,
            total_vulns_open=vulns_open,
            snapshot_date=snapshot_date or datetime.utcnow(),
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def calculate_all_risks(self) -> list[dict]:
        assets = self.db.query(Asset).all()
        results = []
        for asset in assets:
            risk_data = self.calculate_asset_risk(str(asset.id))
            if risk_data:
                self.persist_risk(str(asset.id), risk_data)
                results.append(risk_data)
        return results

    def get_enterprise_risk(self) -> dict:
        assets = self.db.query(Asset).all()
        if not assets:
            return self._empty_enterprise_risk()

        all_risks = []
        for asset in assets:
            risk = self.calculate_asset_risk(str(asset.id))
            if risk:
                all_risks.append(risk)

        total_eal = sum(r["expected_annual_loss"] for r in all_risks)
        total_vulns = sum(r["risk_factors"].get("open_vulns", 0) for r in all_risks)
        avg_score = sum(r["risk_score"] for r in all_risks) / len(all_risks) if all_risks else 0

        enterprise_score = min(100, avg_score * 1.1 + (total_eal / 10000000) * 2)

        sorted_risks = sorted(all_risks, key=lambda x: x["expected_annual_loss"], reverse=True)
        top_drivers = [
            {
                "asset_id": r["asset_id"],
                "asset_name": r["asset_name"],
                "risk_score": r["risk_score"],
                "expected_annual_loss": r["expected_annual_loss"],
                "risk_category": r["risk_category"],
                "open_vulns": r["risk_factors"].get("open_vulns", 0),
            }
            for r in sorted_risks[:10]
        ]

        return {
            "total_eal": round(total_eal, 2),
            "total_assets": len(assets),
            "total_vulnerabilities": total_vulns,
            "critical_risks": len([r for r in all_risks if r["risk_category"] == "CRITICAL"]),
            "high_risks": len([r for r in all_risks if r["risk_category"] == "HIGH"]),
            "medium_risks": len([r for r in all_risks if r["risk_category"] == "MEDIUM"]),
            "low_risks": len([r for r in all_risks if r["risk_category"] == "LOW"]),
            "average_risk_score": round(avg_score, 2),
            "enterprise_risk_score": round(enterprise_score, 2),
            "top_risk_drivers": top_drivers,
        }

    def _empty_enterprise_risk(self) -> dict:
        return {
            "total_eal": 0,
            "total_assets": 0,
            "total_vulnerabilities": 0,
            "critical_risks": 0,
            "high_risks": 0,
            "medium_risks": 0,
            "low_risks": 0,
            "average_risk_score": 0,
            "enterprise_risk_score": 0,
            "top_risk_drivers": [],
        }
