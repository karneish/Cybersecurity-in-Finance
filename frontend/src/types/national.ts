export interface SectorRank {
  sector: string
  expected_annual_loss: number
  sovereign_risk_index: number
}

export interface CriticalInfraAsset {
  asset_id: string
  asset_name: string
  expected_annual_loss: number
  open_vulns: number | null
  sector: string | null
}

export interface NationalSummary {
  as_on: string
  total_eal_inr: number
  average_risk_score: number
  sovereign_risk_index: number
  total_assets: number
  critical_infra_count: number
  total_open_vulns: number
  top_sectors: SectorRank[]
  top_critical_infra_assets: CriticalInfraAsset[]
  regions_present: string[]
  framing?: string
}

export interface SectorRollup {
  sector: string
  sector_name: string
  regulator: string | null
  sector_weight: number
  asset_count: number
  critical_infra_count: number
  expected_annual_loss: number
  eal_share_percent: number
  average_risk_score: number
  control_coverage_percent: number
  data_confidence_percent: number
  open_vuln_count: number
  sovereign_risk_index: number
  threshold_critical_mln: number
  threshold_exceeded: boolean
  critical_infra_assets: CriticalInfraAsset[]
}

export interface RegionPayload {
  regions: string[]
  sectors: string[]
  region_totals: Record<string, number>
  matrix: number[][]
  national_total_eal: number
}

export interface AgencyAsset {
  asset_id: string
  asset_name: string
  sector: string | null
  critical_infra: boolean
  expected_annual_loss: number
  risk_score: number
}

export interface AgencyRollup {
  agency_id: string
  name: string
  agency_type: string | null
  sector: string | null
  region: string | null
  classification: string | null
  parent_agency_id: string | null
  asset_count: number
  critical_infra_count: number
  expected_annual_loss: number
  assets: AgencyAsset[]
}

export interface SRIDetail {
  sector: string
  sovereign_risk_index: number
  expected_annual_loss: number
  input_factors: Record<string, number>
}

export interface SRIPayload {
  sovereign_risk_index: number
  total_eal_inr: number
  breakdown: SRIDetail[]
}

export interface ComplianceRequirement {
  control_type: string
  status: string
  coverage_score: number
  effectiveness_score: number
  mandates: string[][]
}

export interface ComplianceCoverage {
  active_controls: number
  total_control_types: number
  compliance_coverage_percent: number
}

export interface SectorCompliance {
  sector: string
  regulators: string[]
  mapped_requirements: ComplianceRequirement[]
  coverage: ComplianceCoverage
}

export interface EarlyWarningRow {
  id: string
  warning_type: string
  target_type: string | null
  target_id: string | null
  severity: string | null
  title: string | null
  status: string | null
  created_at: string | null
}

export interface NationalReport {
  national: NationalSummary
  sectors: SectorRollup[]
  regions: RegionPayload
  agencies: AgencyRollup[]
  compliance: Record<string, unknown>
  compliance_by_sector: Record<string, SectorCompliance>
  data_quality: Record<string, unknown>
  audit_chain: Record<string, unknown>
  early_warnings: EarlyWarningRow[]
}

export interface ExerciseRun {
  exercise_id: string
  name: string
  scenario_key: string
  impact_scope: string
  sector: string | null
  region: string | null
  vendor_id: string | null
  assets_in_scope: number
  baseline_eal: number
  simulated_eal: number
  projected_surge: number
  projected_surge_percent: number
  status: string
  simulation: Record<string, unknown>
  templates: Record<string, unknown>
}

export interface ExerciseHistory {
  id: string
  name: string
  scenario_key: string
  impact_scope: string | null
  sector: string | null
  region: string | null
  baseline_eal: number
  simulated_eal: number
  eal_reduction: number
  eal_reduction_percent: number
  status: string | null
  executed_at: string | null
}

export interface TPRMSummary {
  vendor_count: number
  total_attributable_eal_inr: number
  high_risk_vendor_count: number
  average_assessment_score: number
  exposed_asset_count: number
}

export interface VendorRisk {
  vendor_id: string
  name: string
  vendor_type: string | null
  sector: string | null
  region: string | null
  criticality_score: number | null
  assessment_score: number
  business_value_inr: number
  linked_asset_count: number
  attributable_eal_inr: number
  compromise_probability: number
  risk_band: string
  last_assessed_at: string | null
}

export interface CascadeDependent {
  asset_id: string
  asset_name: string
  depth: number
  expected_annual_loss: number
  hop_path: string[]
}

export interface CascadeAsset {
  asset_id: string
  asset_name: string
  service_type: string | null
  risk_share: number
  asset_eal_inr: number
  attributable_eal_inr: number
  dependents: CascadeDependent[]
  dependents_exposed_eal_inr: number
}

export interface VendorCascade {
  vendor_id: string
  name: string
  vendor_type: string | null
  compromise_probability: number
  assessment_score: number
  direct_asset_count: number
  cascaded_eal_exposure_inr: number
  assets: CascadeAsset[]
}

export interface VendorAttribution {
  vendor_id: string
  name: string
  vendor_type: string | null
  service_type: string | null
  risk_share: number
  contribution_eal_inr: number
  compromise_probability: number
  assessment_score: number
}

export interface AssetAttribution {
  asset_id: string
  asset_name: string
  sector: string | null
  asset_eal_inr: number
  vendor_count: number
  unattributed_eal_inr: number
  vendors: VendorAttribution[]
}

export interface SectorControlItem {
  control_id: string
  control_type: string
  control_name: string
  allocation_inr: number
  annual_maintenance: number
  projected_eal_reduction: number
  expected_rosi: number
  priority: number
}

export interface SectorAllocation {
  sector: string
  baseline_eal: number
  asset_count: number
  critical_infra_count: number
  allocated_inr: number
  projected_eal_reduction: number
  residual_eal: number
  items: SectorControlItem[]
}

export interface NationalOptimizeResult {
  mode: string
  total_budget: number
  total_allocated: number
  remaining_budget: number
  current_eal: number
  expected_eal_reduction: number
  expected_risk_reduction_fraction: number
  residual_eal: number
  portfolio_rosi: number
  sector_count: number
  selected_control_count: number
  sectors: SectorAllocation[]
  summary: string
}