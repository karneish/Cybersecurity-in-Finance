export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  size: number
}

export interface User {
  id: string
  username: string
  email: string
  full_name: string
  role: 'ADMIN' | 'CISO' | 'ANALYST' | 'VIEWER'
}

export interface LoginResponse {
  token: string
  refresh_token: string
  expires_in: number
  user: User
}

export interface AIRecommendation {
  recommendations: { action: string; priority: number; details?: string }[]
  summary: string
  data_sources: string[]
}

export interface AIQueryResponse {
  answer: string
  data_used: Record<string, unknown>
  confidence: number
  source: string
  intent?: string
  data_source?: string
}

export interface AIExplainResponse {
  asset_id: string
  asset_name: string
  explanation: string
  risk_factors: string[]
  key_metrics: Record<string, number>
  recommendations: string[]
}

export interface SecurityControlOption {
  id: string
  name: string
  control_type: string
  implementation_cost: number
  annual_maintenance: number
  max_risk_reduction: number
  implementation_time_days: number
}
