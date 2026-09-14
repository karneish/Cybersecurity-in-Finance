export interface OptimizeResult {
  total_budget: number
  total_allocated: number
  remaining_budget: number
  expected_risk_reduction: number
  expected_eal_reduction: number
  portfolio_rosi: number
  items: InvestmentItem[]
  summary: string
}

export interface InvestmentItem {
  control_id: string
  control_name: string
  control_type: string
  allocation_inr: number
  risk_reduction: number
  expected_rosi: number
  priority: number
  implementation_cost: number
  annual_maintenance: number
}

export interface ROSIResult {
  control_id: string
  control_name: string
  control_type: string
  implementation_cost: number
  annual_maintenance: number
  risk_reduction_value: number
  net_benefit: number
  rosi_percent: number
  payback_months: number
}

export interface InvestmentPlan {
  id: string
  name: string
  total_budget_inr: number
  expected_risk_reduction: number
  expected_eal_reduction_inr: number
  rosi: number
  status: string
  items: InvestmentItem[]
  created_at: string
}

export interface SecurityControl {
  id: string
  name: string
  control_type: string
  implementation_cost: number
  annual_maintenance: number
  max_risk_reduction: number
  implementation_time_days: number
}

export interface CurvePoint {
  budget_inr: number
  allocated_inr: number
  remaining_inr: number
  current_eal_inr: number
  expected_eal_reduction_inr: number
  residual_eal_inr: number
  risk_reduction_percent: number
  portfolio_rosi_percent: number
}

export interface InvestmentCurve {
  current_eal_inr: number
  max_budget_inr: number
  time_horizon_years: number
  points: CurvePoint[]
  optimal_budget_inr: number
  optimal_budget_rosi_percent: number
  explanation: string
}
