import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.schemas.ai_schemas import (
    RecommendRequest, RecommendResponse,
    QueryRequest, QueryResponse,
    ExplainRequest, ExplainResponse,
    SummarizeRequest,
)
from app.core.recommendation_engine import (
    get_recommendations,
    query_risk_data,
    explain_risk,
    generate_summary,
)
from app.core.intent_router import classify_intent, INTENT_LABELS

router = APIRouter(prefix="/api/ai", tags=["AI"])


async def _fetch_json(url: str) -> dict:
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.get(url)
        return resp.json()


async def _fetch_risk_data() -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{settings.risk_engine_url}/api/risk/score")
            return resp.json()
        except Exception:
            return {"total_eal": 0, "enterprise_risk_score": 0, "top_risk_drivers": []}


async def _fetch_eal_data() -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(f"{settings.risk_engine_url}/api/risk/eal")
            return resp.json()
        except Exception:
            return {"total_eal": 0, "asset_eals": [], "breakdown_by_department": {}}


async def _fetch_asset_risk(asset_id: str) -> tuple[dict, dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            risk_resp = await client.get(f"{settings.risk_engine_url}/api/risk/asset/{asset_id}")
            risk_data = risk_resp.json()
        except Exception:
            risk_data = {"risk_score": 0, "probability": 0}

        try:
            asset_resp = await client.get(f"{settings.asset_service_url}/api/assets/{asset_id}")
            asset_data = asset_resp.json()
        except Exception:
            asset_data = {"id": asset_id, "name": "Unknown Asset"}

        return asset_data, risk_data


async def _route_data(intent: str) -> dict:
    """Call the platform function that matches the classified intent."""
    risk = settings.risk_engine_url
    try:
        if intent == "NATIONAL":
            return {
                "routed_to": "/api/risk/national/summary",
                "data": await _fetch_json(f"{risk}/api/risk/national/summary"),
            }
        if intent == "COMPLIANCE":
            return {
                "routed_to": "/api/risk/compliance",
                "data": await _fetch_json(f"{risk}/api/risk/compliance"),
            }
        if intent == "TREND":
            return {
                "routed_to": "/api/risk/trends?days=90",
                "data": await _fetch_json(f"{risk}/api/risk/trends?days=90"),
            }
        if intent == "FORECAST":
            return {
                "routed_to": "/api/risk/forecast",
                "data": await _fetch_json(f"{risk}/api/risk/forecast"),
            }
        if intent == "VAR":
            return {
                "routed_to": "/api/risk/loss-distribution?simulations=2000",
                "data": await _fetch_json(f"{risk}/api/risk/loss-distribution?simulations=2000"),
            }
        if intent == "INVEST":
            rosi = await _fetch_json(f"{settings.investment_url}/api/investment/rosi")
            controls = await _fetch_json(f"{settings.investment_url}/api/investment/controls")
            return {
                "routed_to": "/api/investment/rosi + /api/investment/controls",
                "data": {"rosi": rosi, "controls": controls},
            }
    except Exception:
        pass

    risk_data = await _fetch_risk_data()
    eal_data = await _fetch_eal_data()
    return {
        "routed_to": "/api/risk/score + /api/risk/eal",
        "data": {**risk_data, "eal": eal_data},
    }


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(request: RecommendRequest):
    risk_data = await _fetch_risk_data()
    result = await get_recommendations(risk_data, request.context, request.focus_area)
    return result


@router.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    intent = classify_intent(request.question)
    routed = await _route_data(intent)
    result = await query_risk_data(
        question=request.question,
        risk_data=routed["data"],
        intent=intent,
        data_source=routed["routed_to"],
    )
    return result


@router.post("/explain/risk/{asset_id}", response_model=ExplainResponse)
async def explain(request: ExplainRequest, asset_id: str):
    asset_data, risk_data = await _fetch_asset_risk(asset_id)
    result = await explain_risk(asset_data, risk_data, request.detail_level)
    return result


@router.post("/summarize")
async def summarize(request: SummarizeRequest):
    risk_data = await _fetch_risk_data()
    eal_data = await _fetch_eal_data()
    summary = await generate_summary(eal_data, risk_data, request.audience)
    return {"summary": summary, "audience": request.audience}
