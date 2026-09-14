import { useRiskData } from '@/hooks/useRiskData'
import { investmentApi } from '@/api/investmentApi'
import { riskApi } from '@/api/riskApi'
import RiskScoreCard from '@/components/dashboard/RiskScoreCard'
import EALCard from '@/components/dashboard/EALCard'
import BudgetCard from '@/components/dashboard/BudgetCard'
import KpiTile from '@/components/dashboard/KpiTile'
import TopRiskCard from '@/components/dashboard/TopRiskCard'
import VulnerabilityPieChart from '@/components/charts/VulnerabilityPieChart'
import RiskTrendChart from '@/components/charts/RiskTrendChart'
import RecentEventsFeed from '@/components/dashboard/RecentEventsFeed'
import FinancialExposureChart from '@/components/charts/FinancialExposureChart'
import DataQualityCard from '@/components/insights/DataQualityCard'
import LossDistributionCard from '@/components/insights/LossDistributionCard'
import ComplianceCard from '@/components/insights/ComplianceCard'
import AuditChainPanel from '@/components/insights/AuditChainPanel'
import ImpactCompositionChart from '@/components/dashboard/ImpactCompositionChart'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { useEffect, useState } from 'react'
import { ShieldAlert, Siren, TrendingUp } from 'lucide-react'

const BUDGET_TOTAL = 10000000

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

function moM(values: number[] | undefined): number | undefined {
  if (!values || values.length < 2) return undefined
  const latest = values[values.length - 1]
  const previous = values[values.length - 2]
  if (previous === 0) return undefined
  return ((latest - previous) / previous) * 100
}

export default function ExecutiveDashboard() {
  const { enterpriseRisk, eal, trends, loading, error } = useRiskData()
  const [allocated, setAllocated] = useState(0)
  const [var95, setVar95] = useState<number | null>(null)
  const [forecastEal, setForecastEal] = useState<number | null>(null)

  useEffect(() => {
    investmentApi
      .optimize({ budget_inr: BUDGET_TOTAL })
      .then((res) => setAllocated(res.data.total_allocated))
      .catch(() => setAllocated(0))
  }, [])

  useEffect(() => {
    riskApi
      .getLossDistribution(2000)
      .then((res) => setVar95(res.data.var95_inr ?? res.data.p95_inr ?? null))
      .catch(() => setVar95(null))
  }, [])

  useEffect(() => {
    riskApi
      .getForecast(12)
      .then((res) => setForecastEal(res.data.eal_at_12_months ?? null))
      .catch(() => setForecastEal(null))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="cyber-card p-6 text-center text-status-critical">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Executive Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <RiskScoreCard score={enterpriseRisk?.enterprise_risk_score ?? 0} previousScore={moM(trends?.risk_scores)} />
        <EALCard eal={eal?.total_eal ?? 0} previousEal={moM(trends?.eal_values)} />
        <BudgetCard allocated={allocated} total={BUDGET_TOTAL} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          icon={Siren}
          label="VaR95 (Monte-Carlo)"
          value={var95 !== null ? formatINR(var95) : '—'}
          sub="p95 of simulated annual loss"
          tone="high"
        />
        <KpiTile
          icon={ShieldAlert}
          label="Open Vulnerabilities"
          value={enterpriseRisk?.total_vulnerabilities ?? 0}
          sub={`${enterpriseRisk?.critical_risks ?? 0} critical, ${enterpriseRisk?.high_risks ?? 0} high risks`}
          tone="critical"
        />
        <KpiTile
          icon={TrendingUp}
          label="Forecasted EAL (12m)"
          value={forecastEal !== null ? formatINR(forecastEal) : '—'}
          sub="do-nothing trajectory"
          tone="medium"
        />
        <KpiTile
          icon={ShieldAlert}
          label="Assets Monitored"
          value={enterpriseRisk?.total_assets ?? 0}
          sub={`avg score ${enterpriseRisk?.average_risk_score?.toFixed(1) ?? '—'} / 100`}
          tone="low"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopRiskCard drivers={enterpriseRisk?.top_risk_drivers ?? []} />
        </div>
        <div className="cyber-card p-6">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Vulnerability Distribution</h3>
          <VulnerabilityPieChart />
        </div>
      </div>

      <RiskTrendChart data={trends} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ImpactCompositionChart />
        </div>
        <DataQualityCard />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <LossDistributionCard />
        <ComplianceCard />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentEventsFeed />
        <FinancialExposureChart />
      </div>

      <AuditChainPanel />
    </div>
  )
}