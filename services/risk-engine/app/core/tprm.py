"""Third-Party / Vendor Risk Management (TPRM).

Models vendor compromise probability from the seeded assessment_score plus the
open-vuln posture of the assets the vendor touches, then cascades upstream
vendor → direct assets → dependents (blast radius) and attributes EAL by the
vendor's risk_share on each asset.
"""
from collections import defaultdict

from sqlalchemy.orm import Session

from app.models.asset import Asset, Vulnerability
from app.models.gov import Vendor, AssetVendor
from app.core.risk_calculator import RiskCalculator
from app.core.risk_graph import RiskGraph

SERVICE_TYPE_MODIFIER = {
    "MSP": 0.10,
    "CLOUD": 0.05,
    "SAAS": 0.03,
    "HARDWARE": 0.03,
    "INTEGRATOR": 0.02,
}


class TPRMManager:
    """Vendor compromise probability, upstream cascade and EAL attribution."""

    def __init__(self, db: Session):
        self.db = db
        self.risk_calc = RiskCalculator(db)

    # ── core estimation ────────────────────────────────────────────────
    def vendor_compromise_probability(self, vendor: Vendor) -> float:
        """P(compromise) from assessment_score + open vulns + service type."""
        assessment = float(vendor.assessment_score or 0)
        base = 0.60 - assessment * 0.55  # 0.60 at poor assessment → 0.05 at 1.0

        open_vulns = 0
        for av in self.db.query(AssetVendor).filter(AssetVendor.vendor_id == vendor.id).all():
            open_vulns += (
                self.db.query(Vulnerability)
                .filter(
                    Vulnerability.affected_asset == av.asset_id,
                    Vulnerability.status.in_(["OPEN", "IN_PROGRESS"]),
                )
                .count()
            )
        vuln_penalty = min(open_vulns * 0.08, 0.30)

        svc_type = (vendor.vendor_type or "").upper()
        svc_modifier = SERVICE_TYPE_MODIFIER.get(svc_type, 0.02)

        prob = base + vuln_penalty + svc_modifier
        return round(min(max(prob, 0.02), 0.95), 4)

    def _asset_eal(self, asset_id: str) -> float:
        risk = self.risk_calc.calculate_asset_risk(str(asset_id))
        return float(risk.get("expected_annual_loss", 0)) if risk else 0.0

    # ── views ──────────────────────────────────────────────────────────
    def summary(self) -> dict:
        vendors = self.db.query(Vendor).order_by(Vendor.name).all()
        if not vendors:
            return {
                "vendor_count": 0,
                "total_attributable_eal_inr": 0,
                "high_risk_vendor_count": 0,
                "average_assessment_score": 0,
                "exposed_asset_count": 0,
            }

        total_attributable = 0.0
        high_risk = 0
        exposed_assets = set()
        assessment_sum = 0.0

        for vendor in vendors:
            prob = self.vendor_compromise_probability(vendor)
            if prob >= 0.50:
                high_risk += 1
            assessment_sum += float(vendor.assessment_score or 0)

            for av in self.db.query(AssetVendor).filter(AssetVendor.vendor_id == vendor.id).all():
                eal = self._asset_eal(av.asset_id)
                share = float(av.risk_share or 1.0)
                total_attributable += eal * share
                exposed_assets.add(str(av.asset_id))

        return {
            "vendor_count": len(vendors),
            "total_attributable_eal_inr": round(total_attributable, 2),
            "high_risk_vendor_count": high_risk,
            "average_assessment_score": round(assessment_sum / len(vendors), 4),
            "exposed_asset_count": len(exposed_assets),
        }

    def vendors(self) -> list[dict]:
        rows = []
        for vendor in self.db.query(Vendor).order_by(Vendor.name).all():
            prob = self.vendor_compromise_probability(vendor)
            attributable = 0.0
            asset_count = 0
            for av in self.db.query(AssetVendor).filter(AssetVendor.vendor_id == vendor.id).all():
                attributable += self._asset_eal(av.asset_id) * float(av.risk_share or 1.0)
                asset_count += 1
            rows.append({
                "vendor_id": str(vendor.id),
                "name": vendor.name,
                "vendor_type": vendor.vendor_type,
                "sector": vendor.sector,
                "region": vendor.region,
                "criticality_score": vendor.criticality_score,
                "assessment_score": float(vendor.assessment_score or 0),
                "business_value_inr": float(vendor.business_value_inr or 0),
                "linked_asset_count": asset_count,
                "attributable_eal_inr": round(attributable, 2),
                "compromise_probability": prob,
                "risk_band": self._risk_band(prob),
                "last_assessed_at": (
                    vendor.last_assessed_at.isoformat() if vendor.last_assessed_at else None
                ),
            })
        rows.sort(key=lambda r: -r["compromise_probability"])
        return rows

    def cascade(self, vendor_id: str) -> dict:
        vendor = self.db.query(Vendor).filter(Vendor.id == vendor_id).first()
        if vendor is None:
            return {"error": f"Vendor {vendor_id} not found"}

        prob = self.vendor_compromise_probability(vendor)
        graph = RiskGraph(self.db)

        direct_assets = []
        seen = set()
        cascade_eal = 0.0
        for av in self.db.query(AssetVendor).filter(AssetVendor.vendor_id == vendor_id).all():
            asset = self.db.query(Asset).filter(Asset.id == av.asset_id).first()
            if asset is None or str(av.asset_id) in seen:
                continue
            seen.add(str(av.asset_id))

            eal = self._asset_eal(av.asset_id)
            share = float(av.risk_share or 1.0)
            contributed = eal * share

            blast = graph.get_blast_radius(str(av.asset_id))
            dependents = [
                {
                    "asset_id": n["id"],
                    "asset_name": n["name"],
                    "depth": n["depth"],
                    "expected_annual_loss": n["expected_annual_loss"],
                    "hop_path": n["hop_path"],
                }
                for n in blast.get("impacted_nodes", [])
                if n["id"] != str(av.asset_id)
            ]

            direct_assets.append({
                "asset_id": str(av.asset_id),
                "asset_name": asset.name,
                "service_type": av.service_type,
                "risk_share": float(av.risk_share or 1.0),
                "asset_eal_inr": round(eal, 2),
                "attributable_eal_inr": round(contributed, 2),
                "dependents": dependents,
                "dependents_exposed_eal_inr": round(
                    sum(d["expected_annual_loss"] for d in dependents), 2
                ),
            })
            cascade_eal += contributed + sum(d["expected_annual_loss"] for d in dependents)

        direct_assets.sort(key=lambda a: -a["attributable_eal_inr"])

        return {
            "vendor_id": str(vendor.id),
            "name": vendor.name,
            "vendor_type": vendor.vendor_type,
            "compromise_probability": prob,
            "assessment_score": float(vendor.assessment_score or 0),
            "direct_asset_count": len(direct_assets),
            "cascaded_eal_exposure_inr": round(cascade_eal, 2),
            "assets": direct_assets,
        }

    def asset_attribution(self, asset_id: str) -> dict:
        asset = self.db.query(Asset).filter(Asset.id == asset_id).first()
        if asset is None:
            return {"error": f"Asset {asset_id} not found"}

        eal = self._asset_eal(asset_id)
        rows = (
            self.db.query(AssetVendor, Vendor)
            .join(Vendor, AssetVendor.vendor_id == Vendor.id)
            .filter(AssetVendor.asset_id == asset_id)
            .all()
        )
        attributed = 0.0
        vendors_payload = []
        for av, vendor in rows:
            share = float(av.risk_share or 1.0)
            contribution = eal * share
            attributed += contribution
            vendors_payload.append({
                "vendor_id": str(vendor.id),
                "name": vendor.name,
                "vendor_type": vendor.vendor_type,
                "service_type": av.service_type,
                "risk_share": share,
                "contribution_eal_inr": round(contribution, 2),
                "compromise_probability": self.vendor_compromise_probability(vendor),
                "assessment_score": float(vendor.assessment_score or 0),
            })

        return {
            "asset_id": str(asset_id),
            "asset_name": asset.name,
            "sector": asset.sector,
            "asset_eal_inr": round(eal, 2),
            "vendor_count": len(vendors_payload),
            "unattributed_eal_inr": round(eal - attributed, 2) if vendors_payload else round(eal, 2),
            "vendors": sorted(vendors_payload, key=lambda v: -v["contribution_eal_inr"]),
        }

    @staticmethod
    def _risk_band(prob: float) -> str:
        if prob >= 0.5:
            return "HIGH"
        if prob >= 0.25:
            return "MEDIUM"
        return "LOW"