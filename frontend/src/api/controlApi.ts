import apiClient from './client'
import type { SecurityControl } from '../types/investment'

interface ControlAsset {
  asset_id: string
  control_id: string
  status: string
  coverage_score: number | null
  effectiveness_score: number | null
  maturity_level: number | null
  implemented_at: string | null
  last_verified_at: string | null
}

interface ControlEffectiveness {
  asset_id: string
  overall_effectiveness: number
  overall_coverage: number
  controls_implemented: number
  controls_total: number
  average_maturity_level: number
}

interface ControlCoverage {
  total_asset_controls: number
  implemented_controls: number
  coverage_percentage: number
  by_status: Record<string, number>
}

export const controlApi = {
  list: (params?: { controlType?: string }) =>
    apiClient.get<SecurityControl[]>('/controls', { params }),

  create: (data: Partial<SecurityControl>) =>
    apiClient.post<SecurityControl>('/controls', data),

  getByAsset: (assetId: string) =>
    apiClient.get<ControlAsset[]>(`/controls/asset/${assetId}`),

  getEffectiveness: (assetId: string) =>
    apiClient.get<ControlEffectiveness>('/controls/effectiveness', { params: { assetId } }),

  getCoverage: () =>
    apiClient.get<ControlCoverage>('/controls/coverage'),

  updateAssetControlStatus: (assetControlId: string, status: string) =>
    apiClient.put(`/controls/${assetControlId}/status`, null, { params: { status } }),
}
