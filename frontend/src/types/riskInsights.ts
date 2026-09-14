export interface DataQualityResult {
  total_assets: number
  confidence_percent: number
  gap_count: number
  asset_breakdown: {
    asset_id: string
    asset_name: string
    confidence_percent: number
    risk_score: number | null
    expected_annual_loss: number | null
    gaps: string[]
    recommendations: string[]
  }[]
}

export interface LossDistributionResult {
  simulations: number
  horizon_days: number
  expected_annual_loss_inr: number
  mc_mean_inr: number
  p5_inr: number
  p50_inr: number
  p95_inr: number
  p99_inr: number
  var95_inr?: number
  mean_exceedance_p95: number
  value_at_risk_band: {
    conservative_best: number
    expected: number
    adverse: number
    severe: number
  }
  loss_distribution_added_value: string
  histogram: { range_start: number; range_end: number; count: number; frequency: number }[]
  per_asset: { asset_id: string; asset_name: string; probability: number; expected_annual_loss: number }[]
}

export interface ComplianceMappingRow {
  control_type: string
  status: string
  coverage_score: number
  effectiveness_score: number
  mandates: [string, string, string][]
}

export interface ComplianceResult {
  mapped_requirements: ComplianceMappingRow[]
  regulations: string[]
  coverage: {
    active_controls: number
    total_control_types: number
    compliance_coverage_percent: number
  }
}

export interface ForecastPoint {
  month: number
  date: string
  eal_inr: number
  risk_score: number
  open_vulns: number
}

export interface ForecastResult {
  horizon_months: number
  baseline: {
    current_eal_inr: number
    current_risk_score: number
    current_open_vulns: number
  }
  method: string
  using_history: boolean
  series: ForecastPoint[]
  do_nothing_cost_12m: number
  eal_at_6_months: number
  eal_at_12_months: number
  insights?: {
    eal_multiple_6m: number
    eal_multiple_12m: number
    risk_score_band_12m: string
    threshold_crossings: string[]
  }
  explanation: string
}

export interface DataSourceResult {
  source_key: string
  name: string
  connector_type: string
  status: string
  description: string | null
  last_ingested_at: string | null
  records_ingested: number
  error_count: number
}

export interface AttackPathStage {
  asset_id: string
  asset_name: string
  hop_label: string
  stage_probability: number
  cumulative_probability: number
  open_vulnerabilities: number
  worst_cvss: number
  worst_vuln_title: string | null
  control_reduction: number
  active_controls: number
  eal_inr: number
  loss_at_stage: number
  time_hours: number
}

export interface AttackPathResult {
  path_name: string
  crown_jewel: string
  path_length: number
  stages: AttackPathStage[]
  overall_compromise_probability: number
  expected_loss_inr: number
  total_eal_at_risk_inr: number
  time_to_compromise_hours: number
  assumptions: string[]
}

export interface BlastRadiusAsset {
  id: string
  name: string
  asset_type: string
  criticality: string
  depth: number
}

export interface BlastRadiusResult {
  origin: { id: string; name: string; criticality: string }
  impacted_asset_count: number
  max_depth: number
  direct_impact_count: number
  indirect_impact_count: number
  exposed_eal_inr: number
  exposed_asset_value_inr: number
  impacted_nodes: BlastRadiusAsset[]
}

export interface RiskGraphNode {
  id: string
  name: string
  type: string
  risk_score: number
  asset_value_inr: number
}

export interface RiskGraphEdge {
  source: string
  target: string
  relationship: string
}

export interface RiskGraphResult {
  nodes: RiskGraphNode[]
  edges: RiskGraphEdge[]
}

export interface AuditEntryItem {
  id: string
  chain_position: number
  prev_hash: string
  data_hash: string
  action: string
  actor: string | null
  asset_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface AuditVerifyResult {
  status: string
  tampered: boolean
  checked: number
  details: { position: number; valid: boolean; action: string; data_hash: string }[]
}

export interface RiskSnapshotItem {
  id: string
  risk_score: number
  expected_annual_loss: number
  total_controls_active: number
  total_vulns_open: number
  snapshot_date: string
}