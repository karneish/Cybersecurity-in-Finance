import json
import logging
import random
import threading
import time
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from cybercommon.models import Asset, SecurityEvent
from cybercommon.redis import redis_client

logger = logging.getLogger("ingestion-service")

EVENT_TYPES = {
    "VULNERABILITY_DETECTED",
    "VULNERABILITY_UPDATED",
    "VULNERABILITY_REMEDIATED",
    "CONTROL_STATUS_CHANGED",
    "ASSET_CREATED",
    "ASSET_MODIFIED",
}

CHANNEL_BY_TYPE = {
    "VULNERABILITY_DETECTED": "security.events.vulnerability",
    "VULNERABILITY_UPDATED": "security.events.vulnerability",
    "VULNERABILITY_REMEDIATED": "security.events.vulnerability",
    "CONTROL_STATUS_CHANGED": "security.events.control",
    "ASSET_CREATED": "security.events.asset",
    "ASSET_MODIFIED": "security.events.asset",
}


def normalize(event_type: str | None, source: str | None) -> str:
    et = (event_type or "").upper()
    if et not in EVENT_TYPES:
        raise ValueError(f"Unsupported event type: {event_type}")
    if not source:
        raise ValueError("Event source is required")
    return et


def dispatch(event: SecurityEvent) -> None:
    channel = CHANNEL_BY_TYPE.get(event.event_type, "security.events.default")
    client = redis_client()
    client.publish(channel, json.dumps({
        "id": str(event.id),
        "eventType": event.event_type,
        "sourceAsset": str(event.source_asset) if event.source_asset else None,
        "source": event.source,
        "details": json.loads(event.details) if event.details else {},
        "timestamp": event.timestamp.isoformat() if event.timestamp else None,
        "processed": event.processed,
    }, default=str))


def ingest(db: Session, event_type: str, source: str, source_asset: uuid.UUID | None,
           details: dict | None) -> SecurityEvent:
    et = normalize(event_type, source)
    event = SecurityEvent(
        event_type=et,
        source_asset=source_asset,
        source=source,
        details=json.dumps(details or {}),
        timestamp=datetime.now(timezone.utc),
        processed=True,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    dispatch(event)
    return event


def ingest_batch(db: Session, requests: list[dict]) -> list[SecurityEvent]:
    events = []
    for req in requests:
        events.append(ingest(
            db,
            req["event_type"],
            req["source"],
            uuid.UUID(req["source_asset"]) if req.get("source_asset") else None,
            req.get("details"),
        ))
    return events


def get_events(db: Session, page: int, size: int) -> list[SecurityEvent]:
    return (
        db.query(SecurityEvent)
        .order_by(SecurityEvent.timestamp.desc())
        .offset(page * size)
        .limit(size)
        .all()
    )


def get_stats(db: Session) -> dict:
    from sqlalchemy import func

    total = db.query(func.count(SecurityEvent.id)).scalar() or 0
    by_type = dict(
        db.query(SecurityEvent.event_type, func.count(SecurityEvent.id))
        .group_by(SecurityEvent.event_type)
        .all()
    )
    by_source = dict(
        db.query(SecurityEvent.source, func.count(SecurityEvent.id))
        .group_by(SecurityEvent.source)
        .all()
    )
    return {
        "totalEvents": total,
        "byType": by_type,
        "bySource": by_source,
        "simulated": sum(1 for k in by_source if any(s in k.upper() for s in ("SIM", "SIEM", "EDR", "IAM", "CSPM", "NESSUS"))),
    }


# ─── simulation ────────────────────────────────────────────────
def random_asset(db: Session) -> Asset | None:
    assets = db.query(Asset).limit(200).all()
    return random.choice(assets) if assets else None


def simulate_vulnerability(db: Session, asset_id: str | None, cvss: float,
                           cve_id: str | None, title: str | None) -> SecurityEvent:
    asset = None
    if asset_id:
        asset = db.query(Asset).filter(Asset.id == uuid.UUID(asset_id)).first()
    else:
        asset = random_asset(db)
    if asset is None:
        raise KeyError("No assets available for simulation")
    cvss = float(cvss or round(random.choice([3.1, 5.4, 6.5, 7.8, 9.2]), 1))
    details = {
        "cve_id": cve_id or f"CVE-2024-{random.randint(1000, 9999)}",
        "cvss_score": cvss,
        "severity": "CRITICAL" if cvss >= 9 else "HIGH" if cvss >= 7 else "MEDIUM" if cvss >= 4 else "LOW",
        "title": title or f"Simulated vulnerability (CVSS {cvss})",
        "exploitability": min(cvss, 10.0),
        "internet_exposed": asset.internet_exposed,
    }
    return ingest(db, "VULNERABILITY_DETECTED", "SIMULATOR", asset.id, details)


def remediate_vulnerability(db: Session, asset_id: str, cve_id: str) -> SecurityEvent:
    from cybercommon.models import Vulnerability

    asset = db.query(Asset).filter(Asset.id == uuid.UUID(asset_id)).first()
    if asset is None:
        raise KeyError("Asset not found")
    q = db.query(Vulnerability).filter(
        Vulnerability.affected_asset == asset.id,
        Vulnerability.status.in_(["OPEN", "IN_PROGRESS"]),
    )
    if cve_id:
        q = q.filter(Vulnerability.cve_id == cve_id)
    vuln = q.order_by(Vulnerability.discovered_at.desc()).first()
    if vuln is None:
        raise KeyError("No matching open vulnerability to remediate")
    vuln.status = "REMEDIATED"
    vuln.remediated_at = datetime.now(timezone.utc)
    db.commit()
    return ingest(db, "VULNERABILITY_REMEDIATED", "SIMULATOR", asset.id,
                  {"cve_id": vuln.cve_id, "title": vuln.title})


def change_control(db: Session, asset_id: str, control_type: str, status: str) -> SecurityEvent:
    asset = db.query(Asset).filter(Asset.id == uuid.UUID(asset_id)).first()
    if asset is None:
        raise KeyError("Asset not found")
    return ingest(db, "CONTROL_STATUS_CHANGED", "SIMULATOR", asset.id, {
        "control_type": control_type,
        "status": status,
    })


def simulate_events(db: Session, count: int) -> list[SecurityEvent]:
    events = []
    for _ in range(count):
        events.append(simulate_vulnerability(db, None, None, None, None))
    return events


def event_to_dict(event: SecurityEvent) -> dict:
    return {
        "id": str(event.id),
        "eventType": event.event_type,
        "sourceAsset": str(event.source_asset) if event.source_asset else None,
        "source": event.source,
        "details": json.loads(event.details) if event.details else {},
        "timestamp": event.timestamp.isoformat() if event.timestamp else None,
        "processed": bool(event.processed),
        "createdAt": event.created_at.isoformat() if event.created_at else None,
    }


# ─── replay ────────────────────────────────────────────────────
REPLAY_JOBS_KEY = "ingestion.replay.jobs"
CONNECTOR_STATE_KEY = "ingestion.connector.{name}"


def replay_events(db: Session, count: int, event_type: str | None,
                  interval_sec: float = 1.0, background: bool = True) -> dict:
    q = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc())
    if event_type:
        q = q.filter(SecurityEvent.event_type == event_type.upper())
    events = q.limit(count).all()
    events.reverse()  # replay oldest → newest
    client = redis_client()
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "count": len(events),
        "eventType": event_type,
        "intervalSec": interval_sec,
        "status": "QUEUED",
        "startedAt": datetime.now(timezone.utc).isoformat(),
    }
    client.hset(REPLAY_JOBS_KEY, job_id, json.dumps(job))

    if background:
        threading.Thread(
            target=_run_replay_job, args=(job_id, [e.id.hex for e in events], interval_sec), daemon=True
        ).start()
    else:
        _publish_ids(events)
        job["status"] = "COMPLETED"
        client.hset(REPLAY_JOBS_KEY, job_id, json.dumps(job))
    return job


def _run_replay_job(job_id: str, event_ids: list[str], interval_sec: float) -> None:
    client = redis_client()
    for eid in event_ids:
        payload = client.get(f"ingestion.event.{eid}")
        if payload:
            channel = "security.events.default"
            try:
                data = json.loads(payload)
                channel = CHANNEL_BY_TYPE.get(data.get("eventType"), channel)
            except Exception:
                pass
            client.publish(channel, payload)
        time.sleep(interval_sec)
    job = json.loads(client.hget(REPLAY_JOBS_KEY, job_id) or "{}")
    job["status"] = "COMPLETED"
    client.hset(REPLAY_JOBS_KEY, job_id, json.dumps(job))


def _publish_ids(events: list[SecurityEvent]) -> None:
    client = redis_client()
    for ev in events:
        channel = CHANNEL_BY_TYPE.get(ev.event_type, "security.events.default")
        client.publish(channel, json.dumps({
            "id": str(ev.id),
            "eventType": ev.event_type,
            "sourceAsset": str(ev.source_asset) if ev.source_asset else None,
            "source": ev.source,
            "details": json.loads(ev.details) if ev.details else {},
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
        }, default=str))


def get_replay_jobs() -> list[dict]:
    client = redis_client()
    raw = client.hgetall(REPLAY_JOBS_KEY) or {}
    jobs = [json.loads(v) for v in raw.values()]
    jobs.sort(key=lambda j: j.get("startedAt", ""), reverse=True)
    return jobs


# ─── live simulated connectors ────────────────────────────────
CONNECTOR_CATALOG = [
    {"name": "SIEM", "type": "SIEM", "source": "SPLUNK", "interval_sec": 30, "enabled": True},
    {"name": "EDR", "type": "EDR", "source": "CROWDSTRIKE", "interval_sec": 45, "enabled": True},
    {"name": "IAM", "type": "IAM", "source": "OKTA", "interval_sec": 60, "enabled": True},
    {"name": "CSPM", "type": "CSPM", "source": "PRISMA_CLOUD", "interval_sec": 75, "enabled": True},
    {"name": "NETWORK", "type": "NIDS", "source": "ZEK_SENSOR", "interval_sec": 90, "enabled": True},
]

CONTROL_STATUSES = ["PLANNED", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED"]
CONTROL_TYPES = ["MFA", "PATCH_MANAGEMENT", "ENDPOINT_PROTECTION", "NETWORK_SEGMENTATION",
                 "ACCESS_CONTROL", "SIEM_MONITORING", "ENCRYPTION", "BACKUP_RECOVERY"]


def emit_connector_event(db: Session, connector: dict) -> dict:
    """Generate one realistic event for a simulated live connector."""
    kind = connector["name"]
    source = connector["source"]
    asset = random_asset(db)
    if asset is None:
        return {"connector": kind, "emitted": False, "reason": "no assets"}
    if kind == "SIEM":
        ev = ingest(db, "VULNERABILITY_DETECTED", source, asset.id, {
            "title": "SIEM correlation: suspicious outbound beaconing observed",
            "cvss_score": round(random.uniform(5.0, 9.5), 1),
            "exploitability": round(random.uniform(3.0, 9.0), 1),
            "source_finding": "correlation_rule_42",
        })
    elif kind == "EDR":
        ev = ingest(db, "VULNERABILITY_DETECTED", source, asset.id, {
            "title": "EDR telemetry: vulnerable driver detected",
            "cvss_score": round(random.uniform(4.0, 9.0), 1),
            "exploitability": round(random.uniform(2.0, 8.0), 1),
        })
    elif kind == "IAM":
        ctrl_type = random.choice(["MFA", "ACCESS_CONTROL"])
        status = random.choice(["IN_PROGRESS", "IMPLEMENTED", "VERIFIED"])
        ev = ingest(db, "CONTROL_STATUS_CHANGED", source, asset.id, {
            "control_type": ctrl_type,
            "status": status,
            "note": "IAM lifecycle policy drift detected",
        })
    elif kind == "CSPM":
        ev = ingest(db, "VULNERABILITY_DETECTED", source, asset.id, {
            "title": "CSPM finding: cloud security group overly permissive",
            "cvss_score": round(random.uniform(6.0, 9.8), 1),
            "exploitability": round(random.uniform(4.0, 9.5), 1),
        })
    else:  # NETWORK / NIDS
        action = random.choice(["VULNERABILITY_DETECTED", "CONTROL_STATUS_CHANGED"])
        if action == "VULNERABILITY_DETECTED":
            ev = ingest(db, action, source, asset.id, {
                "title": "NIDS alert: protocol anomaly on internal segment",
                "cvss_score": round(random.uniform(4.0, 8.5), 1),
                "exploitability": round(random.uniform(2.0, 7.0), 1),
            })
        else:
            ev = ingest(db, action, source, asset.id, {
                "control_type": random.choice(CONTROL_TYPES),
                "status": random.choice(CONTROL_STATUSES),
            })
    _record_connector_emit(source)
    _mark_last_emit(kind)
    return {"connector": kind, "emitted": True, "eventId": str(ev.id)}


def _record_connector_emit(source: str) -> None:
    redis_client().hincrby("ingestion.connector.records", source, 1)


def _mark_last_emit(name: str) -> None:
    client = redis_client()
    state = get_connector_state(name)
    if state:
        state["last_emit"] = datetime.now(timezone.utc).isoformat()
        client.set(CONNECTOR_STATE_KEY.format(name=name), json.dumps(state))


def get_connectors() -> list[dict]:
    client = redis_client()
    out = []
    for c in CONNECTOR_CATALOG:
        state = client.get(CONNECTOR_STATE_KEY.format(name=c["name"]))
        cfg = json.loads(state) if state else {"enabled": c["enabled"], "interval_sec": c["interval_sec"], "last_emit": None}
        out.append({
            "name": c["name"],
            "type": c["type"],
            "source": c["source"],
            "enabled": bool(cfg.get("enabled", True)),
            "intervalSec": cfg.get("interval_sec", c["interval_sec"]),
            "lastEmitAt": cfg.get("last_emit"),
        })
    return out


def set_connector(name: str, enabled: bool | None = None, interval_sec: int | None = None) -> dict:
    cfg = get_connector_state(name)
    if enabled is not None:
        cfg["enabled"] = enabled
    if interval_sec is not None:
        cfg["interval_sec"] = max(5, interval_sec)
    client = redis_client()
    client.set(CONNECTOR_STATE_KEY.format(name=name), json.dumps(cfg))
    return get_connector_state(name)


def trigger_connector(db: Session, name: str) -> dict:
    connector = next((c for c in CONNECTOR_CATALOG if c["name"] == name), None)
    if connector is None:
        raise KeyError("Unknown connector")
    return emit_connector_event(db, connector)


def get_connector_state(name: str) -> dict:
    client = redis_client()
    c = next((x for x in CONNECTOR_CATALOG if x["name"] == name), None)
    if c is None:
        return {}
    raw = client.get(CONNECTOR_STATE_KEY.format(name=name))
    return json.loads(raw) if raw else {"enabled": c["enabled"], "interval_sec": c["interval_sec"], "last_emit": None}


class ConnectorRunner:
    """Background thread emitting live events for enabled simulated connectors."""

    def __init__(self):
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True, name="connector-runner")
        self._thread.start()
        logger.info("Connector runner started")

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                from cybercommon.database import SessionLocal

                with SessionLocal() as db:
                    for c in get_connectors():
                        if not c["enabled"]:
                            continue
                        last = c["lastEmitAt"]
                        interval = c["intervalSec"]
                        if (not last) or (time.time() - _parse_ts(last)) >= interval:
                            try:
                                connector = next(x for x in CONNECTOR_CATALOG if x["name"] == c["name"])
                                emit_connector_event(db, connector)
                            except Exception:
                                logger.exception("Connector %s failed", c["name"])
            except Exception:
                logger.exception("Connector runner iteration failed")
            self._stop.wait(5)


def _parse_ts(iso: str) -> float:
    try:
        return datetime.fromisoformat(iso).timestamp()
    except Exception:
        return 0.0


runner = ConnectorRunner()