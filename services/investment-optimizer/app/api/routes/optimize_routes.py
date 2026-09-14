from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.core.optimizer import InvestmentOptimizer
from app.models.investment import InvestmentPlan, InvestmentItem
from app.schemas.optimize_schemas import (
    OptimizeRequest,
    OptimizeResponse,
    ROSIResponse,
    PlanCreateRequest,
    NationalOptimizeRequest,
    NationalOptimizeResponse,
    CurveRequest,
    CurveResponse,
)

router = APIRouter(prefix="/api/investment", tags=["Investment"])


@router.post("/national/optimize", response_model=NationalOptimizeResponse)
def optimize_national_budget(
    request: NationalOptimizeRequest,
    db: Session = Depends(get_db),
):
    optimizer = InvestmentOptimizer(db)
    return optimizer.optimize_national(
        budget_inr=request.budget_inr,
        time_horizon_years=request.time_horizon_years,
    )


@router.post("/curve", response_model=CurveResponse)
def investment_curve(
    request: CurveRequest,
    db: Session = Depends(get_db),
):
    """Investment-vs-risk frontier: EAL reduction and ROSI across budget points."""
    optimizer = InvestmentOptimizer(db)
    return optimizer.curve(
        max_budget_inr=request.max_budget_inr,
        steps=request.steps,
        time_horizon_years=request.time_horizon_years,
    )


@router.post("/optimize")
def optimize_budget(
    request: OptimizeRequest,
    db: Session = Depends(get_db),
):
    optimizer = InvestmentOptimizer(db)
    result = optimizer.optimize(
        budget_inr=request.budget_inr,
        time_horizon_years=request.time_horizon_years,
        mode=request.mode,
        target_eal_inr=request.target_eal_inr,
    )
    return result


@router.get("/controls")
def list_available_controls(db: Session = Depends(get_db)):
    optimizer = InvestmentOptimizer(db)
    return optimizer.get_available_controls()


@router.get("/rosi")
def calculate_rosi(
    time_horizon_years: int = Query(default=3, ge=1, le=10),
    db: Session = Depends(get_db),
):
    optimizer = InvestmentOptimizer(db)
    controls = optimizer.get_available_controls()

    results = []
    for c in controls:
        total_cost = c["implementation_cost"] + c["annual_maintenance"] * time_horizon_years
        risk_value = c["eal_reduction"]
        net = risk_value - total_cost
        rosi = (net / total_cost * 100) if total_cost > 0 else 0
        payback = (total_cost / (risk_value / 12)) if risk_value > 0 else 999

        results.append(ROSIResponse(
            control_id=c["id"],
            control_name=c["name"],
            control_type=c["control_type"],
            implementation_cost=c["implementation_cost"],
            annual_maintenance=c["annual_maintenance"],
            risk_reduction_value=round(risk_value, 2),
            net_benefit=round(net, 2),
            rosi_percent=round(rosi, 2),
            payback_months=round(min(payback, 999), 1),
        ))

    results.sort(key=lambda x: x.rosi_percent, reverse=True)
    return results


@router.post("/plans")
def create_plan(request: PlanCreateRequest, db: Session = Depends(get_db)):
    plan = InvestmentPlan(
        name=request.name,
        total_budget_inr=request.budget_inr,
        created_by=None,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    for item_data in request.items:
        item = InvestmentItem(
            plan_id=plan.id,
            control_id=item_data.get("control_id"),
            allocation_inr=item_data.get("allocation_inr", 0),
            risk_reduction=item_data.get("risk_reduction", 0),
            expected_rosi=item_data.get("expected_rosi", 0),
            priority=item_data.get("priority", 0),
        )
        db.add(item)

    db.commit()

    return {
        "id": str(plan.id),
        "name": plan.name,
        "status": plan.status,
        "created_at": str(plan.created_at),
    }


@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(InvestmentPlan).order_by(InvestmentPlan.created_at.desc()).all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "total_budget_inr": float(p.total_budget_inr),
            "expected_risk_reduction": float(p.expected_risk_reduction),
            "expected_eal_reduction_inr": float(p.expected_eal_reduction_inr),
            "rosi": float(p.rosi),
            "status": p.status,
            "created_at": str(p.created_at),
        }
        for p in plans
    ]


@router.get("/plans/{plan_id}")
def get_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(InvestmentPlan).filter(InvestmentPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    items = db.query(InvestmentItem).filter(InvestmentItem.plan_id == plan.id).all()
    return {
        "id": str(plan.id),
        "name": plan.name,
        "total_budget_inr": float(plan.total_budget_inr),
        "expected_risk_reduction": float(plan.expected_risk_reduction),
        "expected_eal_reduction_inr": float(plan.expected_eal_reduction_inr),
        "rosi": float(plan.rosi),
        "status": plan.status,
        "created_at": str(plan.created_at),
        "items": [
            {
                "control_id": str(i.control_id),
                "allocation_inr": float(i.allocation_inr),
                "risk_reduction": float(i.risk_reduction),
                "expected_rosi": float(i.expected_rosi),
                "priority": i.priority,
            }
            for i in items
        ],
    }
