import apiClient from './client'
import type { AIQueryResponse, AIRecommendation, AIExplainResponse } from '../types/api'

export const aiApi = {
  query: (question: string) =>
    apiClient.post<AIQueryResponse>('/ai/query', { question }),

  getRecommendations: (focusArea?: string, context = 'general') =>
    apiClient.post<AIRecommendation>('/ai/recommend', { context, focus_area: focusArea }),

  explainAsset: (assetId: string, detailLevel = 'standard') =>
    apiClient.post<AIExplainResponse>(`/ai/explain/risk/${assetId}`, { asset_id: assetId, detail_level: detailLevel }),
}
