import { useEffect, useMemo, useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { investmentApi } from '@/api/investmentApi'
import EChart, { type EChartsCoreOption } from '@/components/charts/EChart'
import { useChartTokens } from '@/theme/chartTokens'
import type { InvestmentCurve } from '@/types/investment'

interface InvestmentCurveChartProps {
  onBudgetSelect?: (budgetInr: number) => void
}

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function InvestmentCurveChart({ onBudgetSelect }: InvestmentCurveChartProps) {
  const t = useChartTokens()
  const [curve, setCurve] = useState<InvestmentCurve | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    investmentApi
      .getCurve({ max_budget_inr: 100_000_000, steps: 16, time_horizon_years: 1 })
      .then((res) => setCurve(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const option = useMemo<EChartsCoreOption | null>(() => {
    if (!curve || curve.points.length === 0) return null

    const points = [...curve.points].sort((a, b) => a.budget_inr - b.budget_inr)
    const budgets = points.map((p) => `₹${(p.budget_inr / 100000).toFixed(0)}L`)
    const reduction = points.map((p) => Math.round(p.expected_eal_reduction_inr))
    const rosi = points.map((p) => Number(p.portfolio_rosi_percent.toFixed(1)))

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.tooltipText },
        axisPointer: { type: 'cross' },
      },
      legend: { data: ['EAL reduction', 'Portfolio ROSI'], top: 0 },
      grid: { left: 70, right: 70, top: 36, bottom: 30 },
      xAxis: {
        type: 'category',
        data: budgets,
        name: 'Security budget',
        nameTextStyle: { fontSize: 11, color: t.axisLabel },
        axisLabel: { fontSize: 10, color: t.axisLabel, rotate: 30 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'EAL reduction (₹/yr)',
          nameTextStyle: { fontSize: 11, color: t.axisLabel },
          axisLabel: {
            fontSize: 10,
            color: t.axisLabel,
            formatter: (v: number) => (v >= 10000000 ? `${(v / 10000000).toFixed(1)} Cr` : `${(v / 100000).toFixed(0)}L`),
          },
        },
        {
          type: 'value',
          name: 'ROSI %',
          nameTextStyle: { fontSize: 11, color: '#2F7D52' },
          splitLine: { show: false },
          axisLabel: { fontSize: 10, color: '#2F7D52', formatter: '{value}%' },
        },
      ],
      series: [
        {
          name: 'EAL reduction',
          type: 'bar',
          data: reduction,
          itemStyle: { color: t.seriesSecondary },
          barWidth: 16,
        },
        {
          name: 'Portfolio ROSI',
          type: 'line',
          yAxisIndex: 1,
          data: rosi,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: '#2F7D52', width: 2 },
          itemStyle: { color: '#2F7D52' },
        },
      ],
    }
  }, [curve, t])

  const topRosi = useMemo(() => {
    if (!curve || curve.points.length === 0) return null
    return [...curve.points].sort((a, b) => b.portfolio_rosi_percent - a.portfolio_rosi_percent)[0]
  }, [curve])

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sweeping the investment curve...
      </div>
    )
  }

  if (error || !curve) {
    return (
      <div className="cyber-card p-6 text-center text-sm text-text-tertiary">
        Investment curve unavailable. Is the investment-optimizer service running?
      </div>
    )
  }

  return (
    <div className="cyber-card p-6" data-tour="investment-curve">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Activity className="h-4 w-4 text-accent-primary" />
          Investment Curve — EAL reduction vs Budget
        </h3>
      </div>
      <p className="mb-4 text-xs text-text-tertiary">
        Sweep of allocation budgets from ₹0 to {formatINR(curve.max_budget_inr)}. Hover the chart for
        the per-budget split.
      </p>

      {option && <EChart option={option} height={260} />}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <button
          onClick={() => onBudgetSelect?.(curve.optimal_budget_inr)}
          className="rounded-md border border-accent-primary/40 bg-accent-primary/10 px-3 py-1.5 font-medium text-accent-primary transition hover:bg-accent-primary/20"
        >
          Optimal budget: {formatINR(curve.optimal_budget_inr)}
        </button>
        {topRosi && (
          <button
            onClick={() => onBudgetSelect?.(topRosi.budget_inr)}
            className="rounded-md border border-border-subtle px-3 py-1.5 text-text-secondary transition hover:border-status-medium/40 hover:text-status-medium"
          >
            Peak ROSI {topRosi.portfolio_rosi_percent.toFixed(1)}% @ {formatINR(topRosi.budget_inr)}
          </button>
        )}
        <span className="text-text-tertiary">Click a budget to pre-fill the optimizer.</span>
      </div>
    </div>
  )
}