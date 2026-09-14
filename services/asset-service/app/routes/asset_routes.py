from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from cybercommon.database import get_db
from cybercommon.deps import UserIdentity, get_current_user

from app.services import asset_service

router = APIRouter(prefix="/api/assets", tags=["assets"])


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class AssetPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    name: str
    asset_type: str = Field(alias="assetType")
    environment: str = "PRODUCTION"
    owner: str | None = None
    department: str | None = None
    ip_address: str | None = Field(default=None, alias="ipAddress")
    operating_system: str | None = Field(default=None, alias="operatingSystem")
    business_value_inr: float = Field(default=0, alias="businessValueInr")
    replacement_cost_inr: float = Field(default=0, alias="replacementCostInr")
    internet_exposed: bool = Field(default=False, alias="internetExposed")
    data_sensitivity: str = Field(default="INTERNAL", alias="dataSensitivity")
    annual_revenue_impact: float = Field(default=0, alias="annualRevenueImpact")
    metadata: dict | None = None


class DependencyPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    depends_on_id: UUID = Field(alias="dependsOnId")
    dependency_type: str = Field(alias="dependencyType")
    criticality: int = 50


@router.get("")
def list_assets(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    asset_type: Optional[str] = None,
    department: Optional[str] = None,
    internet_exposed: Optional[bool] = None,
    min_criticality: Optional[int] = None,
    db: Session = Depends(get_db),
):
    assets, total = asset_service.list_assets(
        db,
        asset_type=asset_type,
        department=department,
        internet_exposed=internet_exposed,
        min_criticality=min_criticality,
    )
    return {"data": [asset_service.to_dict(a) for a in assets], "total": total}


@router.get("/stats")
def asset_stats(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    return asset_service.get_stats(db)


@router.get("/criticality/{asset_id}")
def criticality(
    asset_id: UUID,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        return asset_service.get_criticality(db, asset_id)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.post("", status_code=status.HTTP_201_CREATED)
def create_asset(
    payload: AssetPayload,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    asset = asset_service.create_asset(db, payload.model_dump(), metadata=payload.metadata)
    return asset_service.to_dict(asset)


@router.get("/{asset_id}")
def get_asset(
    asset_id: UUID,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        return asset_service.to_dict(asset_service.get_asset(db, asset_id))
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.put("/{asset_id}")
def update_asset(
    asset_id: UUID,
    payload: AssetPayload,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    data.pop("metadata", None)
    try:
        asset = asset_service.update_asset(db, asset_id, data)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return asset_service.to_dict(asset)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: UUID,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        asset_service.delete_asset(db, asset_id)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))


@router.get("/{asset_id}/dependencies")
def list_dependencies(
    asset_id: UUID,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    deps = asset_service.list_dependencies(db, asset_id)
    return [
        {
            "id": str(d.id),
            "assetId": str(d.asset_id),
            "dependsOnId": str(d.depends_on_id),
            "dependencyType": d.dependency_type,
            "criticality": d.criticality,
        }
        for d in deps
    ]


@router.post("/{asset_id}/dependencies", status_code=status.HTTP_201_CREATED)
def add_dependency(
    asset_id: UUID,
    payload: DependencyPayload,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        dep = asset_service.add_dependency(
            db, asset_id, payload.depends_on_id, payload.dependency_type, payload.criticality
        )
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return {
        "id": str(dep.id),
        "assetId": str(dep.asset_id),
        "dependsOnId": str(dep.depends_on_id),
        "dependencyType": dep.dependency_type,
        "criticality": dep.criticality,
    }