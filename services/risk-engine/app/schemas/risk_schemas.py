from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


def _to_camel(s: str) -> str:
    parts = s.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])


class RiskCalculationResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True, from_attributes=True)

    id: Optional[UUID] = None
    asset_id: UUID
    asset_name: Optional[str] = None
    risk_score: float
    probability: float
    financial_impact_inr: float
    expected_annual_loss: float
    risk_category: str
    risk_factors: Optional[dict] = None
    control_reduction: float = 0.0
    residual_risk: float = 0.0
    calculated_at: Optional[datetime] = None
    version: int = 1


class EnterpriseRiskResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    total_eal: float
    total_assets: int
    total_vulnerabilities: int
    critical_risks: int
    high_risks: int
    medium_risks: int
    low_risks: int
    average_risk_score: float
    enterprise_risk_score: float
    top_risk_drivers: list[dict]


class EALResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    total_eal: float
    asset_eals: list[dict]
    breakdown_by_type: dict
    breakdown_by_department: dict
    breakdown_by_sensitivity: dict
    breakdown_by_impact_component: dict = {}
    value_at_risk: Optional[dict] = None


class ScenarioRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    changes: list[dict] = Field(
        ...,
        description="List of changes to simulate. Each: {type, asset_id?, control_type?, value}",
        examples=[[
            {"type": "add_control", "control_type": "MFA", "asset_id": "PAY-SRV-001", "value": 0.85},
            {"type": "remediate_vuln", "vuln_id": "CVE-2026-1001"},
            {"type": "increase_budget", "amount_inr": 5000000}
        ]]
    )


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    current_eal: float
    simulated_eal: float
    eal_reduction: float
    eal_reduction_percent: float
    current_risk_score: float
    simulated_risk_score: float
    risk_score_change: float
    asset_changes: list[dict]
    summary: str


class RiskEventRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    event_type: str
    asset_id: Optional[str] = None
    source: str = "UNKNOWN"
    details: dict = {}


class RiskTrendResponse(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    dates: list[str]
    eal_values: list[float]
    risk_scores: list[float]
    vuln_counts: list[int]


class RiskDriver(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    asset_name: str
    asset_type: str
    department: str
    risk_score: float
    expected_annual_loss: float
    open_vulns: int
    critical_vulns: int
    control_coverage: float
    internet_exposed: bool


# ── SCRO National / Sector / Region / Agency ──────────────────────────────

class CriticalInfraAsset(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    asset_name: str
    expected_annual_loss: float
    open_vulns: Optional[int] = None
    sector: Optional[str] = None


class SectorRank(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    sector: str
    expected_annual_loss: float
    sovereign_risk_index: float


class NationalSummary(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    as_on: str
    total_eal_inr: float
    average_risk_score: float
    sovereign_risk_index: float
    total_assets: int
    critical_infra_count: int
    total_open_vulns: int
    top_sectors: list[SectorRank]
    top_critical_infra_assets: list[CriticalInfraAsset]
    regions_present: list[str]
    framing: Optional[str] = None


class SectorRollup(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    sector: str
    sector_name: str
    regulator: Optional[str] = None
    sector_weight: float
    asset_count: int
    critical_infra_count: int
    expected_annual_loss: float
    eal_share_percent: float
    average_risk_score: float
    control_coverage_percent: float
    data_confidence_percent: float
    open_vuln_count: int
    sovereign_risk_index: float
    threshold_critical_mln: float
    threshold_exceeded: bool
    critical_infra_assets: list[CriticalInfraAsset]


class RegionPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    regions: list[str]
    sectors: list[str]
    region_totals: dict
    matrix: list[list]
    national_total_eal: float


class AgencyAsset(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    asset_name: str
    sector: Optional[str] = None
    critical_infra: bool
    expected_annual_loss: float
    risk_score: float


class AgencyRollup(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    agency_id: str
    name: str
    agency_type: Optional[str] = None
    sector: Optional[str] = None
    region: Optional[str] = None
    classification: Optional[str] = None
    parent_agency_id: Optional[str] = None
    asset_count: int
    critical_infra_count: int
    expected_annual_loss: float
    assets: list[AgencyAsset]


class SRIDetail(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    sector: str
    sovereign_risk_index: float
    expected_annual_loss: float
    input_factors: dict


class SRIPayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    sovereign_risk_index: float
    total_eal_inr: float
    breakdown: list[SRIDetail]


class ComplianceRequirement(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    control_type: str
    status: str
    coverage_score: float
    effectiveness_score: float
    mandates: list[list]


class ComplianceCoverage(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    active_controls: int
    total_control_types: int
    compliance_coverage_percent: float


class SectorCompliance(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    sector: str
    regulators: list[str]
    mapped_requirements: list[ComplianceRequirement]
    coverage: ComplianceCoverage


class EarlyWarningRow(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    id: str
    warning_type: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[str] = None


class NationalReport(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    national: NationalSummary
    sectors: list[SectorRollup]
    regions: RegionPayload
    agencies: list[AgencyRollup]
    compliance: dict
    compliance_by_sector: dict[str, SectorCompliance]
    data_quality: dict
    audit_chain: dict
    early_warnings: list[EarlyWarningRow]


# ── Exercises ─────────────────────────────────────────────────────────────

class ExerciseCreateRequest(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    name: str
    scenario_key: str = Field(..., description="WORM | RANSOMWARE | SUPPLY_CHAIN | DDOS")
    impact_scope: str = Field(
        default="SECTOR", pattern="^(NATIONAL|SECTOR|REGION|AGENCY|VENDOR)$"
    )
    sector: Optional[str] = None
    region: Optional[str] = None
    agency_id: Optional[str] = None
    vendor_id: Optional[str] = None
    actor: Optional[str] = "SCRO_REGULATOR"


class ExerciseRun(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    exercise_id: str
    name: str
    scenario_key: str
    impact_scope: str
    sector: Optional[str] = None
    region: Optional[str] = None
    vendor_id: Optional[str] = None
    assets_in_scope: int
    baseline_eal: float
    simulated_eal: float
    projected_surge: float
    projected_surge_percent: float
    status: str
    simulation: dict
    templates: dict


class ExerciseHistory(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    id: str
    name: str
    scenario_key: str
    impact_scope: Optional[str] = None
    sector: Optional[str] = None
    region: Optional[str] = None
    baseline_eal: float
    simulated_eal: float
    eal_reduction: float
    eal_reduction_percent: float
    status: Optional[str] = None
    executed_at: Optional[str] = None


# ── TPRM ──────────────────────────────────────────────────────────────────

class TPRMSummary(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    vendor_count: int
    total_attributable_eal_inr: float
    high_risk_vendor_count: int
    average_assessment_score: float
    exposed_asset_count: int


class VendorRisk(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    vendor_id: str
    name: str
    vendor_type: Optional[str] = None
    sector: Optional[str] = None
    region: Optional[str] = None
    criticality_score: Optional[int] = None
    assessment_score: float
    business_value_inr: float
    linked_asset_count: int
    attributable_eal_inr: float
    compromise_probability: float
    risk_band: str
    last_assessed_at: Optional[str] = None


class CascadeDependent(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    asset_name: str
    depth: int
    expected_annual_loss: float
    hop_path: list[str]


class CascadeAsset(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    asset_name: str
    service_type: Optional[str] = None
    risk_share: float
    asset_eal_inr: float
    attributable_eal_inr: float
    dependents: list[CascadeDependent]
    dependents_exposed_eal_inr: float


class VendorCascade(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    vendor_id: str
    name: str
    vendor_type: Optional[str] = None
    compromise_probability: float
    assessment_score: float
    direct_asset_count: int
    cascaded_eal_exposure_inr: float
    assets: list[CascadeAsset]


class VendorAttribution(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    vendor_id: str
    name: str
    vendor_type: Optional[str] = None
    service_type: Optional[str] = None
    risk_share: float
    contribution_eal_inr: float
    compromise_probability: float
    assessment_score: float


class AssetAttribution(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    asset_id: str
    asset_name: str
    sector: Optional[str] = None
    asset_eal_inr: float
    vendor_count: int
    unattributed_eal_inr: float
    vendors: list[VendorAttribution]


# ── Ingestion data sources ───────────────────────────────────────────────

class DataSourcePayload(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)

    source_key: str
    name: str
    connector_type: str
    status: str
    description: Optional[str] = None
    last_ingested_at: Optional[str] = None
    records_ingested: int = 0
    error_count: int = 0
