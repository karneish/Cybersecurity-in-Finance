"""Threshold-based alert engine (WS8).

Alert rules are stored in ``public.alert_rules``. ``evaluate_rules`` matches a
metrics snapshot (risk_score / total_eal / open_vulns / kev_count) against the
enabled rules, persists fired alerts to ``public.alert_events`` and publishes
them on the Redis ``risk.events.alert`` channel, which the STOMP bridge relays
to the ``/topic/risk/alert`` feed.
"""

import json
import logging
from uuid import UUID

from sqlalchemy.orm import Session

from cybercommon.models import AlertEvent, AlertRule
from cybercommon.redis import redis_client

logger = logging.getLogger("notification-service.alerts")

ALERT_CHANNEL = "risk.events.alert"

SUPPORTED_METRICS = ("risk_score", "total_eal", "open_vulns", "kev_count")


def rule_to_dict(rule: AlertRule) -> dict:
    return {
        "id": str(rule.id),
        "name": rule.name,
        "metric": rule.metric,
        "operator": rule.operator,
        "threshold": float(rule.threshold),
        "assetId": str(rule.asset_id) if rule.asset_id else None,
        "severity": rule.severity,
        "enabled": bool(rule.enabled),
        "createdAt": rule.created_at.isoformat() if rule.created_at else None,
    }


def event_to_dict(event: AlertEvent) -> dict:
    return {
        "id": str(event.id),
        "ruleId": str(event.rule_id) if event.rule_id else None,
        "metric": event.metric,
        "observed": float(event.observed),
        "threshold": float(event.threshold),
        "severity": event.severity,
        "assetId": str(event.asset_id) if event.asset_id else None,
        "firedAt": event.fired_at.isoformat() if event.fired_at else None,
    }


def matches(observed: float, threshold: float, operator: str) -> bool:
    if operator == ">":
        return observed > threshold
    if operator == "<=":
        return observed <= threshold
    if operator == "<":
        return observed < threshold
    return observed >= threshold


def filter_rules(rules: list, metrics: dict) -> list[dict]:
    """Match metrics against enabled rules — pure, DB-free."""
    fired: list[dict] = []
    asset_id = metrics.get("asset_id")

    for rule in rules:
        if not rule.enabled or rule.metric not in SUPPORTED_METRICS:
            continue
        value = metrics.get(rule.metric)
        if value is None:
            continue
        if rule.asset_id is not None and asset_id is not None and rule.asset_id != asset_id:
            continue
        if not matches(float(value), float(rule.threshold), rule.operator or ">="):
            continue
        fired.append({
            "ruleId": str(rule.id),
            "ruleName": rule.name,
            "metric": rule.metric,
            "observed": float(value),
            "threshold": float(rule.threshold),
            "severity": rule.severity,
            "assetId": asset_id,
            "message": (
                f"Alert [{rule.severity}]: {rule.name} — {rule.metric} "
                f"{rule.operator or '>='} {float(rule.threshold):,.2f} "
                f"(observed {float(value):,.2f})"
            ),
        })
    return fired


def evaluate_rules(db: Session, metrics: dict, persist: bool = True) -> list[dict]:
    """Evaluate a metrics snapshot against enabled rules.

    Returns (and optionally persists + publishes) the fired alert payloads.
    """
    rules = db.query(AlertRule).filter(AlertRule.enabled == True).all()  # noqa: E712
    fired = filter_rules(list(rules), metrics)

    if fired and persist:
        for fired_event in fired:
            rule = next((r for r in rules if str(r.id) == fired_event["ruleId"]), None)
            db.add(AlertEvent(
                rule_id=UUID(fired_event["ruleId"]),
                metric=fired_event["metric"],
                observed=fired_event["observed"],
                threshold=fired_event["threshold"],
                severity=fired_event["severity"],
                asset_id=rule.asset_id if rule else None,
            ))
        db.commit()

    if fired:
        publish_alerts(fired)
        logger.info("Fired %d alert(s) from %d rule(s)", len(fired), len(rules))
    return fired


def publish_alerts(fired: list[dict]) -> None:
    """Publish fired alerts on Redis for the STOMP bridge to relay."""
    try:
        client = redis_client()
        for alert in fired:
            client.publish(ALERT_CHANNEL, json.dumps(alert, default=str))
    except Exception:
        logger.exception("Failed to publish alerts on %s", ALERT_CHANNEL)