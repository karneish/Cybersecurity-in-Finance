import apiClient from './client'
import type { EnterpriseRisk, EALResult, RiskCalculation, RiskTrend, ScenarioResult } from '../types/risk'
import type { DataSourceResult } from '../types/riskInsights'
import type {
  AgencyRollup,
  AssetAttribution,
  ExerciseHistory,
  ExerciseRun,
  NationalReport,
  NationalSummary,
  RegionPayload,
  SectorCompliance,
  SectorRollup,
  SRIPayload,
  TPRMSummary,
  VendorCascade,
  VendorRisk,
} from '../types/national'

export const riskApi = {
  calculateAsset: (assetId: string) =>
    apiClient.post<RiskCalculation>(`/risk/calculate?asset_id=${assetId}`),

  calculateAll: () => apiClient.post('/risk/calculate-all'),

  getScore: () => apiClient.get<EnterpriseRisk>('/risk/score'),

  getEAL: (includeVar = false) =>
    apiClient.get<EALResult>(`/risk/eal?include_var=${includeVar}`),

  getDrivers: (limit = 10) => apiClient.get(`/risk/drivers?limit=${limit}`),

  getTrends: (days = 30) => apiClient.get<RiskTrend>(`/risk/trends?days=${days}`),

  simulateScenario: (changes: Record<string, unknown>[]) =>
    apiClient.post<ScenarioResult>('/risk/scenario/simulate', { changes }),

  sendEvent: (event: { event_type: string; asset_id?: string; source: string; details: Record<string, unknown> }) =>
    apiClient.post('/risk/event', event),

  getAssetRisk: (assetId: string) =>
    apiClient.get<RiskCalculation>(`/risk/asset/${assetId}`),

  getRiskGraph: () => apiClient.get('/risk/graph'),

  getBlastRadius: (assetId: string) =>
    apiClient.get(`/risk/blast-radius/${assetId}`),

  getAttackPath: () => apiClient.get('/risk/attack-path'),

  getDataQuality: () => apiClient.get('/risk/data-quality'),

  getDataQualityForAsset: (assetId: string) =>
    apiClient.get(`/risk/data-quality/${assetId}`),

  getLossDistribution: (simulations = 5000) =>
    apiClient.get(`/risk/loss-distribution?simulations=${simulations}`),

  getCompliance: () => apiClient.get('/risk/compliance'),

  getForecast: (horizonMonths = 12) =>
    apiClient.get(`/risk/forecast?horizon_months=${horizonMonths}`),

  createSnapshot: () => apiClient.post('/risk/snapshot'),

  getSnapshots: () => apiClient.get('/risk/snapshots'),

  getAuditChain: () => apiClient.get('/risk/audit/chain'),

  verifyAuditChain: () => apiClient.get('/risk/audit/verify'),

  getNationalSummary: () => apiClient.get<NationalSummary>('/risk/national/summary'),

  getNationalSectors: () => apiClient.get<SectorRollup[]>('/risk/national/sectors'),

  getNationalRegions: (params?: { sector?: string }) =>
    apiClient.get<RegionPayload>('/risk/national/regions', { params }),

  getNationalAgencies: () => apiClient.get<AgencyRollup[]>('/risk/national/agencies'),

  getNationalSRI: () => apiClient.get<SRIPayload>('/risk/national/sri'),

  getNationalReport: () => apiClient.get<NationalReport>('/risk/national/report'),

  getSectorCompliance: (sector: string) =>
    apiClient.get<SectorCompliance>(`/risk/compliance/${sector}`),

  runExercise: (data: {
    name: string
    scenario_key: string
    impact_scope?: string
    sector?: string
    region?: string
    agency_id?: string
    vendor_id?: string
    actor?: string
  }) => apiClient.post<ExerciseRun>('/risk/exercises', data),

  rerunExercise: (exerciseId: string) =>
    apiClient.post<ExerciseRun>(`/risk/exercises/${exerciseId}/rerun`),

  getExercises: () => apiClient.get<ExerciseHistory[]>('/risk/exercises'),

  getDataSources: () => apiClient.get<DataSourceResult[]>('/risk/data-sources'),

  getTPRMSummary: () => apiClient.get<TPRMSummary>('/risk/tprm'),

  getTPRMVendors: () => apiClient.get<VendorRisk[]>('/risk/tprm/vendors'),

  getTPRMCascade: (vendorId: string) =>
    apiClient.get<VendorCascade>(`/risk/tprm/cascade/${vendorId}`),

  getTPRMAsset: (assetId: string) =>
    apiClient.get<AssetAttribution>(`/risk/tprm/asset/${assetId}`),
}
