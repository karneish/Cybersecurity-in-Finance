"""National cyber exercise (drill) engine.

Each template models the *adversarial* impact of a scenario as asset-state
changes (e.g. worm lateral movement exposes internal assets), which are pushed
through the existing ScenarioSimulator so the EAL surge uses the same
probability/impact math as every other calculation. Results are persisted to
gov.exercises and committed to the tamper-evident audit chain.
"""
import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.gov import Agency, Exercise, AssetVendor
from app.core.scenario_engine import ScenarioSimulator
from app.core.audit_chain import AuditChain

TEMPLATES = {
    "WORM": {
        "name": "WannaCry-Class Worm",
        "description": "Self-propagating worm spreads across the network via lateral movement.",
        "actions": ["internet_exposed: True", "criticality_score: +20"],
    },
    "RANSOMWARE": {
        "name": "Ransomware Surge",
        "description": "Wide ransomware detonation encrypting systems and inflating recovery costs.",
        "actions": ["internet_exposed: True", "business_value_inr: x1.40", "data_sensitivity: RESTRICTED"],
    },
    "SUPPLY_CHAIN": {
        "name": "Supply Chain Compromise",
        "description": "A trusted vendor is compromised and used to pivot into client systems.",
        "actions": ["internet_exposed: True", "criticality_score: +15"],
        "requires_vendor": True,
    },
    "DDOS": {
        "name": "Distributed DoS Campaign",
        "description": "Sustained volumetric attack degrading service availability and revenue.",
        "actions": ["internet_exposed: True", "annual_revenue_impact: x1.50"],
    },
}


class DrillEngine:
    """Builds adversarial drill changes → reuses ScenarioSimulator → persists."""

    def __init__(self, db: Session):
        self.db = db
        self.simulator = ScenarioSimulator(db)

    def _scoped_assets(self, impact_scope: str, sector=None, region=None,
                       agency_id=None, vendor_id=None) -> list[Asset]:
        query = self.db.query(Asset)
        if impact_scope == "SECTOR" and sector:
            query = query.filter(Asset.sector == sector)
        elif impact_scope == "REGION" and region:
            query = query.filter(Asset.region == region)
        elif impact_scope == "AGENCY" and agency_id:
            query = query.filter(Asset.agency_id == agency_id)
        elif impact_scope == "VENDOR" and vendor_id:
            linked = [
                av.asset_id for av in
                self.db.query(AssetVendor).filter(AssetVendor.vendor_id == vendor_id).all()
            ]
            if not linked:
                return []
            query = query.filter(Asset.id.in_(linked))
        return query.all()

    def _build_changes(self, template: dict, assets: list[Asset]) -> list[dict]:
        changes = []
        for asset in assets:
            fields = {}
            if "internet_exposed" in template.get("actions", []):
                fields["internet_exposed"] = True
            if "criticality_score: +20" in template.get("actions", []):
                fields["criticality_score"] = min((asset.criticality_score or 0) + 20, 100)
            if "criticality_score: +15" in template.get("actions", []):
                fields["criticality_score"] = min((asset.criticality_score or 0) + 15, 100)
            if "business_value_inr: x1.40" in template.get("actions", []):
                fields["business_value_inr"] = float(asset.business_value_inr or 0) * 1.40
            if "annual_revenue_impact: x1.50" in template.get("actions", []):
                fields["annual_revenue_impact"] = float(asset.annual_revenue_impact or 0) * 1.50
            if "data_sensitivity: RESTRICTED" in template.get("actions", []):
                fields["data_sensitivity"] = "RESTRICTED"
            if fields:
                changes.append({
                    "type": "modify_asset",
                    "asset_id": str(asset.id),
                    "field": list(fields.keys())[0],
                    "value": list(fields.values())[0],
                })
                for k in list(fields.keys())[1:]:
                    changes.append({
                        "type": "modify_asset",
                        "asset_id": str(asset.id),
                        "field": k,
                        "value": fields[k],
                    })
        return changes

    def run(self, name: str, scenario_key: str, impact_scope: str = "SECTOR",
            sector: str | None = None, region: str | None = None,
            agency_id: str | None = None, vendor_id: str | None = None,
            actor: str | None = "SCRO_REGULATOR") -> dict:
        template = TEMPLATES.get(scenario_key)
        if template is None:
            return {"error": f"Unknown scenario_key {scenario_key}. "
                             f"Valid: {', '.join(TEMPLATES)}"}
        if template.get("requires_vendor") and not vendor_id:
            return {"error": "SUPPLY_CHAIN drill requires vendor_id"}

        assets = self._scoped_assets(impact_scope, sector, region, agency_id, vendor_id)
        if not assets:
            return {"error": "No assets in the requested drill scope"}

        changes = self._build_changes(template, assets)
        result = self.simulator.simulate(changes)

        # Scope the baseline/simulated EAL to the drill scope: the simulator
        # returns enterprise-wide totals, but a SECTOR/REGION/AGENCY/VENDOR drill
        # must report the before/after loss for the assets actually in scope.
        scoped_ids = {str(a.id) for a in assets}
        baseline = 0.0
        simulated = 0.0
        for row in result.get("asset_changes", []):
            if row.get("asset_id") in scoped_ids:
                baseline += float(row.get("original_eal", 0) or 0)
                simulated += float(row.get("simulated_eal", 0) or 0)
        if baseline <= 0:
            baseline = float(result["current_eal"])
            simulated = float(result["simulated_eal"])

        surge = simulated - baseline
        surge_pct = (surge / baseline * 100) if baseline > 0 else 0.0

        exercise = Exercise(
            id=uuid.uuid4(),
            name=name,
            scenario_key=scenario_key,
            impact_scope=impact_scope,
            sector=sector,
            region=region,
            baseline_eal=round(baseline, 2),
            simulated_eal=round(simulated, 2),
            eal_reduction=round(surge, 2),
            eal_reduction_percent=round(surge_pct, 2),
            status="COMPLETED",
            executed_at=datetime.utcnow(),
        )
        self.db.add(exercise)
        self.db.commit()
        self.db.refresh(exercise)

        chain = AuditChain(self.db)
        chain.commit(
            action="DRILL_RUN",
            payload={
                "exercise_id": str(exercise.id),
                "name": name,
                "scenario_key": scenario_key,
                "impact_scope": impact_scope,
                "sector": sector,
                "region": region,
                "agency_id": agency_id,
                "vendor_id": vendor_id,
                "assets_in_scope": len(assets),
                "baseline_eal": round(baseline, 2),
                "simulated_eal": round(simulated, 2),
                "projected_surge": round(surge, 2),
                "projected_surge_percent": round(surge_pct, 2),
            },
            actor=actor,
        )

        return {
            "exercise_id": str(exercise.id),
            "name": name,
            "scenario_key": scenario_key,
            "impact_scope": impact_scope,
            "sector": sector,
            "region": region,
            "vendor_id": vendor_id,
            "assets_in_scope": len(assets),
            "baseline_eal": round(baseline, 2),
            "simulated_eal": round(simulated, 2),
            "projected_surge": round(surge, 2),
            "projected_surge_percent": round(surge_pct, 2),
            "status": "COMPLETED",
            "simulation": result,
            "templates": TEMPLATES,
        }

    def rerun(self, exercise_id: str, actor: str = "SCRO_REGULATOR") -> dict:
        """Re-execute a past exercise with the same template and scope.

        Instead of mutating history, a new gov.exercises row is persisted and a
        fresh AUDIT-DRILL_RERUN entry is chained, so every run is tamper-evident.
        """
        exercise = self.db.query(Exercise).filter(Exercise.id == exercise_id).first()
        if not exercise:
            return {"error": f"Exercise {exercise_id} not found"}

        return self.run(
            name=f"{exercise.name} (rerun)",
            scenario_key=exercise.scenario_key,
            impact_scope=exercise.impact_scope or "NATIONAL",
            sector=exercise.sector,
            region=exercise.region,
            actor=actor,
        )

    def list_exercises(self) -> list[dict]:
        rows = self.db.query(Exercise).order_by(Exercise.executed_at.desc()).all()
        return [
            {
                "id": str(e.id),
                "name": e.name,
                "scenario_key": e.scenario_key,
                "impact_scope": e.impact_scope,
                "sector": e.sector,
                "region": e.region,
                "baseline_eal": float(e.baseline_eal) if e.baseline_eal else 0,
                "simulated_eal": float(e.simulated_eal) if e.simulated_eal else 0,
                "eal_reduction": float(e.eal_reduction) if e.eal_reduction else 0,
                "eal_reduction_percent": float(e.eal_reduction_percent) if e.eal_reduction_percent else 0,
                "status": e.status,
                "executed_at": e.executed_at.isoformat() if e.executed_at else None,
            }
            for e in rows
        ]

    def agencies(self) -> list[dict]:
        return [
            {"id": str(a.id), "name": a.name, "sector": a.sector, "region": a.region}
            for a in self.db.query(Agency).order_by(Agency.name).all()
        ]