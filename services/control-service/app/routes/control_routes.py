from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from cybercommon.database import get_db
from cybercommon.deps import UserIdentity, get_current_user

from app.services import control_service as cs

router = APIRouter(prefix="/api/controls", tags=["controls"])


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class ControlPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    name: str
    control_type: str = Field(default="TECHNICAL", alias="controlType")
    description: str | None = None
    implementation_cost_inr: float = Field(default=0, alias="implementationCostInr")
    annual_maintenance_inr: float = Field(default=0, alias="annualMaintenanceInr")
    max_risk_reduction: float = Field(default=0, alias="maxRiskReduction")
    implementation_time_days: int = Field(default=30, alias="implementationTimeDays")
    maturity_levels: int = Field(default=3, alias="maturityLevels")


@router.get("")
def list_controls(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    control_type: str | None = None,
    db: Session = Depends(get_db),
):
    return [cs.to_dict(c) for c in cs.list_controls(db, control_type=control_type)]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_control(
    payload: ControlPayload,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    return cs.to_dict(cs.create_control(db, payload.model_dump()))


@router.get("/effectiveness")
def effectiveness(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    asset_id: UUID | None = None,
    db: Session = Depends(get_db),
):
    return cs.effectiveness(db, asset_id=asset_id)


@router.get("/coverage")
def coverage(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    asset_id: UUID | None = None,
    db: Session = Depends(get_db),
):
    return cs.coverage(db, asset_id=asset_id)


@router.get("/asset/{asset_id}")
def asset_controls(
    asset_id: UUID,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    rows = cs.get_asset_controls(db, asset_id)
    return [cs.asset_control_to_dict(ac, c) for ac, c in rows]


@router.get("/{asset_control_id}")
def asset_control_detail(
    asset_control_id: UUID,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ac, c = cs.get_asset_control(db, asset_control_id)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return cs.asset_control_to_dict(ac, c)


@router.put("/{asset_control_id}/status")
def update_status(
    asset_control_id: UUID,
    status: str,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ac, c = cs.update_status(db, asset_control_id, status)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return cs.asset_control_to_dict(ac, c)