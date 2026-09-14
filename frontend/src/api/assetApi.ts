import apiClient from './client'
import type { Asset, AssetDependency } from '../types/asset'

interface AssetStats {
  total: number
  by_type: Record<string, number>
  by_environment: Record<string, number>
  by_department: Record<string, number>
  internet_exposed: number
  avg_criticality: number
}

interface CriticalityResponse {
  id: string
  criticality_score: number
}

export const assetApi = {
  list: (params?: {
    asset_type?: string
    department?: string
    internet_exposed?: boolean
    min_criticality?: number
    page?: number
    size?: number
  }) => apiClient.get<{ data: Asset[]; total: number }>('/assets', { params }),

  getById: (id: string) => apiClient.get<Asset>(`/assets/${id}`),

  create: (data: Partial<Asset>) => apiClient.post<Asset>('/assets', data),

  update: (id: string, data: Partial<Asset>) => apiClient.put<Asset>(`/assets/${id}`, data),

  delete: (id: string) => apiClient.delete(`/assets/${id}`),

  getDependencies: (assetId: string) =>
    apiClient.get<AssetDependency[]>(`/assets/${assetId}/dependencies`),

  addDependency: (assetId: string, data: { depends_on_id: string; dependency_type: string; criticality: number }) =>
    apiClient.post<AssetDependency>(`/assets/${assetId}/dependencies`, data),

  getCriticality: (assetId: string) =>
    apiClient.get<CriticalityResponse>(`/assets/criticality/${assetId}`),

  getStats: () => apiClient.get<AssetStats>('/assets/stats'),
}
