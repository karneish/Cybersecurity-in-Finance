from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from cybercommon.database import get_db
from cybercommon.deps import get_current_user, require_roles
from cybercommon.models import AlertEvent, AlertRule

from app.core.alerts import evaluate_rules, event_to_dict, rule_to_dict, matches

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

AUTH = {"dependencies": [Depends(get_current_user)]}
STAFF = {"dependencies": [Depends(require_roles("ANALYST", "CISO", "ADMIN"))]}
ADMIN = {"dependencies": [Depends(require_roles("ADMIN"))]}


class RuleCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    metric: str = Field(pattern="^(risk_score|total_eal|open_vulns|kev_count)$")
    operator: str = Field(default=">=", pattern="^(>=|>|<=|<)$")
    threshold: float = Field(ge=0)
    asset_id: str | None = None
    severity: str = Field(default="HIGH", pattern="^(INFO|LOW|MEDIUM|HIGH|CRITICAL)$")
    enabled: bool = True


class EvaluateRequest(BaseModel):
    metrics: dict[str, float]


@router.get("/rules", **AUTH)
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(AlertRule).order_by(AlertRule.created_at.desc()).all()
    return [rule_to_dict(r) for r in rules]


@router.post("/rules", **ADMIN)
def create_rule(body: RuleCreate, db: Session = Depends(get_db)):
    rule = AlertRule(
        name=body.name,
        metric=body.metric,
        operator=body.operator,
        threshold=body.threshold,
        asset_id=UUID(body.asset_id) if body.asset_id else None,
        severity=body.severity,
        enabled=body.enabled,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule_to_dict(rule)


@router.delete("/rules/{rule_id}", **ADMIN)
def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"deleted": rule_id}


@router.post("/evaluate", **STAFF)
def evaluate(body: EvaluateRequest, db: Session = Depends(get_db)):
    """Run the enabled rules against a supplied metrics snapshot."""
    fired = evaluate_rules(db, body.metrics)
    return {"fired": fired, "count": len(fired)}


@router.get("/events", **AUTH)
def list_events(
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    events = (
        db.query(AlertEvent)
        .order_by(AlertEvent.fired_at.desc())
        .limit(limit)
        .all()
    )
    return [event_to_dict(e) for e in events]


@router.get("/health-check", **AUTH)
def operator_health():
    return {"supported_metrics": ["risk_score", "total_eal", "open_vulns", "kev_count"]}