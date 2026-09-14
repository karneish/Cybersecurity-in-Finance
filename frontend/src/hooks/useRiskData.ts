import { useState, useEffect, useCallback } from 'react'
import { riskApi } from '@/api/riskApi'
import { vulnerabilityApi } from '@/api/vulnerabilityApi'
import type { EnterpriseRisk, EALResult, RiskTrend } from '@/types/risk'
import type { Vulnerability } from '@/types/vulnerability'

interface RiskDataState {
  enterpriseRisk: EnterpriseRisk | null
  eal: EALResult | null
  trends: RiskTrend | null
  vulnerabilities: Vulnerability[]
  loading: boolean
  error: string | null
}

export function useRiskData() {
  const [state, setState] = useState<RiskDataState>({
    enterpriseRisk: null,
    eal: null,
    trends: null,
    vulnerabilities: [],
    loading: true,
    error: null,
  })

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [scoreRes, ealRes, trendRes, vulnRes] = await Promise.allSettled([
        riskApi.getScore(),
        riskApi.getEAL(),
        riskApi.getTrends(),
        vulnerabilityApi.list({ page: 1, size: 10 }),
      ])

      const hasAnyFailure = [scoreRes, ealRes, trendRes, vulnRes].some(
        (r) => r.status === 'rejected'
      )

      if (scoreRes.status === 'rejected' && ealRes.status === 'rejected') {
        throw new Error('Failed to load risk data')
      }

      setState({
        enterpriseRisk: scoreRes.status === 'fulfilled' ? scoreRes.value.data : null,
        eal: ealRes.status === 'fulfilled' ? ealRes.value.data : null,
        trends: trendRes.status === 'fulfilled' ? trendRes.value.data : null,
        vulnerabilities: vulnRes.status === 'fulfilled' ? vulnRes.value.data.data : [],
        loading: false,
        error: hasAnyFailure ? 'Some data failed to load' : null,
      })
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.message || 'Failed to load risk data',
      }))
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { ...state, refresh: fetch }
}
