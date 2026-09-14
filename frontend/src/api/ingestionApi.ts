import apiClient from './client'

export const ingestionApi = {
  simulateVulnerability: (payload: { assetId: string; cvss: number; cveId?: string; title?: string }) =>
    apiClient.post('/ingestion/simulate/vulnerability', payload),

  remediateVulnerability: (payload: { assetId: string; cveId?: string }) =>
    apiClient.post('/ingestion/simulate/remediate', payload),

  changeControl: (payload: { assetId: string; controlType: string; status: string }) =>
    apiClient.post('/ingestion/simulate/control', payload),

  simulateBatch: (count = 5) =>
    apiClient.post(`/ingestion/simulate?count=${count}`),

  getStats: () => apiClient.get('/ingestion/stats'),
}