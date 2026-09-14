from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from cybercommon.models import AssetControl, SecurityControl

IMPLEMENTED_STATUSES = ("IMPLEMENTED", "VERIFIED")


def to_dict(control: SecurityControl) -> dict:
    return {
        "id": str(control.id),
        "name": control.name,
        "controlType": control.control_type,
        "description": control.description,
        "implementationCostInr": float(control.implementation_cost_inr or 0),
        "annualMaintenanceInr": float(control.annual_maintenance_inr or 0),
        "maxRiskReduction": float(control.max_risk_reduction or 0),
        "implementationTimeDays": control.implementation_time_days,
        "maturityLevels": control.maturity_levels,
    }


def asset_control_to_dict(ac: AssetControl, control: SecurityControl | None = None) -> dict:
    return {
        "id": str(ac.id),
        "assetId": str(ac.asset_id) if ac.asset_id else None,
        "controlId": str(ac.control_id) if ac.control_id else None,
        "controlName": control.name if control else None,
        "controlType": control.control_type if control else None,
        "status": ac.status,
        "coverageScore": float(ac.coverage_score or 0),
        "effectivenessScore": float(ac.effectiveness_score or 0),
        "maturityLevel": ac.maturity_level,
        "implementedAt": ac.implemented_at.isoformat() if ac.implemented_at else None,
        "lastVerifiedAt": ac.last_verified_at.isoformat() if ac.last_verified_at else None,
    }


def list_controls(db: Session, control_type: str | None = None) -> list[SecurityControl]:
    q = db.query(SecurityControl)
    if control_type:
        q = q.filter(SecurityControl.control_type == control_type)
    return q.order_by(SecurityControl.name).all()


def get_control(db: Session, control_id: UUID) -> SecurityControl:
    c = db.query(SecurityControl).filter(SecurityControl.id == control_id).first()
    if c is None:
        raise KeyError("Control not found")
    return c


def create_control(db: Session, data: dict) -> SecurityControl:
    control = SecurityControl(
        name=data["name"],
        control_type=data.get("control_type") or "TECHNICAL",
        description=data.get("description"),
        implementation_cost_inr=data.get("implementation_cost_inr") or 0,
        annual_maintenance_inr=data.get("annual_maintenance_inr") or 0,
        max_risk_reduction=data.get("max_risk_reduction") or 0,
        implementation_time_days=data.get("implementation_time_days") or 30,
        maturity_levels=data.get("maturity_levels") or 3,
    )
    db.add(control)
    db.commit()
    db.refresh(control)
    return control


def get_asset_controls(db: Session, asset_id: UUID) -> list[tuple[AssetControl, SecurityControl]]:
    rows = (
        db.query(AssetControl, SecurityControl)
        .join(SecurityControl, SecurityControl.id == AssetControl.control_id, isouter=True)
        .filter(AssetControl.asset_id == asset_id)
        .order_by(SecurityControl.name)
        .all()
    )
    return [(ac, c) for ac, c in rows]


def get_asset_control(db: Session, asset_control_id: UUID) -> tuple[AssetControl, SecurityControl | None]:
    ac = db.query(AssetControl).filter(AssetControl.id == asset_control_id).first()
    if ac is None:
        raise KeyError("Asset control not found")
    control = db.query(SecurityControl).filter(SecurityControl.id == ac.control_id).first()
    return ac, control


def update_status(db: Session, asset_control_id: UUID, status_: str) -> tuple[AssetControl, SecurityControl | None]:
    ac, control = get_asset_control(db, asset_control_id)
    old = ac.status
    ac.status = status_
    if status_ in IMPLEMENTED_STATUSES and old not in IMPLEMENTED_STATUSES:
        ac.implemented_at = datetime.utcnow()
    if status_ == "VERIFIED":
        ac.last_verified_at = datetime.utcnow()
    if status_ == "IMPLEMENTED":
        ac.maturity_level = max(ac.maturity_level or 1, control.maturity_levels or 3)
    db.commit()
    db.refresh(ac)
    return ac, control


def effectiveness(db: Session, asset_id: UUID | None = None) -> dict:
    query = db.query(AssetControl)
    if asset_id:
        query = query.filter(AssetControl.asset_id == asset_id)
    rows = query.all()
    total = len(rows)
    implemented = [
        ac for ac in rows
        if (ac.status or "").upper() in IMPLEMENTED_STATUSES
    ]
    implemented_ver = [ac for ac in rows if (ac.status or "").upper() == "VERIFIED"]
    avg_eff = (
        sum(float(ac.effectiveness_score or 0) for ac in rows) / total
        if total else 0.0
    )
    avg_mat = (
        sum(int(ac.maturity_level or 0) for ac in rows) / total
        if total else 0.0
    )
    return {
        "assetId": str(asset_id) if asset_id else None,
        "overallEffectiveness": round(avg_eff, 4),
        "overallCoverage": round(len(implemented) / total, 4) if total else 0.0,
        "controlsImplemented": len(implemented),
        "controlsVerified": len(implemented_ver),
        "controlsTotal": total,
        "averageMaturityLevel": round(avg_mat, 2),
    }


def coverage(db: Session, asset_id: UUID | None = None) -> dict:
    query = db.query(AssetControl)
    if asset_id:
        query = query.filter(AssetControl.asset_id == asset_id)
    rows = query.all()
    total = len(rows)
    implemented = sum(1 for ac in rows if (ac.status or "").upper() in IMPLEMENTED_STATUSES)
    return {
        "assetId": str(asset_id) if asset_id else None,
        "coverage": round(implemented / total, 4) if total else 0.0,
        "implemented": implemented,
        "total": total,
        "gap": total - implemented,
    }