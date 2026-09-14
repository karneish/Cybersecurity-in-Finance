import { create } from 'zustand'
import type { EnterpriseRisk, EALResult, RiskDriver, RiskTrend } from '../types/risk'
import { riskApi } from '../api/riskApi'

interface RiskState {
  enterpriseRisk: EnterpriseRisk | null
  eal: EALResult | null
  drivers: RiskDriver[]
  trends: RiskTrend | null
  loading: boolean
  error: string | null
  fetchRiskScore: () => Promise<void>
  fetchEAL: () => Promise<void>
  fetchDrivers: (limit?: number) => Promise<void>
  fetchTrends: (days?: number) => Promise<void>
}

export const useRiskStore = create<RiskState>((set) => ({
  enterpriseRisk: null,
  eal: null,
  drivers: [],
  trends: null,
  loading: false,
  error: null,

  fetchRiskScore: async () => {
    set({ loading: true, error: null })
    try {
      const response = await riskApi.getScore()
      set({ enterpriseRisk: response.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to fetch risk score', loading: false })
    }
  },

  fetchEAL: async () => {
    set({ loading: true, error: null })
    try {
      const response = await riskApi.getEAL()
      set({ eal: response.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to fetch EAL', loading: false })
    }
  },

  fetchDrivers: async (limit = 10) => {
    set({ loading: true, error: null })
    try {
      const response = await riskApi.getDrivers(limit)
      set({ drivers: response.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to fetch risk drivers', loading: false })
    }
  },

  fetchTrends: async (days = 30) => {
    set({ loading: true, error: null })
    try {
      const response = await riskApi.getTrends(days)
      set({ trends: response.data, loading: false })
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to fetch trends', loading: false })
    }
  },
}))
