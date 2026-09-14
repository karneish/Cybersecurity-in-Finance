import { useState, useEffect } from 'react'
import { riskApi } from '@/api/riskApi'
import { assetApi } from '@/api/assetApi'
import RiskMatrix from '@/components/risk/RiskMatrix'
import RiskTimeline from '@/components/risk/RiskTimeline'
import RiskDetailModal from '@/components/risk/RiskDetailModal'
import FinancialExposureChart from '@/components/charts/FinancialExposureChart'
import RiskBreakdownTree from '@/components/risk/RiskBreakdownTree'
import ForecastChart from '@/components/insights/ForecastChart'
import ComplianceCard from '@/components/insights/ComplianceCard'
import DataSourcesPanel from '@/components/insights/DataSourcesPanel'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { EnterpriseRisk, RiskTrend, EALResult } from '@/types/risk'
import type { Asset } from '@/types/asset'
import { scoreTextColor, scoreRingColor } from '@/theme/severity'
import { clsx } from 'clsx'

function formatINR(value: number): string {
  if (value >= 10000000) return '\u20B9' + (value / 10000000).toFixed(2) + ' Cr'
  if (value >= 100000) return '\u20B9' + (value / 100000).toFixed(2) + ' L'
  return '\u20B9' + value.toLocaleString('en-IN')
}

export default function RiskAnalysis() {
  const [enterpriseRisk, setEnterpriseRisk] = useState<EnterpriseRisk | null>(null)
  const [trends, setTrends] = useState<RiskTrend | null>(null)
  const [eal, setEal] = useState<EALResult | null>(null)
  const [, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      riskApi.getScore(),
      riskApi.getTrends(),
      riskApi.getEAL(),
      assetApi.list({ size: 100 }),
    ])
      .then(([scoreRes, trendRes, ealRes, assetRes]) => {
        setEnterpriseRisk(scoreRes.data)
        setTrends(trendRes.data)
        setEal(ealRes.data)
        setAssets(assetRes.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const score = enterpriseRisk?.enterprise_risk_score ?? 0
  const circumference = 2 * Math.PI * 80
  const dashOffset = circumference - (score / 100) * circumference

  const matrixAssets = (eal?.asset_eals ?? []).map((a) => ({
    name: a.asset_name,
    probability: a.probability,
    financial_impact: a.financial_impact,
    risk_score: a.risk_score,
  }))

  const sortedAssets = [...(eal?.asset_eals ?? [])].sort((a, b) => b.eal - a.eal)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Risk Analysis</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="relative flex flex-col items-center justify-center rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm">
          <svg className="h-44 w-44 -rotate-90">
            <circle cx="88" cy="88" r="80" fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
            <circle
              cx="88"
              cy="88"
              r="80"
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className={clsx('transition-all duration-700', scoreRingColor(score))}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute mt-1">
            <p className={clsx('text-4xl font-bold', scoreTextColor(score))}>{score.toFixed(1)}</p>
            <p className="text-center text-sm text-text-tertiary">Enterprise Risk</p>
          </div>
        </div>
        <div className="lg:col-span-3">
          <RiskBreakdownTree drivers={enterpriseRisk?.top_risk_drivers ?? []} />
        </div>
      </div>

      <RiskMatrix assets={matrixAssets} />

      <RiskTimeline
        data={trends ?? { dates: [], eal_values: [], risk_scores: [], vuln_counts: [] }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ForecastChart />
        </div>
        <ComplianceCard />
      </div>

      <FinancialExposureChart />

      <DataSourcesPanel />

      <div className="cyber-card">
        <div className="border-b border-border-default px-6 py-4">
          <h3 className="text-sm font-semibold text-text-primary">All Assets by EAL</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-subtle">
            <thead className="bg-bg-surface">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Asset
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  Risk Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                  EAL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle bg-bg-surface">
              {sortedAssets.map((a) => (
                <tr
                  key={a.asset_id}
                  onClick={() => setDetailAssetId(a.asset_id)}
                  className="cursor-pointer transition-colors hover:bg-bg-hover"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-text-primary">
                    {a.asset_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                    {a.asset_type}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-text-secondary">
                    {a.department}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={clsx('text-sm font-bold', scoreTextColor(a.risk_score))}>
                      {a.risk_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-status-high">
                    {formatINR(a.eal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RiskDetailModal
        open={detailAssetId !== null}
        assetId={detailAssetId}
        onClose={() => setDetailAssetId(null)}
      />
    </div>
  )
}
