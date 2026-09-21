from datetime import datetime
import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from cybercommon.deps import get_current_user, require_roles
from cybercommon.cache import cached
from app.core.risk_calculator import RiskCalculator
from app.core.eal_calculator import EALCalculator
from app.core.scenario_engine import ScenarioSimulator
from app.core.event_consumer import publish_risk_notification
from app.core.risk_graph import RiskGraph
from app.core.attack_path import AttackPathSimulator
from app.core.confidence import DataQualityEngine
from app.core.loss_distribution import LossDistributionSimulator
from app.core.compliance import ComplianceMapper
from app.core.forecast import DoNothingForecast
from app.core.audit_chain import AuditChain
from app.core.national_twin import SovereignTwin
from app.core.tprm import TPRMManager
from app.core.drill_engine import DrillEngine
from app.models.asset import RiskCalculation, RiskSnapshot, AssetControl, SecurityControl, AuditEntry
from app.models.data_source import DataSource
from app.schemas.risk_schemas import (
    RiskCalculationResponse,
    EnterpriseRiskResponse,
    EALResponse,
    ScenarioRequest,
    ScenarioResponse,
    RiskEventRequest,
    RiskTrendResponse,
    NationalSummary,
    SectorRollup,
    RegionPayload,
    AgencyRollup,
    SRIPayload,
    NationalReport,
    SectorCompliance,
    ExerciseCreateRequest,
    ExerciseRun,
    ExerciseHistory,
    TPRMSummary,
    VendorRisk,
    VendorCascade,
    AssetAttribution,
    DataSourcePayload,
)

router = APIRouter(prefix="/api/risk", tags=["Risk"])

AUTH = {"dependencies": [Depends(get_current_user)]}
STAFF = {"dependencies": [Depends(require_roles("ANALYST", "CISO", "ADMIN"))]}
SOVEREIGN = {"dependencies": [Depends(require_roles("CISO", "ADMIN"))]}


def _to_response(risk_data: dict, persisted: RiskCalculation | None = None) -> RiskCalculationResponse:
    """Build a validated response, preferring the persisted record when available."""
    return RiskCalculationResponse(
        id=persisted.id if persisted else None,
        asset_id=risk_data["asset_id"],
        asset_name=risk_data.get("asset_name"),
        risk_score=risk_data["risk_score"],
        probability=risk_data["probability"],
        financial_impact_inr=risk_data["financial_impact_inr"],
        expected_annual_loss=risk_data["expected_annual_loss"],
        risk_category=risk_data["risk_category"],
        risk_factors=risk_data["risk_factors"],
        control_reduction=risk_data["control_reduction"],
        residual_risk=risk_data["residual_risk"],
        calculated_at=persisted.calculated_at if persisted else datetime.utcnow(),
        version=persisted.version if persisted else 1,
    )


@router.post("/calculate", response_model=RiskCalculationResponse, **STAFF)
def calculate_asset_risk(
    asset_id: str,
    persist: bool = Query(default=True, description="Persist calculation to DB"),
    db: Session = Depends(get_db),
):
    calc = RiskCalculator(db)
    risk_data = calc.calculate_asset_risk(asset_id)
    if not risk_data:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    persisted = None
    if persist:
        persisted = calc.persist_risk(asset_id, risk_data)

    return _to_response(risk_data, persisted)


@router.post("/calculate-all", **STAFF)
def calculate_all_risks(db: Session = Depends(get_db)):
    calc = RiskCalculator(db)
    results = calc.calculate_all_risks()
    return {
        "total_assets_calculated": len(results),
        "total_eal": round(sum(r["expected_annual_loss"] for r in results), 2),
        "results": results,
    }


@router.get("/score", response_model=EnterpriseRiskResponse, **AUTH)
def get_enterprise_risk_score(db: Session = Depends(get_db)):
    calc = RiskCalculator(db)
    return calc.get_enterprise_risk()


@router.get("/eal", response_model=EALResponse, **AUTH)
def get_expected_annual_loss(
    include_var: bool = Query(default=False, description="Include Monte-Carlo VaR95 block"),
    db: Session = Depends(get_db),
):
    eal_calc = EALCalculator(db)
    return eal_calc.calculate_eal(include_var=include_var)


@router.get("/business-units", **AUTH)
def get_business_unit_rollup(
    sort_by: str = Query(default="eal", pattern="^(eal|score)$"),
    db: Session = Depends(get_db),
):
    eal_calc = EALCalculator(db)
    return eal_calc.business_units(sort_by=sort_by)


def _csv_download(rows: list[dict], filename: str) -> Response:
    """Serialize a list of flat dicts to an attachment CSV response."""
    if not rows:
        rows = [{"message": "No data available"}]
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    for row in rows:
        writer.writerow({k: "" if v is None else str(v) for k, v in row.items()})
    return Response(
        content=out.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/report/export", **AUTH)
def export_report(
    section: str = Query(default="full", pattern="^(full|eal|compliance|business-units|trends)$"),
    db: Session = Depends(get_db),
):
    """Download a CSV report section or the full self-contained JSON report."""
    eal_calc = EALCalculator(db)

    if section == "eal":
        eal = eal_calc.calculate_eal()
        return _csv_download(eal["asset_eals"], "scro-risk-eal.csv")

    if section == "business-units":
        rollup = eal_calc.business_units()
        return _csv_download(rollup["business_units"], "scro-business-units.csv")

    if section == "compliance":
        rows = (
            db.query(AssetControl, SecurityControl)
            .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
            .all()
        )
        asset_mapping = [
            {
                "control_type": sc.control_type,
                "status": ac.status,
                "coverage_score": float(ac.coverage_score or 0),
                "effectiveness_score": float(ac.effectiveness_score or 0),
            }
            for ac, sc in rows
        ]
        mapping = ComplianceMapper.apply_asset_state(asset_mapping)
        flat = [
            {
                "control_type": r["control_type"],
                "status": r["status"],
                "coverage_score": r["coverage_score"],
                "effectiveness_score": r["effectiveness_score"],
                "mandates": "; ".join(f"{fr} {req}" for fr, req, _ in r["mandates"]),
            }
            for r in mapping["mapped_requirements"]
        ]
        return _csv_download(flat, "scro-compliance-mapping.csv")

    if section == "trends":
        t = eal_calc.get_risk_trends(90)
        flat = [
            {"date": d, "eal_inr": e, "risk_score": s, "open_vulns": v}
            for d, e, s, v in zip(t["dates"], t["eal_values"], t["risk_scores"], t["vuln_counts"], strict=False)
        ]
        return _csv_download(flat, "scro-risk-trends.csv")

    # full: self-contained JSON report
    calc = RiskCalculator(db)
    eal = eal_calc.calculate_eal(include_var=True)
    trends = eal_calc.get_risk_trends(90)
    return {
        "report_type": "SCRO Enterprise Risk Report",
        "generated_at": datetime.utcnow().isoformat(),
        "enterprise": calc.get_enterprise_risk(),
        "expected_annual_loss": eal,
        "business_units": eal_calc.business_units(),
        "compliance": ComplianceMapper.apply_asset_state([
            {
                "control_type": sc.control_type,
                "status": ac.status,
                "coverage_score": float(ac.coverage_score or 0),
                "effectiveness_score": float(ac.effectiveness_score or 0),
            }
            for ac, sc in (
                db.query(AssetControl, SecurityControl)
                .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
                .all()
            )
        ]),
        "risk_trend_90d": {
            "dates": trends["dates"],
            "eal_values": trends["eal_values"],
            "risk_scores": trends["risk_scores"],
            "vuln_counts": trends["vuln_counts"],
        },
    }


@router.get("/drivers", **AUTH)
def get_risk_drivers(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    calc = RiskCalculator(db)
    enterprise = calc.get_enterprise_risk()
    return enterprise["top_risk_drivers"][:limit]


@router.get("/trends", response_model=RiskTrendResponse, **AUTH)
def get_risk_trends(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    eal_calc = EALCalculator(db)
    return eal_calc.get_risk_trends(days)


@router.post("/scenario/simulate", response_model=ScenarioResponse, **STAFF)
def simulate_scenario(
    request: ScenarioRequest,
    db: Session = Depends(get_db),
):
    simulator = ScenarioSimulator(db)
    return simulator.simulate(request.changes)


@router.post("/event", **STAFF)
def receive_risk_event(
    event: RiskEventRequest,
    db: Session = Depends(get_db),
):
    if event.asset_id:
        calc = RiskCalculator(db)
        previous = (
            db.query(RiskCalculation)
            .filter(RiskCalculation.asset_id == event.asset_id)
            .order_by(RiskCalculation.version.desc())
            .first()
        )
        risk_data = calc.calculate_asset_risk(event.asset_id)
        if risk_data:
            persisted = calc.persist_risk(event.asset_id, risk_data)
            publish_risk_notification(
                event_type=event.event_type,
                asset_id=str(risk_data["asset_id"]),
                asset_name=risk_data.get("asset_name"),
                previous=previous,
                risk_data=risk_data,
                timestamp=persisted.calculated_at,
            )
            return {
                "status": "processed",
                "asset_id": event.asset_id,
                "new_risk_score": risk_data["risk_score"],
                "new_eal": risk_data["expected_annual_loss"],
            }

    return {"status": "received", "event_type": event.event_type}


@router.post("/snapshot", **STAFF)
def create_risk_snapshot(db: Session = Depends(get_db)):
    calc = RiskCalculator(db)
    snapshot = calc.persist_snapshot()
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No assets found to snapshot")
    return {
        "status": "created",
        "id": str(snapshot.id),
        "risk_score": float(snapshot.risk_score),
        "expected_annual_loss": float(snapshot.expected_annual_loss),
        "total_controls_active": snapshot.total_controls_active,
        "total_vulns_open": snapshot.total_vulns_open,
        "snapshot_date": snapshot.snapshot_date.isoformat(),
    }


@router.get("/snapshots", **AUTH)
def list_risk_snapshots(
    limit: int = Query(default=90, ge=1, le=365),
    db: Session = Depends(get_db),
):
    snapshots = (
        db.query(RiskSnapshot)
        .order_by(RiskSnapshot.snapshot_date.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(s.id),
            "risk_score": float(s.risk_score) if s.risk_score is not None else 0,
            "expected_annual_loss": float(s.expected_annual_loss) if s.expected_annual_loss is not None else 0,
            "total_controls_active": s.total_controls_active or 0,
            "total_vulns_open": s.total_vulns_open or 0,
            "snapshot_date": s.snapshot_date.isoformat(),
        }
        for s in snapshots
    ]


@router.get("/graph", **AUTH)
def get_risk_graph(db: Session = Depends(get_db)):
    graph = RiskGraph(db)
    return graph.get_graph()


@router.get("/blast-radius/{asset_id}", **AUTH)
def get_blast_radius(asset_id: str, db: Session = Depends(get_db)):
    graph = RiskGraph(db)
    result = graph.get_blast_radius(asset_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/attack-path", **AUTH)
def get_attack_path(db: Session = Depends(get_db)):
    simulator = AttackPathSimulator(db)
    return simulator.simulate()


@router.get("/data-quality", **AUTH)
def get_data_quality(db: Session = Depends(get_db)):
    engine = DataQualityEngine(db)
    return engine.enterprise_quality()


@router.get("/data-quality/{asset_id}", **AUTH)
def get_asset_data_quality(asset_id: str, db: Session = Depends(get_db)):
    engine = DataQualityEngine(db)
    result = engine.asset_quality(asset_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/loss-distribution", **AUTH)
def get_loss_distribution(
    simulations: int = Query(default=5000, ge=500, le=50000),
    db: Session = Depends(get_db),
):
    simulator = LossDistributionSimulator(db)
    return simulator.simulate(simulations)


@router.get("/compliance", **AUTH)
def get_compliance_mapping(db: Session = Depends(get_db)):
    rows = (
        db.query(AssetControl, SecurityControl)
        .join(SecurityControl, AssetControl.control_id == SecurityControl.id)
        .all()
    )
    asset_mapping = [
        {
            "control_type": sc.control_type,
            "status": ac.status,
            "coverage_score": float(ac.coverage_score or 0),
            "effectiveness_score": float(ac.effectiveness_score or 0),
        }
        for ac, sc in rows
    ]
    return ComplianceMapper.apply_asset_state(asset_mapping)


@router.get("/forecast", **AUTH)
def get_do_nothing_forecast(
    horizon_months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
):
    forecast = DoNothingForecast(db)
    return forecast.forecast(horizon_months)


@router.get("/forecast/ml", **AUTH)
def get_ml_forecast(
    horizon_months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
):
    from app.core.ml_forecast import forecast_ml

    return forecast_ml(db, horizon_months)


@router.post("/audit/commit", **STAFF)
def commit_audit_entry(request: RiskEventRequest, db: Session = Depends(get_db)):
    chain = AuditChain(db)
    payload = {
        "event_type": request.event_type,
        "asset_id": request.asset_id,
        "details": request.details or {},
    }
    try:
        asset_uuid = uuid.UUID(request.asset_id)
    except Exception:
        asset_uuid = None
    return chain.commit(
        action=f"RISK_{request.event_type.upper()}",
        payload=payload,
        asset_id=asset_uuid,
    )


@router.get("/audit/chain", **AUTH)
def get_audit_chain(db: Session = Depends(get_db)):
    chain = AuditChain(db)
    return chain.chain()


@router.get("/audit/verify", **AUTH)
def verify_audit_chain(db: Session = Depends(get_db)):
    chain = AuditChain(db)
    return chain.verify()


@router.get("/asset/{asset_id}", response_model=RiskCalculationResponse, **AUTH)
def get_asset_risk(
    asset_id: str,
    db: Session = Depends(get_db),
):
    calc = RiskCalculator(db)
    risk_data = calc.calculate_asset_risk(asset_id)
    if not risk_data:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")

    persisted = (
        db.query(RiskCalculation)
        .filter(RiskCalculation.asset_id == asset_id)
        .order_by(RiskCalculation.version.desc())
        .first()
    )
    return _to_response(risk_data, persisted or (RiskCalculation(
        asset_id=asset_id,
        risk_score=risk_data["risk_score"],
        probability=risk_data["probability"],
        financial_impact_inr=risk_data["financial_impact_inr"],
        expected_annual_loss=risk_data["expected_annual_loss"],
        risk_category=risk_data["risk_category"],
        risk_factors=risk_data["risk_factors"],
        control_reduction=risk_data["control_reduction"],
        residual_risk=risk_data["residual_risk"],
        version=1,
    )))


# ══════════════════════════════════════════════════════════════════════
#  SCRO — National Observatory / Regulatory / TPRM endpoints (Phase B)
# ══════════════════════════════════════════════════════════════════════


@router.get("/national/summary", response_model=NationalSummary, **SOVEREIGN)
@cached("national", ttl=settings.national_cache_ttl)
def national_summary(db: Session = Depends(get_db)):
    twin = SovereignTwin(db)
    return twin.summary()


@router.get("/national/sectors", response_model=list[SectorRollup], **SOVEREIGN)
@cached("national", ttl=settings.national_cache_ttl)
def national_sectors(db: Session = Depends(get_db)):
    twin = SovereignTwin(db)
    return twin.sectors()


@router.get("/national/regions", response_model=RegionPayload, **SOVEREIGN)
@cached("national", ttl=settings.national_cache_ttl)
def national_regions(
    sector: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    twin = SovereignTwin(db)
    return twin.regions(sector)


@router.get("/national/agencies", response_model=list[AgencyRollup], **SOVEREIGN)
@cached("national", ttl=settings.national_cache_ttl)
def national_agencies(db: Session = Depends(get_db)):
    twin = SovereignTwin(db)
    return twin.agencies()


@router.get("/national/sri", response_model=SRIPayload, **SOVEREIGN)
@cached("national", ttl=settings.national_cache_ttl)
def national_sri(db: Session = Depends(get_db)):
    twin = SovereignTwin(db)
    return twin.sri()


@router.get("/national/report", response_model=NationalReport, **SOVEREIGN)
@cached("national", ttl=settings.national_cache_ttl)
def national_report(db: Session = Depends(get_db)):
    twin = SovereignTwin(db)
    return twin.regulator_report()


@router.get("/compliance/{sector}", response_model=SectorCompliance, **SOVEREIGN)
@cached("national", ttl=settings.national_cache_ttl)
def sector_compliance(sector: str, db: Session = Depends(get_db)):
    twin = SovereignTwin(db)
    return twin.sector_compliance(sector)


@router.post("/exercises", response_model=ExerciseRun, **SOVEREIGN)
def run_exercise(request: ExerciseCreateRequest, db: Session = Depends(get_db)):
    engine = DrillEngine(db)
    result = engine.run(
        name=request.name,
        scenario_key=request.scenario_key,
        impact_scope=request.impact_scope,
        sector=request.sector,
        region=request.region,
        agency_id=request.agency_id,
        vendor_id=request.vendor_id,
        actor=request.actor,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/exercises", response_model=list[ExerciseHistory], **SOVEREIGN)
def list_exercises(db: Session = Depends(get_db)):
    engine = DrillEngine(db)
    return engine.list_exercises()


@router.post("/exercises/{exercise_id}/rerun", response_model=ExerciseRun, **SOVEREIGN)
def rerun_exercise(exercise_id: str, db: Session = Depends(get_db)):
    """Re-execute a past drill with the same template + scope (new audit entry)."""
    engine = DrillEngine(db)
    result = engine.rerun(exercise_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/data-sources", response_model=list[DataSourcePayload], **SOVEREIGN)
def list_data_sources(db: Session = Depends(get_db)):
    """Registered ingestion connectors and their health state."""
    rows = db.query(DataSource).order_by(DataSource.name).all()
    return [
        DataSourcePayload(
            source_key=d.source_key,
            name=d.name,
            connector_type=d.connector_type,
            status=d.status,
            description=d.description,
            last_ingested_at=d.last_ingested_at.isoformat() if d.last_ingested_at else None,
            records_ingested=d.records_ingested or 0,
            error_count=d.error_count or 0,
        )
        for d in rows
    ]


@router.get("/tprm", response_model=TPRMSummary, **SOVEREIGN)
def tprm_summary(db: Session = Depends(get_db)):
    manager = TPRMManager(db)
    return manager.summary()


@router.get("/tprm/vendors", response_model=list[VendorRisk], **SOVEREIGN)
def tprm_vendors(db: Session = Depends(get_db)):
    manager = TPRMManager(db)
    return manager.vendors()


@router.get("/tprm/cascade/{vendor_id}", response_model=VendorCascade, **SOVEREIGN)
def tprm_cascade(vendor_id: str, db: Session = Depends(get_db)):
    manager = TPRMManager(db)
    result = manager.cascade(vendor_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/tprm/asset/{asset_id}", response_model=AssetAttribution, **SOVEREIGN)
def tprm_asset_attribution(asset_id: str, db: Session = Depends(get_db)):
    manager = TPRMManager(db)
    result = manager.asset_attribution(asset_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
