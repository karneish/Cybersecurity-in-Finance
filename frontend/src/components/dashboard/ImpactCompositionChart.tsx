import { useEffect, useMemo, useState } from 'react'
import { Layers, Loader2 } from 'lucide-react'
import { riskApi } from '@/api/riskApi'
import EChart, { type EChartsCoreOption } from '@/components/charts/EChart'
import { useChartTokens } from '@/theme/chartTokens'
import type { EALResult } from '@/types/risk'

const COMPONENT_META: Record<string, { label: string; color: string }> = {
  downtime: { label: 'Downtime / Availability', color: '#818CF8' },
  breach: { label: 'Breach / Data Loss', color: '#F43F5E' },
  regulatory: { label: 'Regulatory Fines', color: '#FBBF24' },
  reputational: { label: 'Reputational Damage', color: '#34D399' },
}

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function ImpactCompositionChart() {
  const t = useChartTokens()
  const [eal, setEal] = useState<EALResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getEAL()
      .then((res) => setEal(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const breakdown = useMemo(() => {
    if (!eal) return []
    return Object.entries(eal.breakdown_by_impact_component ?? {})
      .filter(([key]) => COMPONENT_META[key])
      .sort((a, b) => b[1] - a[1])
  }, [eal])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aggregating impact components...
      </div>
    )
  }

  if (!eal || breakdown.length === 0) {
    return (
      <div className="cyber-card p-6 text-center text-sm text-text-tertiary">
        No impact-component breakdown available.
      </div>
    )
  }

  const option: EChartsCoreOption = {
    color: breakdown.map(([k]) => COMPONENT_META[k].color),
    tooltip: {
      trigger: 'axis',
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.tooltipText },
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: unknown) => `₹${Number(value).toLocaleString('en-IN')}`,
    },
    legend: { data: breakdown.map(([k]) => COMPONENT_META[k].label), top: 0 },
    grid: { left: 60, right: 20, top: 34, bottom: 30 },
    xAxis: { type: 'value', axisLabel: { fontSize: 11, color: t.axisLabel } },
    yAxis: {
      type: 'category',
      data: ['EAL by impact type'],
      axisLabel: { fontSize: 11, color: t.axisLabel },
    },
    series: breakdown.map(([key, value]) => ({
      name: COMPONENT_META[key].label,
      type: 'bar',
      stack: 'impact',
      data: [Math.round(value)],
      barWidth: 34,
      emphasis: { focus: 'series' },
      itemStyle: { borderRadius: 0 },
    })),
  }

  const top = breakdown[0]

  return (
    <div className="cyber-card p-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Layers className="h-4 w-4 text-accent-primary" />
        EAL Composition by Impact Type
      </h3>
      <p className="mb-4 text-xs text-text-tertiary">
        Expected Annual Loss split into downtime, breach, regulatory and reputational drivers
        (total {formatINR(eal.total_eal)}).
      </p>
      <EChart option={option} height={160} />
      <div className="mt-4 space-y-2">
        {breakdown.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-secondary">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: COMPONENT_META[key].color }}
              />
              {COMPONENT_META[key].label}
            </span>
            <span className="font-medium text-text-primary">{formatINR(value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-border-subtle pt-3 text-xs">
        <span className="text-text-tertiary">Largest driver: </span>
        <span className="font-semibold text-text-primary">
          {COMPONENT_META[top[0]].label} ({formatINR(top[1])})
        </span>
      </div>
    </div>
  )
}