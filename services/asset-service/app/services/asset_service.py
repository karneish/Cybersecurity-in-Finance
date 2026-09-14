from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from cybercommon.models import Asset, AssetDependency

from app.services.criticality_service import calculate_criticality


def to_dict(asset: Asset) -> dict:
    return {
        "id": str(asset.id),
        "name": asset.name,
        "assetType": asset.asset_type,
        "environment": asset.environment,
        "owner": asset.owner,
        "department": asset.department,
        "ipAddress": asset.ip_address,
        "operatingSystem": asset.operating_system,
        "businessValueInr": float(asset.business_value_inr or 0),
        "replacementCostInr": float(asset.replacement_cost_inr or 0),
        "internetExposed": bool(asset.internet_exposed),
        "criticalityScore": int(asset.criticality_score or 0),
        "dataSensitivity": asset.data_sensitivity,
        "annualRevenueImpact": float(asset.annual_revenue_impact or 0),
        "metadata": asset.metadata_ or {},
        "sector": asset.sector,
        "region": asset.region,
        "isCriticalInfra": bool(asset.is_critical_infra),
        "classification": asset.classification,
        "createdAt": asset.created_at.isoformat() if asset.created_at else None,
        "updatedAt": asset.updated_at.isoformat() if asset.updated_at else None,
    }


def list_assets(
    db: Session,
    asset_type: str | None = None,
    department: str | None = None,
    internet_exposed: bool | None = None,
    min_criticality: int | None = None,
) -> tuple[list[Asset], int]:
    q = db.query(Asset)
    if asset_type:
        q = q.filter(Asset.asset_type == asset_type)
    if department:
        q = q.filter(Asset.department == department)
    if internet_exposed is not None:
        q = q.filter(Asset.internet_exposed == internet_exposed)
    if min_criticality is not None:
        q = q.filter(Asset.criticality_score >= min_criticality)
    total = q.count()
    assets = q.order_by(Asset.criticality_score.desc()).all()
    return assets, total


def get_asset(db: Session, asset_id: UUID) -> Asset:
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if asset is None:
        raise KeyError("Asset not found")
    return asset


def create_asset(
    db: Session,
    data: dict,
    metadata: dict | None = None,
) -> Asset:
    asset = Asset(
        name=data["name"],
        asset_type=data["asset_type"],
        environment=data.get("environment") or "PRODUCTION",
        owner=data.get("owner"),
        department=data.get("department"),
        ip_address=data.get("ip_address"),
        business_value_inr=data.get("business_value_inr") or 0,
        replacement_cost_inr=data.get("replacement_cost_inr") or 0,
        internet_exposed=bool(data.get("internet_exposed", False)),
        data_sensitivity=data.get("data_sensitivity") or "INTERNAL",
        annual_revenue_impact=data.get("annual_revenue_impact") or 0,
        metadata_=metadata,
    )
    asset.criticality_score = int(calculate_criticality(
        float(asset.business_value_inr or 0),
        float(asset.annual_revenue_impact or 0),
        bool(asset.internet_exposed),
        asset.data_sensitivity or "INTERNAL",
    ) * 10)
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def update_asset(db: Session, asset_id: UUID, data: dict) -> Asset:
    asset = get_asset(db, asset_id)
    for key in (
        "name", "asset_type", "environment", "owner", "department",
        "ip_address", "business_value_inr", "replacement_cost_inr",
        "internet_exposed", "data_sensitivity", "annual_revenue_impact",
    ):
        if key in data:
            setattr(asset, key, data[key])
    asset.criticality_score = int(calculate_criticality(
        float(asset.business_value_inr or 0),
        float(asset.annual_revenue_impact or 0),
        bool(asset.internet_exposed),
        asset.data_sensitivity or "INTERNAL",
    ) * 10)
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(db: Session, asset_id: UUID) -> None:
    asset = get_asset(db, asset_id)
    db.delete(asset)
    db.commit()


def list_dependencies(db: Session, asset_id: UUID) -> list[AssetDependency]:
    return (
        db.query(AssetDependency)
        .filter(AssetDependency.asset_id == asset_id)
        .all()
    )


def add_dependency(
    db: Session,
    asset_id: UUID,
    depends_on_id: UUID,
    dependency_type: str,
    criticality: int = 50,
) -> AssetDependency:
    get_asset(db, asset_id)
    get_asset(db, depends_on_id)
    dep = AssetDependency(
        asset_id=asset_id,
        depends_on_id=depends_on_id,
        dependency_type=dependency_type,
        criticality=criticality,
    )
    db.add(dep)
    db.commit()
    db.refresh(dep)
    return dep


def get_criticality(db: Session, asset_id: UUID) -> dict:
    asset = get_asset(db, asset_id)
    return {
        "assetId": str(asset.id),
        "assetName": asset.name,
        "criticalityScore": int(asset.criticality_score or 0),
    }


def get_stats(db: Session) -> dict:
    from sqlalchemy import func

    total = db.query(func.count(Asset.id)).scalar() or 0
    by_type_rows = (
        db.query(Asset.asset_type, func.count(Asset.id))
        .group_by(Asset.asset_type)
        .all()
    )
    exposed = db.query(func.count(Asset.id)).filter(Asset.internet_exposed.is_(True)).scalar() or 0
    avg_crit = db.query(func.avg(Asset.criticality_score)).scalar() or 0
    return {
        "totalAssets": total,
        "internetExposed": exposed,
        "averageCriticality": round(float(avg_crit), 2),
        "byType": {t: c for t, c in by_type_rows},
    }