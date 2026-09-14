"""Event consumer: subscribes to Redis security event channels, applies events to the
shared database, recalculates the affected asset's risk, and publishes a
`risk.events.updated` notification for the WebSocket layer.

This is what makes the "live" loop genuine: an ingestion event actually mutates
state (new vulnerability / remediation / control change) and the risk numbers on
the dashboard change without any refresh.
"""
import json
import logging
import random
import threading
import time
import uuid
from datetime import datetime

import redis
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.asset import (
    Asset,
    Vulnerability,
    AssetControl,
    SecurityControl,
)
from app.core.risk_calculator import RiskCalculator
from cybercommon.cache import cache_evict

logger = logging.getLogger("risk-engine.consumer")

CHANNELS = [
    "security.events.vulnerability",
    "security.events.control",
    "security.events.asset",
]

SEVERITY_FROM_CVSS = [
    (9.0, "CRITICAL"),
    (7.0, "HIGH"),
    (4.0, "MEDIUM"),
    (0.1, "LOW"),
    (0.0, "INFO"),
]


def publish_risk_notification(event_type: str, asset_id: str, asset_name: str | None,
                              previous, risk_data: dict, timestamp=None) -> None:
    """Publish a risk.events.updated notification on Redis for the WebSocket layer."""
    prev_score = float(previous.risk_score) if previous else 0.0
    prev_eal = float(previous.expected_annual_loss) if previous else 0.0
    current_eal = float(risk_data["expected_annual_loss"])

    notification = {
        "type": event_type or "RISK_UPDATED",
        "assetId": asset_id,
        "assetName": asset_name,
        "previousRisk": prev_score,
        "currentRisk": float(risk_data["risk_score"]),
        "previousEAL": prev_eal,
        "currentEAL": current_eal,
        "delta": round(current_eal - prev_eal, 2),
        "timestamp": (timestamp or datetime.utcnow()).isoformat(),
        "message": f"Risk for {asset_name or asset_id} updated to {risk_data['risk_score']:.1f}",
    }
    try:
        client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        client.publish("risk.events.updated", json.dumps(notification))
        logger.info("Published risk.events.updated for %s", asset_id)
    except Exception:
        logger.exception("Failed to publish risk.events.updated")


class RiskEventConsumer:
    """Background Redis pub/sub listener."""

    def __init__(self, redis_url: str | None = None):
        self.redis_url = redis_url or settings.redis_url
        self.thread: threading.Thread | None = None
        self._stop = threading.Event()

    def start(self) -> None:
        if self.thread and self.thread.is_alive():
            return
        self._stop.clear()
        self.thread = threading.Thread(target=self._run, daemon=True, name="risk-event-consumer")
        self.thread.start()
        logger.info("Risk event consumer started on %s", self.redis_url)

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        attempt = 0
        while not self._stop.is_set():
            try:
                client = redis.Redis.from_url(self.redis_url, decode_responses=True)
                pubsub = client.pubsub()
                pubsub.subscribe(*CHANNELS)
                attempt = 0  # connected → reset backoff
                for message in pubsub.listen():
                    if self._stop.is_set():
                        break
                    if message.get("type") == "message":
                        try:
                            self.handle(str(message["data"]))
                        except Exception:
                            logger.exception("Failed to process event")
                pubsub.close()
            except Exception:
                attempt += 1
                delay = min(30, 2 ** attempt) + random.uniform(0, 0.5 * 2 ** attempt)
                logger.warning(
                    "Consumer disconnected (attempt %s), reconnecting in %.1fs...",
                    attempt, delay,
                )
                self._stop.wait(delay)

    # ── event application ────────────────────────────────────────────────
    def handle(self, raw: str) -> None:
        event = json.loads(raw)
        event_type = event.get("eventType", "")
        asset_str = event.get("sourceAsset")
        source = event.get("source", "UNKNOWN")
        details = self._parse_details(event.get("details"))

        logger.info("Event received: %s asset=%s", event_type, asset_str)

        if not asset_str:
            return

        # Normalize asset id to UUID (events may carry either the raw UUID or a string id)
        asset_uuid = self._asset_to_uuid(asset_str)
        if asset_uuid is None:
            return

        with SessionLocal() as db:
            affected = self._apply_event(db, event_type, asset_uuid, details, source)
            if affected is None:
                return
            self._recalc_and_publish(db, affected)

        # State changed → national observatory rollups are stale.
        cache_evict("national")

    def _apply_event(self, db: Session, event_type: str, asset_uuid: uuid.UUID,
                     details: dict, source: str) -> uuid.UUID | None:
        """Apply the event to DB state. Returns the affected asset id or None."""
        if event_type == "VULNERABILITY_DETECTED":
            self._apply_detected(db, asset_uuid, details, source)
        elif event_type == "VULNERABILITY_REMEDIATED":
            self._apply_remediated(db, asset_uuid, details)
        elif event_type == "VULNERABILITY_UPDATED":
            self._apply_updated(db, asset_uuid, details, source)
        elif event_type == "CONTROL_STATUS_CHANGED":
            self._apply_control(db, asset_uuid, details)
        elif event_type in ("ASSET_CREATED", "ASSET_MODIFIED"):
            pass  # No financial model change without asset data
        return asset_uuid

    def _apply_detected(self, db: Session, asset_uuid: uuid.UUID, details: dict, source: str) -> None:
        cvss = float(details.get("cvss_score", details.get("cvss", 8.0)))
        cve_id = details.get("cve_id")
        title = details.get("title") or f"New vulnerability (CVSS {cvss}) via {source}"
        severity = details.get("severity") or self._severity_from_cvss(cvss)

        existing = (
            db.query(Vulnerability)
            .filter(Vulnerability.cve_id == cve_id) if cve_id else None
        )
        if cve_id and existing and existing.first():
            return  # already known

        vuln = Vulnerability(
            cve_id=cve_id,
            cwe_id=details.get("cwe_id"),
            title=title,
            description=details.get("description"),
            cvss_score=cvss,
            severity=severity,
            exploitability=details.get("exploitability", min(cvss, 10.0)),
            affected_asset=asset_uuid,
            internet_exposed=bool(details.get("internet_exposed", False)),
            status="OPEN",
            remediation=details.get("remediation"),
            source=source or "SCANNER",
            discovered_at=datetime.utcnow(),
        )
        db.add(vuln)
        db.commit()
        logger.info("Applied VULNERABILITY_DETECTED %s on %s", title, asset_uuid)

    def _apply_remediated(self, db: Session, asset_uuid: uuid.UUID, details: dict) -> None:
        q = db.query(Vulnerability).filter(
            Vulnerability.affected_asset == asset_uuid,
            Vulnerability.status.in_(["OPEN", "IN_PROGRESS"]),
        )
        cve_id = details.get("cve_id")
        if cve_id:
            q = q.filter(Vulnerability.cve_id == cve_id)
        vuln = q.order_by(Vulnerability.discovered_at.desc()).first()
        if vuln:
            vuln.status = "REMEDIATED"
            vuln.remediated_at = datetime.utcnow()
            db.commit()
            logger.info("Remediated %s", vuln.cve_id or vuln.id)

    def _apply_updated(self, db: Session, asset_uuid: uuid.UUID, details: dict, source: str) -> None:
        cve_id = details.get("cve_id")
        status = details.get("status", "OPEN")
        if not cve_id:
            return
        vuln = db.query(Vulnerability).filter(Vulnerability.cve_id == cve_id).first()
        if vuln:
            vuln.status = status
            if status == "REMEDIATED":
                vuln.remediated_at = datetime.utcnow()
            cvss = details.get("cvss_score")
            if cvss is not None:
                vuln.cvss_score = float(cvss)
            db.commit()
            logger.info("Updated %s -> %s", cve_id, status)

    def _apply_control(self, db: Session, asset_uuid: uuid.UUID, details: dict) -> None:
        ctrl_type = (details.get("control_type") or details.get("controlType") or "").upper()
        new_status = (details.get("status") or "").upper()
        if new_status == "IMPLEMENTING":
            new_status = "IN_PROGRESS"
        if new_status == "DISABLED":
            new_status = "DISABLED"
        if new_status == "ENABLED":
            new_status = "ACTIVE"
        mapping = {"PLANNED": "PLANNED", "IN_PROGRESS": "IN_PROGRESS",
                   "IMPLEMENTED": "IMPLEMENTED", "VERIFIED": "VERIFIED",
                   "ACTIVE": "ACTIVE", "DISABLED": "DISABLED"}
        mapped = mapping.get(new_status, new_status)

        control = db.query(SecurityControl).filter(SecurityControl.control_type == ctrl_type).first()
        if control is None:
            logger.info("No control of type %s found; skipping", ctrl_type)
            return

        ac = db.query(AssetControl).filter(
            AssetControl.asset_id == asset_uuid,
            AssetControl.control_id == control.id,
        ).first()
        if not ac:
            ac = AssetControl(asset_id=asset_uuid, control_id=control.id)
            db.add(ac)
        ac.status = mapped if mapped else "PLANNED"
        db.commit()
        logger.info("Asset control %s -> %s on %s", ctrl_type, mapped, asset_uuid)

    # ── recalculation + publish ──────────────────────────────────────────
    def _recalc_and_publish(self, db: Session, asset_uuid: uuid.UUID) -> None:
        from app.models.asset import RiskCalculation as RC

        asset = db.query(Asset).filter(Asset.id == asset_uuid).first()
        if asset is None:
            logger.info("Asset %s not present in DB — not recalculating", asset_uuid)
            return

        calc = RiskCalculator(db)
        asset_id = str(asset_uuid)

        prev = (
            db.query(RC)
            .filter(RC.asset_id == asset_uuid)
            .order_by(RC.version.desc())
            .first()
        )

        risk = calc.calculate_asset_risk(asset_id)
        if risk is None:
            return
        persisted = calc.persist_risk(asset_id, risk)

        publish_risk_notification(
            event_type="RISK_UPDATED",
            asset_id=asset_id,
            asset_name=asset.name,
            previous=prev,
            risk_data=risk,
            timestamp=persisted.calculated_at,
        )

    # ── helpers ──────────────────────────────────────────────────────────
    @staticmethod
    def _parse_details(details) -> dict:
        if isinstance(details, dict):
            return details
        if isinstance(details, str):
            try:
                return json.loads(details)
            except (ValueError, TypeError):
                return {}
        return {}

    @staticmethod
    def _asset_to_uuid(value) -> uuid.UUID | None:
        try:
            return uuid.UUID(str(value))
        except (ValueError, AttributeError, TypeError):
            return None

    @staticmethod
    def _severity_from_cvss(cvss: float) -> str:
        for threshold, severity in SEVERITY_FROM_CVSS:
            if cvss >= threshold:
                return severity
        return "INFO"


consumer = RiskEventConsumer()