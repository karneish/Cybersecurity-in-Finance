import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import EChart, { type EChartsCoreOption } from '@/components/charts/EChart'
import { BrainCircuit, TrendingDown, Loader2 } from 'lucide-react'
import { useChartTokens } from '@/theme/chartTokens'
import type { ForecastResult } from '@/types/riskInsights'

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

type ForecastMode = 'do-nothing' | 'ml'

export default function ForecastChart() {
  const t = useChartTokens()
  const [mode, setMode] = useState<ForecastMode>('do-nothing')
  const [forecast, setForecast] = useState<ForecastResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const call = mode === 'ml' ? riskApi.getMLForecast() : riskApi.getForecast()
    call
      .then((res) => setForecast(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [mode])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Projecting {mode === 'ml' ? 'ML' : 'do-nothing'} trajectory...
      </div>
    )
  }

  if (!forecast) return null

  const labels = (forecast.series ?? []).map((s) => `M${s.month}`)
  const option: EChartsCoreOption = {
    color: ['#B8393F', '#5B7DB1'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.tooltipText },
      valueFormatter: (value: unknown) => `₹${Number(value).toLocaleString('en-IN')}`,
    },
    legend: { data: ['Projected EAL', 'Projected Risk Score'], top: 0 },
    grid: { left: 60, right: 40, top: 34, bottom: 30 },
    xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 11, color: t.axisLabel } },
    yAxis: [
      { type: 'value', name: 'EAL (₹)', splitLine: { lineStyle: { color: t.splitLine } } },
      { type: 'value', name: 'Score', min: 0, max: 100, splitLine: { show: false } },
    ],
    series: [
      {
        name: 'Projected EAL',
        type: 'line',
        data: (forecast.series ?? []).map((s) => s.eal_inr),
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        markLine: {
          symbol: 'none',
          label: { formatter: 'current' },
          data: [{ yAxis: forecast.baseline.current_eal_inr }],
        },
      },
      {
        name: 'Projected Risk Score',
        type: 'line',
        yAxisIndex: 1,
        data: (forecast.series ?? []).map((s) => s.risk_score),
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
      },
    ],
  }

  const isML = forecast.method.toLowerCase().includes('xgboost')

  return (
    <div className="cyber-card p-6" data-tour="eal-forecast">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          {isML ? (
            <BrainCircuit className="h-4 w-4 text-accent-primary" />
          ) : (
            <TrendingDown className="h-4 w-4 text-status-critical" />
          )}
          {isML ? 'ML Forecast (XGBoost)' : 'Do-Nothing Forecast (12 Months)'}
        </h3>
        <div className="flex rounded-lg border border-surface-border p-0.5 text-xs">
          <button
            onClick={() => setMode('do-nothing')}
            className={`rounded-md px-3 py-1 transition-colors ${
              mode === 'do-nothing' ? 'bg-accent-primary text-white' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            Do-Nothing
          </button>
          <button
            onClick={() => setMode('ml')}
            className={`rounded-md px-3 py-1 transition-colors ${
              mode === 'ml' ? 'bg-accent-primary text-white' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            ML (XGBoost)
          </button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-accent-primary/10 px-3 py-1 text-accent-primary">
          Today: {formatINR(forecast.baseline.current_eal_inr)}
        </span>
        <span className="rounded-lg bg-status-high/10 px-3 py-1 text-status-high">
          6m: {formatINR(forecast.eal_at_6_months)}
        </span>
        <span className="rounded-lg bg-status-critical/10 px-3 py-1 text-status-critical">
          12m: {formatINR(forecast.eal_at_12_months)}
        </span>
        {forecast.insights?.eal_multiple_12m != null && (
          <span
            className={`rounded-lg px-3 py-1 ${
              forecast.insights.eal_multiple_12m >= 1.5
                ? 'bg-status-critical/10 text-status-critical'
                : 'bg-status-medium/10 text-status-medium'
            }`}
          >
            {forecast.insights.eal_multiple_12m.toFixed(1)}x current in 12m ·{' '}
            {forecast.insights.risk_score_band_12m}
          </span>
        )}
      </div>
      <EChart option={option} height={280} />
      {forecast.insights?.threshold_crossings?.length ? (
        <div className="mt-2 space-y-1">
          {forecast.insights.threshold_crossings.map((t) => (
            <p key={t} className="text-[11px] text-status-medium">
              ◈ {t}
            </p>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-text-tertiary">{forecast.method}</p>
    </div>
  )
}
