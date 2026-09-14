export interface Asset {
  id: string
  name: string
  asset_type: string
  environment: string
  owner: string
  department: string
  ip_address: string | null
  operating_system: string | null
  business_value_inr: number
  replacement_cost_inr: number
  internet_exposed: boolean
  criticality_score: number
  data_sensitivity: string
  annual_revenue_impact: number
  created_at: string
  updated_at: string
}

export interface AssetDependency {
  id: string
  asset_id: string
  depends_on_id: string
  dependency_type: string
  criticality: number
}

export type AssetType = 'SERVER' | 'DATABASE' | 'APPLICATION' | 'NETWORK' | 'CLOUD' | 'ENDPOINT'
export type Environment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT'
export type DataSensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED'
