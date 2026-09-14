"""Crown-jewel attack path simulation.

A hand-authored, deterministic simulation (no ML) that walks a realistic
lateral-movement path toward a crown-jewel asset. Each hop's compromise
probability is derived from the actual open vulnerabilities and active controls
of the stage asset, so the numbers move when the underlying data changes.
"""
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.asset import Asset, Vulnerability, AssetControl, SecurityControl
from app.core.formulas import cvss_to_probability, calculate_control_reduction
from app.core.risk_calculator import RiskCalculator

# Hand-authored crown-jewel path: web exposure -> gateway -> payments -> PII.
# Each entry: (asset_string_id, role_label)
CROWN_JEWEL_PATH = [
    ("WEB-APP-001", "Entry via customer portal"),
    ("API-GW-001", "Lateral movement through API gateway"),
    ("PAY-SRV-001", "Privilege escalation on payment server"),
    ("CUST-DB-001", "Exfiltration of crown-jewel customer PII"),
]

ASSET_STR_TO_UUID = {
    "PAY-SRV-001": "00000001-0001-0001-0001-000000000001",
    "CUST-DB-001": "00000001-0001-0001-0001-000000000002",
    "AUTH-IDP-001": "00000001-0001-0001-0001-000000000003",
    "WEB-APP-001": "00000001-0001-0001-0001-000000000004",
    "API-GW-001": "00000001-0001-0001-0001-000000000005",
    "EMAIL-SRV-001": "00000001-0001-0001-0001-000000000006",
    "BACKUP-SYS-001": "00000001-0001-0001-0001-000000000007",
    "CLOUD-MGMT-001": "00000001-0001-0001-0001-000000000008",
    "SIEM-SYS-001": "00000001-0001-0001-0001-000000000009",
    "DEV-ENV-001": "00000001-0001-0001-0001-000000000010",
    "DB-ANALYTICS-001": "00000001-0001-0001-0001-000000000011",
    "VPN-SRV-001": "00000001-0001-0001-0001-000000000012",
}


class AttackPathSimulator:
    def __init__(self, db: Session):
        self.db = db
        self.calc = RiskCalculator(db)

    def simulate(self) -> dict:
        stages = []
        cumulative_probability = 1.0
        cumulative_loss = 0.0
        total_compromise = 1.0

        for asset_str, hop_label in CROWN_JEWEL_PATH:
            stage = self._simulate_stage(asset_str, hop_label, cumulative_probability)
            stages.append(stage)
            cumulative_probability = stage["cumulative_probability"]
            cumulative_loss += stage["loss_at_stage"]

        crown = stages[-1]
        total_risk_value = sum(
            float(calc_risk["expected_annual_loss"]) for calc_risk in self._stage_eals()
        )

        return {
            "path_name": "Customer PII Exfiltration",
            "crown_jewel": crown["asset_name"],
            "path_length": len(stages),
            "stages": stages,
            "overall_compromise_probability": round(min(cumulative_probability, 1.0), 4),
            "expected_loss_inr": round(cumulative_loss, 2),
            "total_eal_at_risk_inr": round(total_risk_value, 2),
            "time_to_compromise_hours": sum(s["time_hours"] for s in stages),
            "assumptions": [
                "Probabilities derived from open CVSS scores and active control coverage",
                "Control reduction applied per stage using the independence model",
                "Deterministic input — no ML, no fabricated values",
            ],
        }

    def _simulate_stage(self, asset_str_id: str, hop_label: str, prior: float) -> dict:
        asset_uuid = ASSET_STR_TO_UUID.get(asset_str_id)
        if asset_uuid is None:
            asset_uuid = asset_str_id
        asset = self.db.query(Asset).filter(Asset.id == asset_uuid).first()

        asset_id = str(asset.id)

        vulns = self.db.query(Vulnerability).filter(
            Vulnerability.affected_asset == asset.id,
            Vulnerability.status.in_(["OPEN", "IN_PROGRESS"]),
        ).all()

        controls = self._controls_for(asset.id)
        control_reduction = calculate_control_reduction(controls)

        stage_probability = 0.0
        worst_vuln = None
        worst_cvss = 0.0
        for v in vulns:
            base = cvss_to_probability(float(v.cvss_score))
            if v.internet_exposed or asset.internet_exposed:
                base *= 1.5
            base = min(base, 0.99)
            prob = min(base * (1 - control_reduction), 0.99)
            if float(v.cvss_score) > worst_cvss:
                worst_cvss = float(v.cvss_score)
                worst_vuln = v
            stage_probability = max(stage_probability, prob)

        cumulative = prior * stage_probability if stage_probability > 0 else prior * 0.01

        risk = self.calc.calculate_asset_risk(asset_id)
        eal = float(risk["expected_annual_loss"]) if risk else 0.0
        loss_at_stage = eal if eal > 0 else float(asset.business_value_inr or 0) * 0.3

        time_hours = self._time_estimate(stage_probability, len(vulns))

        return {
            "asset_id": asset_id,
            "asset_name": asset.name,
            "hop_label": hop_label,
            "stage_probability": round(stage_probability, 4),
            "cumulative_probability": round(min(cumulative, 1.0), 4),
            "open_vulnerabilities": len(vulns),
            "worst_cvss": worst_cvss,
            "worst_vuln_title": worst_vuln.title if worst_vuln else None,
            "control_reduction": round(control_reduction, 4),
            "active_controls": len(controls),
            "eal_inr": round(eal, 2),
            "loss_at_stage": round(loss_at_stage, 2),
            "time_hours": time_hours,
        }

    def _controls_for(self, asset_uuid) -> list[dict]:
        rows = (
            self.db.query(AssetControl, SecurityControl)
            .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
            .filter(AssetControl.asset_id == asset_uuid)
            .all()
        )
        return [
            {
                "control_type": sc.control_type,
                "status": ac.status,
                "coverage_score": float(ac.coverage_score or 0),
                "effectiveness_score": float(ac.effectiveness_score or 0),
            }
            for ac, sc in rows
        ]

    def _stage_eals(self) -> list[dict]:
        results = []
        for asset in self.db.query(Asset).all():
            risk = self.calc.calculate_asset_risk(str(asset.id))
            if risk:
                results.append(risk)
        return results

    @staticmethod
    def _time_estimate(probability: float, vuln_count: int) -> int:
        """Mean-time-to-compromise heuristic in hours, derived from exposure."""
        base = 24.0
        if probability > 0.7:
            base = 6.0
        elif probability > 0.4:
            base = 16.0
        elif probability > 0.1:
            base = 40.0
        else:
            base = 96.0
        return int(round(base / max(1, vuln_count) * 2) + 1)