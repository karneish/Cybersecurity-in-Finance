from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from cybercommon.database import get_db
from cybercommon.deps import UserIdentity, get_current_user

from app.services import ingestion_service as svc

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"])


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


class IngestionRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    event_type: str = Field(alias="eventType")
    source: str
    source_asset: UUID | None = Field(default=None, alias="sourceAsset")
    details: dict | None = None


class VulnerabilitySimRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str | None = Field(default=None, alias="assetId")
    cvss: float = 8.0
    cve_id: str | None = Field(default=None, alias="cveId")
    title: str | None = None


class RemediateSimRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str = Field(alias="assetId")
    cve_id: str | None = Field(default=None, alias="cveId")


class ControlSimRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str = Field(alias="assetId")
    control_type: str = Field(alias="controlType")
    status: str


class ToggleRequest(BaseModel):
    enabled: bool | None = None
    interval_sec: int | None = Field(default=None, alias="intervalSec")


@router.post("/vulnerability", status_code=status.HTTP_201_CREATED)
def ingest_vulnerability(
    payload: IngestionRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ev = svc.ingest(db, payload.event_type, payload.source, payload.source_asset, payload.details)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return svc.event_to_dict(ev)


@router.post("/control", status_code=status.HTTP_201_CREATED)
def ingest_control(
    payload: IngestionRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ev = svc.ingest(db, payload.event_type, payload.source, payload.source_asset, payload.details)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return svc.event_to_dict(ev)


@router.post("/asset", status_code=status.HTTP_201_CREATED)
def ingest_asset(
    payload: IngestionRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ev = svc.ingest(db, payload.event_type, payload.source, payload.source_asset, payload.details)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return svc.event_to_dict(ev)


@router.post("/batch", status_code=status.HTTP_201_CREATED)
def ingest_batch(
    payload: list[IngestionRequest],
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        events = svc.ingest_batch(db, [p.model_dump() for p in payload])
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return [svc.event_to_dict(e) for e in events]


@router.get("/events")
def list_events(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    page: int = 0,
    size: int = 50,
    db: Session = Depends(get_db),
):
    return [svc.event_to_dict(e) for e in svc.get_events(db, max(page, 0), min(max(size, 1), 200))]


@router.get("/stats")
def stats(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    return svc.get_stats(db)


@router.post("/simulate", status_code=status.HTTP_201_CREATED)
def simulate(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
    count: int = 10,
):
    return [svc.event_to_dict(e) for e in svc.simulate_events(db, min(max(count, 1), 200))]


@router.post("/simulate/vulnerability", status_code=status.HTTP_201_CREATED)
def simulate_vulnerability(
    payload: VulnerabilitySimRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ev = svc.simulate_vulnerability(db, payload.asset_id, payload.cvss, payload.cve_id, payload.title)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return svc.event_to_dict(ev)


@router.post("/simulate/remediate", status_code=status.HTTP_201_CREATED)
def simulate_remediate(
    payload: RemediateSimRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ev = svc.remediate_vulnerability(db, payload.asset_id, payload.cve_id)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return svc.event_to_dict(ev)


@router.post("/simulate/control", status_code=status.HTTP_201_CREATED)
def simulate_control(
    payload: ControlSimRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        ev = svc.change_control(db, payload.asset_id, payload.control_type, payload.status)
    except KeyError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    return svc.event_to_dict(ev)


# ─── event replay ──────────────────────────────────────────────
@router.post("/replay", status_code=status.HTTP_202_ACCEPTED)
def replay(
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
    count: int = 10,
    event_type: str | None = None,
    interval_sec: float = 1.0,
    background: bool = True,
):
    job = svc.replay_events(db, min(max(count, 1), 500), event_type, interval_sec, background)
    return job


@router.get("/replay/jobs")
def replay_jobs(identity: Annotated[UserIdentity, Depends(get_current_user)]):
    return svc.get_replay_jobs()


# ─── live simulated connectors ─────────────────────────────────
@router.get("/connectors")
def connectors(identity: Annotated[UserIdentity, Depends(get_current_user)]):
    from cybercommon.redis import redis_client

    records = redis_client().hgetall("ingestion.connector.records") or {}
    conns = svc.get_connectors()
    for c in conns:
        c["recordsEmitted"] = int(records.get(c["source"], 0))
    return conns


@router.post("/connectors/{name}/toggle")
def toggle_connector(
    name: str,
    payload: ToggleRequest,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
):
    try:
        return svc.set_connector(name, enabled=payload.enabled, interval_sec=payload.interval_sec)
    except KeyError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown connector")


@router.post("/connectors/{name}/trigger", status_code=status.HTTP_202_ACCEPTED)
def trigger_connector(
    name: str,
    identity: Annotated[UserIdentity, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    try:
        return svc.trigger_connector(db, name)
    except KeyError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown connector")