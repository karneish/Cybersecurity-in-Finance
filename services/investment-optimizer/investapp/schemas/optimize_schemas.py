from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


def _to_camel(s: str) -> str:
    parts = s.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    budget_inr: float = Field(..., gt=0, description="Total available budget in INR")
    time_horizon_years: int = Field(default=3, ge=1, le=10)
    max_per_control_percent: float = Field(default=0.40, gt=0, le=1.0)
    mode: str = Field(default="maximize", pattern="^(maximize|target)$")
    target_eal_inr: Optional[float] = Field(default=None, ge=0)


class NationalOptimizeRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    budget_inr: float = Field(..., gt=0, description="National budget across sectors in INR")
    time_horizon_years: int = Field(default=3, ge=1, le=10)


class SectorControlItemResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    control_id: str
    control_type: str
    control_name: str
    allocation_inr: float
    annual_maintenance: float
    projected_eal_reduction: float
    expected_rosi: float
    priority: int


class SectorAllocationResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    sector: str
    baseline_eal: float
    asset_count: int
    critical_infra_count: int
    allocated_inr: float
    projected_eal_reduction: float
    residual_eal: float
    items: list[SectorControlItemResponse]


class NationalOptimizeResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    mode: str
    total_budget: float
    total_allocated: float
    remaining_budget: float
    current_eal: float
    expected_eal_reduction: float
    expected_risk_reduction_fraction: float
    residual_eal: float
    portfolio_rosi: float
    sector_count: int
    selected_control_count: int
    sectors: list[SectorAllocationResponse]
    summary: str


class InvestmentItemResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True, from_attributes=True)

    control_id: str
    control_name: str
    control_type: str
    allocation_inr: float
    risk_reduction: float
    expected_rosi: float
    priority: int
    implementation_cost: float
    annual_maintenance: float


class OptimizeResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    total_budget: float
    total_allocated: float
    remaining_budget: float
    expected_risk_reduction: float
    expected_eal_reduction: float
    portfolio_rosi: float
    items: list[InvestmentItemResponse]
    summary: str


class ROSIResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    control_id: str
    control_name: str
    control_type: str
    implementation_cost: float
    annual_maintenance: float
    risk_reduction_value: float
    net_benefit: float
    rosi_percent: float
    payback_months: float


class PlanCreateRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    name: str
    budget_inr: float
    items: list[dict]


class PlanResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True, from_attributes=True)

    id: str
    name: str
    total_budget_inr: float
    expected_risk_reduction: float
    expected_eal_reduction_inr: float
    rosi: float
    status: str
    items: list[dict]
    created_at: str


class CurveRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    max_budget_inr: float = Field(..., gt=0, description="Upper budget bound for the curve")
    steps: int = Field(default=12, ge=3, le=40)
    time_horizon_years: int = Field(default=3, ge=1, le=10)


class CurvePointResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    budget_inr: float
    allocated_inr: float
    remaining_inr: float
    current_eal_inr: float
    expected_eal_reduction_inr: float
    residual_eal_inr: float
    risk_reduction_percent: float
    portfolio_rosi_percent: float


class CurveResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    current_eal_inr: float
    max_budget_inr: float
    time_horizon_years: int
    points: list[CurvePointResponse]
    optimal_budget_inr: float
    optimal_budget_rosi_percent: float
    explanation: str
