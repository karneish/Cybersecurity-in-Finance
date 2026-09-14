export interface RiskCalculation {
  id: string
  asset_id: string
  asset_name: string | null
  risk_score: number
  probability: number
  financial_impact_inr: number
  expected_annual_loss: number
  risk_category: string
  risk_factors: Record<string, unknown> | null
  control_reduction: number
  residual_risk: number
  calculated_at: string
  version: number
}

export interface EnterpriseRisk {
  total_eal: number
  total_assets: number
  total_vulnerabilities: number
  critical_risks: number
  high_risks: number
  medium_risks: number
  low_risks: number
  average_risk_score: number
  enterprise_risk_score: number
  top_risk_drivers: RiskDriver[]
}

export interface RiskDriver {
  asset_id: string
  asset_name: string
  risk_score: number
  expected_annual_loss: number
  risk_category: string
  open_vulns: number
}

export interface EALResult {
  total_eal: number
  asset_eals: AssetEAL[]
  breakdown_by_type: Record<string, number>
  breakdown_by_department: Record<string, number>
  breakdown_by_sensitivity: Record<string, number>
  breakdown_by_impact_component?: Record<string, number>
  value_at_risk?: {
    expected_annual_loss_inr: number
    mc_mean_inr: number
    p50_inr: number
    var95_inr: number
    p99_inr: number
    simulations: number
    value_at_risk_band: Record<string, number>
  }
}

export interface AssetEAL {
  asset_id: string
  asset_name: string
  asset_type: string
  department: string
  data_sensitivity: string
  eal: number
  risk_score: number
  probability: number
  financial_impact: number
  impact_components?: Record<string, number>
  impact_components_total?: number
  component_eal?: Record<string, number>
}

export interface ScenarioResult {
  current_eal: number
  simulated_eal: number
  eal_reduction: number
  eal_reduction_percent: number
  current_risk_score: number
  simulated_risk_score: number
  risk_score_change: number
  asset_changes: ScenarioAssetChange[]
  summary: string
}

export interface ScenarioAssetChange {
  asset_id: string
  asset_name: string
  original_eal: number
  simulated_eal: number
  eal_change: number
  original_risk_score: number
  simulated_risk_score: number
}

export interface RiskTrend {
  dates: string[]
  eal_values: number[]
  risk_scores: number[]
  vuln_counts: number[]
}
